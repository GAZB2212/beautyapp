-- Local development data only (never run against the hosted project).
-- A published sample salon at /sarahs-hair, matching the app's built-in preview data.
insert into public.salons (id, slug, name, status, address_line1, city, postcode, phone, email)
values ('5a100000-0000-4000-8000-000000000001', 'sarahs-hair', 'Sarah’s Hair', 'active',
        '14 Market Street', 'Hoylake', 'CH47 2AE', '0151 555 0142', 'hello@sarahshair.example');

update public.salon_branding
   set tagline = 'Colour, cut and care in the heart of Hoylake',
       about = 'A calm, independent studio specialising in lived-in colour and effortless cuts. Every appointment begins with a consultation, and ends with hair you can style at home.',
       instagram = 'sarahshair'
 where salon_id = '5a100000-0000-4000-8000-000000000001';

update public.salon_settings set slot_interval_min = 30
 where salon_id = '5a100000-0000-4000-8000-000000000001';

insert into public.salon_hours (salon_id, weekday, opens_at, closes_at) values
  ('5a100000-0000-4000-8000-000000000001', 2, '09:00', '17:30'),
  ('5a100000-0000-4000-8000-000000000001', 3, '09:00', '17:30'),
  ('5a100000-0000-4000-8000-000000000001', 4, '10:00', '20:00'),
  ('5a100000-0000-4000-8000-000000000001', 5, '09:00', '18:00'),
  ('5a100000-0000-4000-8000-000000000001', 6, '08:30', '16:00');

insert into public.staff (id, salon_id, name, title, sort_order) values
  ('5a100000-0000-4000-8000-000000000201', '5a100000-0000-4000-8000-000000000001', 'Sarah Whitmore', 'Owner & Colour Director', 1),
  ('5a100000-0000-4000-8000-000000000202', '5a100000-0000-4000-8000-000000000001', 'Amelia Reyes', 'Senior Stylist', 2),
  ('5a100000-0000-4000-8000-000000000203', '5a100000-0000-4000-8000-000000000001', 'Freya Lindqvist', 'Stylist', 3);

insert into public.service_categories (id, salon_id, name, sort_order) values
  ('5a100000-0000-4000-8000-000000000101', '5a100000-0000-4000-8000-000000000001', 'Cut & Style', 1),
  ('5a100000-0000-4000-8000-000000000102', '5a100000-0000-4000-8000-000000000001', 'Colour', 2),
  ('5a100000-0000-4000-8000-000000000103', '5a100000-0000-4000-8000-000000000001', 'Treatments', 3);

insert into public.services (id, salon_id, category_id, name, description, duration_min, buffer_after_min, price_pence, price_is_from, sort_order) values
  ('5a100000-0000-4000-8000-000000000301', '5a100000-0000-4000-8000-000000000001', '5a100000-0000-4000-8000-000000000101', 'Cut & Blow Dry', 'Consultation, wash, precision cut and finish.', 60, 0, 4800, false, 1),
  ('5a100000-0000-4000-8000-000000000302', '5a100000-0000-4000-8000-000000000001', '5a100000-0000-4000-8000-000000000101', 'Restyle', 'A complete change of shape, with extra time to plan it.', 75, 0, 5800, false, 2),
  ('5a100000-0000-4000-8000-000000000303', '5a100000-0000-4000-8000-000000000001', '5a100000-0000-4000-8000-000000000101', 'Blow Dry', null, 40, 0, 2800, false, 3),
  ('5a100000-0000-4000-8000-000000000304', '5a100000-0000-4000-8000-000000000001', '5a100000-0000-4000-8000-000000000102', 'Balayage', 'Hand-painted, soft and low maintenance. Includes toner and finish.', 180, 15, 14500, true, 4),
  ('5a100000-0000-4000-8000-000000000305', '5a100000-0000-4000-8000-000000000001', '5a100000-0000-4000-8000-000000000102', 'Half Head Highlights', null, 120, 15, 8900, false, 5),
  ('5a100000-0000-4000-8000-000000000306', '5a100000-0000-4000-8000-000000000001', '5a100000-0000-4000-8000-000000000102', 'Root Colour', null, 90, 15, 5600, false, 6),
  ('5a100000-0000-4000-8000-000000000307', '5a100000-0000-4000-8000-000000000001', '5a100000-0000-4000-8000-000000000102', 'Gloss & Tone', 'Refresh shine and tone between colour appointments.', 45, 0, 3400, false, 7),
  ('5a100000-0000-4000-8000-000000000308', '5a100000-0000-4000-8000-000000000001', '5a100000-0000-4000-8000-000000000103', 'Bond Repair Ritual', 'Strengthening treatment with scalp massage.', 30, 0, 2500, false, 8);

-- Who offers what: Sarah does everything except treatments; Amelia everything except balayage; Freya the basics.
insert into public.staff_services (salon_id, staff_id, service_id)
select '5a100000-0000-4000-8000-000000000001', f.id, v.id
from public.staff f
join public.services v on v.salon_id = f.salon_id
where f.salon_id = '5a100000-0000-4000-8000-000000000001'
  and case f.name
        when 'Sarah Whitmore'  then v.name <> 'Bond Repair Ritual'
        when 'Amelia Reyes'    then v.name <> 'Balayage'
        when 'Freya Lindqvist' then v.name in ('Cut & Blow Dry', 'Blow Dry', 'Root Colour', 'Gloss & Tone', 'Bond Repair Ritual')
      end;
