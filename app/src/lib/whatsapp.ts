import { formatGs } from './format';

const LAST = 'ppt.lastRequest';

/** Guarda el enlace que devolvió el servidor al crear la solicitud (solo en esta pestaña). */
type Remembered = { id: number; whatsapp_url: string | null; planName: string; amountGs: number };

export function rememberRequest(r: Remembered) {
  sessionStorage.setItem(LAST, JSON.stringify(r));
}

export function remembered(id: number): Remembered | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(LAST) ?? 'null');
    return v && v.id === id ? v : null;
  } catch { return null; }
}

/** Mismo texto que PlanRequestController::whatsappUrl del backend. */
export function buildWhatsappUrl(phone: string | null | undefined, d: { name: string; email: string; planName: string; amountGs: number; requestId: number }): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const msg = [
    'Hola, envío el comprobante de pago de PARAGUAY PLAY TV.',
    `Nombre: ${d.name}`,
    `Correo: ${d.email}`,
    `Plan: ${d.planName} (${formatGs(d.amountGs)})`,
    `Solicitud N.º ${d.requestId}`,
  ].join('\n');
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export function supportUrl(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}
