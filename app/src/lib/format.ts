export const TZ = 'America/Asuncion';

export function formatGs(n: number): string {
  return 'Gs ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parts(iso: string, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('es-PY', { timeZone: TZ, ...opts }).formatToParts(new Date(iso))) out[p.type] = p.value;
  return out;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sáb 28 · 20:00" en hora de Paraguay. */
export function formatEventTime(iso: string): string {
  const p = parts(iso, { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${cap(p.weekday.replace('.', ''))} ${p.day} · ${p.hour}:${p.minute}`;
}

/** "20:00" en hora de Paraguay. */
export function formatHour(iso: string): string {
  const p = parts(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.hour}:${p.minute}`;
}

/** "10 de diciembre". */
export function formatDate(iso: string): string {
  const p = parts(iso, { day: 'numeric', month: 'long' });
  return `${p.day} de ${p.month}`;
}

/** Clave de día (AAAA-MM-DD) en hora de Paraguay, para agrupar la agenda. */
export function dayKey(iso: string): string {
  const p = parts(iso, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}

/** "Sábado 28 de noviembre". */
export function formatDayTitle(iso: string): string {
  const p = parts(iso, { weekday: 'long', day: 'numeric', month: 'long' });
  return `${cap(p.weekday)} ${p.day} de ${p.month}`;
}
