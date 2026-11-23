import type { Me } from '../../src/lib/types';

const plan = { id: 2, name: 'Mensual', price_gs: 20000, price_label: 'Gs 20.000', duration_days: 30 };
const base: Me = { id: 48213, name: 'Juan Benítez', email: 'juan.benitez@gmail.com', phone: '+595981234567', role: 'user', subscription: { status: 'pending', plan: null, expires_at: null, days_left: null }, pending_request: null };
const req = { id: 128, plan_id: 2, amount_gs: 20000, created_at: '2026-11-22T20:00:00Z' };

export const mePending: Me = base;
export const meInReview: Me = { ...base, pending_request: req };
export const meActive: Me = { ...base, subscription: { status: 'active', plan, expires_at: '2026-12-10T15:00:00Z', days_left: 18 } };
export const meExpired: Me = { ...base, subscription: { status: 'expired', plan, expires_at: '2026-11-01T15:00:00Z', days_left: null } };
export const meExpiredInReview: Me = { ...meExpired, pending_request: req };
export const meSuspended: Me = { ...base, subscription: { status: 'suspended', plan: null, expires_at: null, days_left: null } };
