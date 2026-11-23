export const plans = [
  { id: 1, name: 'Semanal', price_gs: 5000, price_label: 'Gs 5.000', duration_days: 7 },
  { id: 2, name: 'Mensual', price_gs: 20000, price_label: 'Gs 20.000', duration_days: 30 },
  { id: 9, name: 'Anual', price_gs: 240000, price_label: 'Gs 240.000', duration_days: 365 },
];
export const settings = { bank_info: 'Banco: Banco Continental\nTitular: Paraguay Play TV\nCuenta: 1234-567890\n\nGracias por tu compra', support_whatsapp: '595981123456', help_text: 'Escribinos por WhatsApp.', apk_url: null };
export const createdRequest = (id: number, planId = 9) => ({
  request: { id, plan: plans.find((p) => p.id === planId), amount_gs: plans.find((p) => p.id === planId)!.price_gs, status: 'pending', note: null, resulting_expires_at: null, reviewed_at: null, created_at: '2026-11-23T00:00:00Z' },
  whatsapp_url: `https://wa.me/595981123456?text=Hola%20Solicitud%20N.%C2%BA%20${id}`,
});
