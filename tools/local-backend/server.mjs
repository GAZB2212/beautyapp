// Local stand-in for the parts of the Supabase HTTP API the apps use, so the real SQL
// (migrations, access rules, server functions) can be exercised from a browser without
// Docker. It mimics, loosely: GoTrue email+password auth, PostgREST table access and RPC.
//
//   PGHOST=/tmp PGPORT=5499 PGUSER=postgres PGDATABASE=salon_dev node server.mjs
//
// Development and test use only. Tokens are unsigned and passwords are kept in memory.
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const PORT = Number(process.env.PORT ?? 54321);
const pool = new pg.Pool({ max: 5 });
const passwords = new Map(); // email -> password
const outbox = []; // { to, type, link }
const refreshTokens = new Map(); // token -> user id

const IDENT = /^[a-z_][a-z0-9_]*$/;
const ident = (s) => {
  if (!IDENT.test(s)) throw httpError(400, `bad identifier: ${s}`);
  return `"${s}"`;
};
const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, extra });
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function makeSession(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600 };
  const refresh = randomUUID();
  refreshTokens.set(refresh, user.id);
  return {
    access_token: `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.local`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: refresh,
    user: publicUser(user),
  };
}
const publicUser = (u) => ({
  id: u.id,
  aud: 'authenticated',
  role: 'authenticated',
  email: u.email,
  email_confirmed_at: u.email_confirmed_at,
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: new Date().toISOString(),
});

function claimsFrom(req) {
  const auth = req.headers.authorization ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      if (payload.sub && payload.exp * 1000 > Date.now()) return payload;
    } catch {}
  }
  return null;
}

/** Run fn inside a transaction as the API role the request is entitled to. */
async function asRequest(req, fn) {
  const claims = claimsFrom(req);
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query(`set local role ${claims ? 'authenticated' : 'anon'}`);
    await client.query(`select set_config('request.jwt.claims', $1, true)`, [claims ? JSON.stringify(claims) : '']);
    const out = await fn(client);
    await client.query('commit');
    return out;
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------- auth
async function findUser(email) {
  const r = await pool.query('select id, email, email_confirmed_at from auth.users where lower(email) = lower($1)', [email]);
  return r.rows[0];
}

async function auth(req, res, url, body) {
  const path = url.pathname.replace('/auth/v1', '');
  const origin = `http://localhost:${PORT}`;

  if (path === '/signup' && req.method === 'POST') {
    const { email, password } = body;
    if (!email || !password || password.length < 8) throw httpError(422, 'Password should be at least 8 characters', { error_code: 'weak_password' });
    let user = await findUser(email);
    if (!user) {
      const r = await pool.query(
        'insert into auth.users (email, email_confirmed_at) values (lower($1), null) returning id, email, email_confirmed_at',
        [email],
      );
      user = r.rows[0];
      passwords.set(user.email, password);
      const redirect = url.searchParams.get('redirect_to') ?? body.options?.emailRedirectTo ?? '';
      outbox.push({ to: user.email, type: 'signup', link: `${origin}/auth/v1/verify?type=signup&user=${user.id}&redirect_to=${encodeURIComponent(redirect)}` });
    }
    return json(res, 200, publicUser(user)); // like hosted Supabase with confirmation on: no session yet
  }

  if (path === '/verify' && req.method === 'GET') {
    const id = url.searchParams.get('user');
    const type = url.searchParams.get('type');
    const r = await pool.query('update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where id = $1 returning id, email, email_confirmed_at', [id]);
    if (!r.rows[0]) throw httpError(400, 'invalid link');
    const s = makeSession(r.rows[0]);
    const hash = new URLSearchParams({ access_token: s.access_token, refresh_token: s.refresh_token, expires_in: '3600', expires_at: String(s.expires_at), token_type: 'bearer', type });
    res.writeHead(303, { location: `${url.searchParams.get('redirect_to')}#${hash}` });
    return res.end();
  }

  if (path === '/token' && req.method === 'POST') {
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      const user = await findUser(body.email ?? '');
      if (!user || passwords.get(user.email) !== body.password) throw httpError(400, 'Invalid login credentials', { error_code: 'invalid_credentials' });
      if (!user.email_confirmed_at) throw httpError(400, 'Email not confirmed', { error_code: 'email_not_confirmed' });
      return json(res, 200, makeSession(user));
    }
    if (grant === 'refresh_token') {
      const id = refreshTokens.get(body.refresh_token);
      const r = id && (await pool.query('select id, email, email_confirmed_at from auth.users where id = $1', [id]));
      if (!r?.rows[0]) throw httpError(400, 'Invalid Refresh Token', { error_code: 'refresh_token_not_found' });
      refreshTokens.delete(body.refresh_token);
      return json(res, 200, makeSession(r.rows[0]));
    }
  }

  if (path === '/user') {
    const claims = claimsFrom(req);
    if (!claims) throw httpError(401, 'invalid JWT', { error_code: 'bad_jwt' });
    const r = await pool.query('select id, email, email_confirmed_at from auth.users where id = $1', [claims.sub]);
    if (!r.rows[0]) throw httpError(401, 'user not found', { error_code: 'user_not_found' });
    if (req.method === 'PUT' && body.password) {
      if (body.password.length < 8) throw httpError(422, 'Password should be at least 8 characters', { error_code: 'weak_password' });
      passwords.set(r.rows[0].email, body.password);
    }
    return json(res, 200, publicUser(r.rows[0]));
  }

  if (path === '/recover' && req.method === 'POST') {
    const user = await findUser(body.email ?? '');
    const redirect = url.searchParams.get('redirect_to') ?? '';
    if (user) outbox.push({ to: user.email, type: 'recovery', link: `${origin}/auth/v1/verify?type=recovery&user=${user.id}&redirect_to=${encodeURIComponent(redirect)}` });
    return json(res, 200, {});
  }

  if (path === '/logout') {
    res.writeHead(204, cors(req));
    return res.end();
  }
  throw httpError(404, `auth route not implemented: ${req.method} ${path}`);
}

// ---------------------------------------------------------------- rest
function whereClause(params, values) {
  const parts = [];
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(key)) continue;
    const m = /^(eq|neq|gt|gte|lt|lte|in|is)\.(.*)$/s.exec(raw);
    if (!m) throw httpError(400, `unsupported filter: ${key}=${raw}`);
    const [, op, value] = m;
    const col = ident(key);
    if (op === 'in') {
      values.push(value.replace(/^\(|\)$/g, '').split(',').map((v) => v.replace(/^"|"$/g, '')));
      parts.push(`${col}::text = any($${values.length}::text[])`);
    } else if (op === 'is') {
      if (!['null', 'true', 'false'].includes(value)) throw httpError(400, 'bad is filter');
      parts.push(`${col} is ${value}`);
    } else {
      values.push(value);
      parts.push(`${col} ${{ eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' }[op]} $${values.length}`);
    }
  }
  return parts.length ? ` where ${parts.join(' and ')}` : '';
}

const selectList = (sel) => (!sel || sel === '*' ? '*' : sel.split(',').map((c) => ident(c.trim())).join(', '));

async function rest(req, res, url, body) {
  const path = url.pathname.replace('/rest/v1/', '');
  const prefer = req.headers.prefer ?? '';
  const wantsObject = (req.headers.accept ?? '').includes('vnd.pgrst.object');

  // RPC
  if (path.startsWith('rpc/')) {
    const fn = path.slice(4);
    const meta = await pool.query(`select proretset, prorettype::regtype::text as ret from pg_proc where pronamespace = 'public'::regnamespace and proname = $1`, [fn]);
    if (!meta.rows[0]) throw httpError(404, `function ${fn} not found`, { code: 'PGRST202' });
    const args = body ?? {};
    const names = Object.keys(args);
    const call = `public.${ident(fn)}(${names.map((n, i) => `${ident(n)} => $${i + 1}`).join(', ')})`;
    const sql = meta.rows[0].proretset ? `select coalesce(json_agg(t), '[]'::json) as r from ${call} t` : `select to_json(${call}) as r`;
    const out = await asRequest(req, (c) => c.query(sql, names.map((n) => args[n])));
    return json(res, 200, out.rows[0].r);
  }

  const table = `public.${ident(path)}`;
  const sel = url.searchParams.get('select');

  if (req.method === 'GET') {
    const values = [];
    let sql = `select ${selectList(sel)} from ${table}${whereClause(url.searchParams, values)}`;
    const order = url.searchParams.get('order');
    if (order) sql += ` order by ${order.split(',').map((o) => { const [c, d] = o.split('.'); return `${ident(c)} ${d === 'desc' ? 'desc' : 'asc'}`; }).join(', ')}`;
    const limit = url.searchParams.get('limit');
    if (limit) sql += ` limit ${Number(limit) | 0}`;
    const out = await asRequest(req, (c) => c.query(sql, values));
    if (wantsObject) {
      if (out.rows.length !== 1) throw httpError(406, 'JSON object requested, multiple (or no) rows returned', { code: 'PGRST116' });
      return json(res, 200, out.rows[0]);
    }
    return json(res, 200, out.rows);
  }

  const returning = prefer.includes('return=representation') ? ` returning ${selectList(sel)}` : '';

  if (req.method === 'POST') {
    const rows = Array.isArray(body) ? body : [body];
    const cols = Object.keys(rows[0] ?? {}).map(ident).join(', ');
    const sql = `insert into ${table} (${cols}) select ${cols} from json_populate_recordset(null::${table}, $1)${returning}`;
    const out = await asRequest(req, (c) => c.query(sql, [JSON.stringify(rows)]));
    return json(res, 201, returning ? (wantsObject ? out.rows[0] : out.rows) : null);
  }

  if (req.method === 'PATCH') {
    const cols = Object.keys(body ?? {}).map(ident).join(', ');
    const values = [JSON.stringify(body)];
    const sql = `update ${table} set (${cols}) = (select ${cols} from json_populate_record(null::${table}, $1))${whereClause(url.searchParams, values)}${returning}`;
    const out = await asRequest(req, (c) => c.query(sql, values));
    return json(res, returning ? 200 : 204, returning ? (wantsObject ? out.rows[0] : out.rows) : null);
  }

  if (req.method === 'DELETE') {
    const values = [];
    const where = whereClause(url.searchParams, values);
    if (!where) throw httpError(400, 'refusing to delete without a filter');
    const out = await asRequest(req, (c) => c.query(`delete from ${table}${where}${returning}`, values));
    return json(res, returning ? 200 : 204, returning ? out.rows : null);
  }
  throw httpError(405, 'method not allowed');
}

// ---------------------------------------------------------------- plumbing
const cors = (req) => ({
  'access-control-allow-origin': req.headers.origin ?? '*',
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers': req.headers['access-control-request-headers'] ?? '*',
  'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
  'access-control-expose-headers': 'content-range',
});
function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json', ...res.corsHeaders });
  res.end(payload === null || payload === undefined ? '' : JSON.stringify(payload));
}

http
  .createServer(async (req, res) => {
    res.corsHeaders = cors(req);
    if (req.method === 'OPTIONS') {
      res.writeHead(204, res.corsHeaders);
      return res.end();
    }
    const url = new URL(req.url, `http://localhost:${PORT}`);
    try {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = raw ? JSON.parse(raw) : {};
      if (url.pathname.startsWith('/auth/v1/')) return await auth(req, res, url, body);
      if (url.pathname.startsWith('/rest/v1/')) return await rest(req, res, url, body);
      if (url.pathname === '/dev/outbox') return json(res, 200, outbox); // test helper: "emails" that would have been sent
      throw httpError(404, 'not found');
    } catch (e) {
      if (e.status) return json(res, e.status, { message: e.message, msg: e.message, ...e.extra });
      // Postgres error -> PostgREST-style error
      const status = e.code === '42501' ? (claimsFrom(req) ? 403 : 401) : e.code?.startsWith('23') ? 409 : 400;
      return json(res, status, { code: e.code ?? 'XX000', message: e.message, details: e.detail ?? null, hint: e.hint ?? null });
    }
  })
  .listen(PORT, () => console.log(`local backend on http://localhost:${PORT}`));
