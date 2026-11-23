// Servidor de prueba: sirve dist/ y responde /api con datos fijos. Uso: node e2e/mock-server.mjs [puerto]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const play = JSON.parse(fs.readFileSync(path.join(root, 'test/fixtures/play.json'), 'utf8'));
const PORT = Number(process.argv[2] ?? 4173);

const now = Date.now();
const iso = (mins) => new Date(now + mins * 60000).toISOString();
const plan = { id: 2, name: 'Mensual', price_gs: 20000, price_label: 'Gs 20.000', duration_days: 30 };
const base = { id: 48213, name: 'Juan Benítez', email: 'juan.benitez@gmail.com', phone: '+595981234567', role: 'user', pending_request: null };
const req = { id: 128, plan_id: 2, amount_gs: 20000, created_at: iso(-30) };
const MES = {
  pending: { ...base, subscription: { status: 'pending', plan: null, expires_at: null, days_left: null } },
  review: { ...base, subscription: { status: 'pending', plan: null, expires_at: null, days_left: null }, pending_request: req },
  active: { ...base, subscription: { status: 'active', plan, expires_at: '2026-12-10T15:00:00Z', days_left: 18 } },
  expired: { ...base, subscription: { status: 'expired', plan, expires_at: iso(-60 * 24 * 3), days_left: null } },
  suspended: { ...base, subscription: { status: 'suspended', plan: null, expires_at: null, days_left: null } },
};
const ev = (id, title, category, startMin, extra = {}) => ({ id, title, category, description: null, image_url: null, starts_at: iso(startMin), ends_at: null, is_featured: false, is_live: false, link_count: 3, ...extra });
const live = [
  ev(1, 'Final Copa Interbarrios 2026', 'Deportes', -40, { is_live: true, is_featured: true, description: 'Los dos mejores equipos del torneo se enfrentan por el título.' }),
  ev(2, 'Festival de Polca y Guarania', 'Música', -90, { is_live: true }),
  ev(3, 'Culto de Domingo', 'Religiosos', -20, { is_live: true }),
  ev(6, 'Conferencia Tech Asunción', 'Conferencias', -10, { is_live: true }),
  ev(7, 'Clásico de Futsal', 'Deportes', -5, { is_live: true }),
];
const upcoming = [ev(4, 'Noche de Rock Paraguayo', 'Música', 60 * 24 * 5), ev(5, 'Clásico de Futsal', 'Deportes', 60 * 24 * 6), ev(8, 'Charla: Emprender en PY', 'Conferencias', 60 * 24 * 7), ev(9, 'Vigilia de Caacupé', 'Religiosos', 60 * 24 * 8)];
const catalog = { live, upcoming, categories: ['Deportes', 'Música', 'Religiosos', 'Conferencias'].map((name) => ({ name, events: [...live, ...upcoming].filter((e) => e.category === name) })) };
const plans = [{ id: 1, name: 'Semanal', price_gs: 5000, price_label: 'Gs 5.000', duration_days: 7 }, plan, { id: 9, name: 'Anual', price_gs: 240000, price_label: 'Gs 240.000', duration_days: 365 }];
const settings = { bank_info: 'Banco: Banco Continental\nTitular: Paraguay Play TV\nCuenta: 1234-567890\nRUC / CI: 4.567.890-1\nAlias: 0981234567', support_whatsapp: '595981123456', help_text: 'Escribinos por WhatsApp de 8 a 22 h.', apk_url: null };

const state = { me: 'active', login409: false, tvPolls: 0 };

function api(req, res, url) {
  const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
  const p = url.pathname.replace(/^\/api/, '');
  const M = req.method;
  if (p === '/__state') { Object.assign(state, Object.fromEntries(url.searchParams)); state.login409 = url.searchParams.get('login409') === '1'; return send(200, state); }
  if (M === 'POST' && p === '/auth/login') {
    let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
      const b = JSON.parse(body || '{}');
      if (state.login409 && !b.force) return send(409, { code: 'other_device_active', message: 'Tu cuenta está abierta en otro dispositivo (Smart TV · Living).', device: 'Smart TV · Living' });
      send(200, { token: 'T', session_key: play.session_key, user: MES[state.me] });
    }); return;
  }
  if (M === 'POST' && p === '/auth/register') return send(201, { token: 'T', session_key: play.session_key, user: MES.pending });
  if (M === 'POST' && p === '/auth/forgot-password') return send(200, { message: 'Si el correo está registrado, te enviamos un enlace.' });
  if (M === 'POST' && p === '/auth/logout') return send(204);
  if (M === 'POST' && p === '/auth/tv-code') return send(201, { code: 'K7M4QZ', qr_url: 'https://paraguayplaytv.com/vincular?code=K7M4QZ', expires_at: iso(10) });
  if (M === 'GET' && p.startsWith('/auth/tv-code/')) return send(200, { status: 'waiting' });
  if (M === 'POST' && /\/auth\/tv-code\/\w+\/confirm/.test(p)) return send(200, { message: 'Listo. Tu TV ya está conectado. Esta sesión del celular se cerró.' });
  if (p === '/me') return send(200, MES[state.me]);
  if (p === '/plans') return send(200, plans);
  if (p === '/settings/public') return send(200, settings);
  if (M === 'GET' && p === '/plan-requests') return send(200, [{ id: 128, plan, amount_gs: 20000, status: 'pending', note: null, resulting_expires_at: null, reviewed_at: null, created_at: iso(-30) }]);
  if (M === 'POST' && p === '/plan-requests') return send(201, { request: { id: 128, plan, amount_gs: 20000, status: 'pending', note: null, resulting_expires_at: null, reviewed_at: null, created_at: iso(0) }, whatsapp_url: 'https://wa.me/595981123456?text=Hola' });
  if (p === '/catalog') return state.me === 'active' ? send(200, catalog) : send(403, { code: 'subscription_inactive', message: 'Tu suscripción no está activa.' });
  if (/^\/events\/\d+\/play$/.test(p)) return send(200, { event: { id: 1, title: 'Final Copa Interbarrios 2026' }, payload: play.payload, iv: play.iv });
  send(404, { message: 'No encontrado' });
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  let f = path.join(dist, decodeURIComponent(url.pathname));
  if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log(`mock en http://127.0.0.1:${PORT}`));
