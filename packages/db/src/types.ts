// Hand-written until `pnpm db:types` can run against a live database (it will then
// overwrite this file with the full generated schema). Covers what the apps call today.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type MemberRole = 'staff' | 'manager' | 'owner';
export type SalonStatus = 'onboarding' | 'active' | 'suspended';

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type SalonRow = {
  id: string;
  slug: string;
  name: string;
  status: SalonStatus;
  timezone: string;
  currency: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  stripe_charges_enabled: boolean;
  stripe_details_submitted: boolean;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SalonMemberRow = {
  id: string;
  salon_id: string;
  user_id: string | null;
  role: MemberRole;
  invited_email: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type SalonHoursRow = { id: string; salon_id: string; weekday: number; opens_at: string; closes_at: string };

export type StaffRow = {
  id: string;
  salon_id: string;
  user_id: string | null;
  name: string;
  title: string | null;
  bio: string | null;
  avatar_path: string | null;
  colour: string;
  is_bookable: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ServiceRow = {
  id: string;
  salon_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  duration_min: number;
  buffer_after_min: number;
  price_pence: number;
  price_is_from: boolean;
  image_path: string | null;
  deposit_override_pence: number | null;
  online_bookable: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StaffServiceRow = {
  salon_id: string;
  staff_id: string;
  service_id: string;
  price_override_pence: number | null;
  duration_override_min: number | null;
};

export type Database = {
  public: {
    Tables: {
      salons: Table<SalonRow, never, Partial<Pick<SalonRow, 'name' | 'timezone' | 'address_line1' | 'address_line2' | 'city' | 'postcode' | 'country' | 'phone' | 'email'>>>;
      salon_members: Table<SalonMemberRow, Pick<SalonMemberRow, 'salon_id' | 'role' | 'invited_email'>, Pick<SalonMemberRow, 'role'>>;
      salon_hours: Table<SalonHoursRow, Omit<SalonHoursRow, 'id'>, Partial<Omit<SalonHoursRow, 'id' | 'salon_id'>>>;
      staff: Table<
        StaffRow,
        Pick<StaffRow, 'salon_id' | 'name'> & Partial<Pick<StaffRow, 'title' | 'bio' | 'avatar_path' | 'colour' | 'is_bookable' | 'active' | 'sort_order'>>,
        Partial<Pick<StaffRow, 'name' | 'title' | 'bio' | 'avatar_path' | 'colour' | 'is_bookable' | 'active' | 'sort_order'>>
      >;
      services: Table<
        ServiceRow,
        Pick<ServiceRow, 'salon_id' | 'name' | 'duration_min' | 'price_pence'> &
          Partial<Pick<ServiceRow, 'category_id' | 'description' | 'buffer_after_min' | 'price_is_from' | 'image_path' | 'deposit_override_pence' | 'online_bookable' | 'active' | 'sort_order'>>,
        Partial<Omit<ServiceRow, 'id' | 'salon_id' | 'created_at' | 'updated_at'>>
      >;
      staff_services: Table<
        StaffServiceRow,
        Pick<StaffServiceRow, 'salon_id' | 'staff_id' | 'service_id'> & Partial<Pick<StaffServiceRow, 'price_override_pence' | 'duration_override_min'>>,
        Partial<Pick<StaffServiceRow, 'price_override_pence' | 'duration_override_min'>>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      get_storefront: { Args: { p_slug: string }; Returns: Json };
      get_availability: {
        Args: { p_slug: string; p_service_id: string; p_from: string; p_days?: number; p_staff_id?: string | null };
        Returns: { staff_id: string; starts_at: string }[];
      };
      book_appointment: {
        Args: {
          p_slug: string;
          p_service_id: string;
          p_staff_id: string;
          p_starts_at: string;
          p_first_name: string;
          p_last_name: string;
          p_email: string;
          p_phone?: string | null;
          p_note?: string | null;
          p_marketing_opt_in?: boolean;
        };
        Returns: Json;
      };
      slug_status: { Args: { p_slug: string }; Returns: 'available' | 'taken' | 'invalid' };
      create_salon: { Args: { p_name: string; p_slug: string }; Returns: Json };
      accept_invites: { Args: Record<string, never>; Returns: number };
      set_salon_published: { Args: { p_salon_id: string; p_published: boolean }; Returns: SalonStatus };
    };
    Enums: { member_role: MemberRole; salon_status: SalonStatus };
    CompositeTypes: Record<string, never>;
  };
};
