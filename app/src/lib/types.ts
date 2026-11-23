// Mismas formas que los Resources del backend (backend/app/Http/Resources).
export type SubStatus = 'pending' | 'active' | 'expired' | 'suspended';

export type Plan = { id: number; name: string; price_gs: number; price_label?: string; duration_days: number; is_active?: boolean; sort_order?: number };

export type Me = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  subscription: { status: SubStatus; plan: Plan | null; expires_at: string | null; days_left: number | null };
  pending_request: { id: number; plan_id: number; amount_gs: number; created_at: string } | null;
};

export type PlanRequest = {
  id: number;
  plan: Plan;
  amount_gs: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  note: string | null;
  resulting_expires_at: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type CatalogEvent = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  starts_at: string;
  ends_at: string | null;
  is_featured: boolean;
  is_live: boolean;
  link_count: number;
};

export type Catalog = { live: CatalogEvent[]; upcoming: CatalogEvent[]; categories: { name: string; events: CatalogEvent[] }[] };

export type AuthResponse = { token: string; session_key: string; user: Me };

export type PublicSettings = { bank_info: string | null; support_whatsapp: string | null; help_text: string | null; apk_url: string | null };
