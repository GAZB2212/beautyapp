// Hand-written until `pnpm db:types` can run against a live database (it will then
// overwrite this file with the full generated schema).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      get_storefront: {
        Args: { p_slug: string };
        Returns: Json;
      };
      get_availability: {
        Args: { p_slug: string; p_service_id: string; p_from: string; p_days?: number; p_staff_id?: string | null };
        Returns: { staff_id: string; starts_at: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
