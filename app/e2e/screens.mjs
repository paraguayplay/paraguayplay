// Capturas de las 18 pantallas de las maquetas + recorrido básico.
// Uso: npm run build && node e2e/mock-server.mjs 4173 & node e2e/screens.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'out');
fs.mkdirSync(out, { recursive: true });
const BASE = process.env.BASE ?? 'http://127.0.0.1:4173';
const play = JSON.parse(fs.readFileSync(path.join(here, '../test/fixtures/play.json'), 'utf8'));
const PHONE = { width: 390, height: 844 };
const TV = { width: 1920, height: 1080 };

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };

async function setState(params) { await fetch(`${BASE}/api/__state?${new URLSearchParams(params)}`); }
async function me(state) { return (await (await fetch(`${BASE}/api/me`)).json()); }

async function open(browser, { viewport, tv = false, session = null, url }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await ctx.addInitScript(([s, tvMode]) => {
    localStorage.setItem('ppt.modo', tvMode ? 'tv' : 'celular');
    if (s) localStorage.setItem('ppt.session', JSON.stringify({ state: s, version: 0 }));
  }, [session, tv]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('  [error de página]', e.message));
  await page.goto(BASE + url);
  await page.waitForTimeout(700);
  return { ctx, page };
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(`  📸 ${name}`);
}

const browser = await chromium.launch();
const sess = async (state) => { await setState({ me: state }); return { token: 'T', sessionKey: play.session_key, me: await me() }; };

try {
  // ---------- Celular ----------
  await setState({ me: 'active', login409: '0' });
  let { ctx, page } = await open(browser, { viewport: PHONE, url: '/entrar' });
  await shot(page, 'cel-01-iniciar-sesion'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: PHONE, url: '/registro' }));
  await shot(page, 'cel-02-crear-cuenta'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: PHONE, url: '/recuperar' }));
  await page.getByLabel('Correo').fill('juan.benitez@gmail.com');
  await page.getByRole('button', { name: 'Enviar enlace' }).click();
  await page.waitForTimeout(400);
  await shot(page, 'cel-03-recuperar-contrasena'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: PHONE, session: await sess('pending'), url: '/planes' }));
  await shot(page, 'cel-04-planes'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: PHONE, session: await sess('review'), url: '/pagar/128' }));
  await shot(page, 'cel-05-pago'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: PHONE, session: await sess('review'), url: '/en-revision' }));
  await shot(page, 'cel-06-solicitud-en-revision'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: PHONE, session: await sess('active'), url: '/' }));
  await shot(page, 'cel-07-inicio'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: PHONE, session: await sess('active'), url: '/evento/1' }));
  await shot(page, 'cel-08-evento'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: { width: 844, height: 390 }, session: await sess('active'), url: '/ver/1' }));
  await page.waitForTimeout(1500);
  await shot(page, 'cel-09-reproductor');
  check(await page.getByText(/^ID 48213/).isVisible(), 'reproductor: marca de agua visible');
  await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: PHONE, session: await sess('active'), url: '/perfil' }));
  await shot(page, 'cel-10-mi-perfil'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: PHONE, session: await sess('active'), url: '/vincular?code=K7M4Q' }));
  await shot(page, 'cel-11-vincular-tv'); await ctx.close();

  await setState({ me: 'active', login409: '1' });
  ({ ctx, page } = await open(browser, { viewport: PHONE, url: '/entrar' }));
  await page.getByLabel('Correo').fill('juan.benitez@gmail.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('secreto123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForTimeout(500);
  await shot(page, 'cel-12-sesion-en-otro-dispositivo');
  await page.getByRole('button', { name: 'Usar en este celular' }).click();
  await page.waitForURL('**/');
  check(new URL(page.url()).pathname === '/', 'login con "Usar en este celular" entra al inicio');
  await ctx.close();
  await setState({ login409: '0' });

  // ---------- TV ----------
  ({ ctx, page } = await open(browser, { viewport: TV, tv: true, url: '/entrar' }));
  await shot(page, 'tv-01-iniciar-sesion-codigo-qr'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: TV, tv: true, session: await sess('active'), url: '/' }));
  await shot(page, 'tv-02-inicio');
  const first = await page.evaluate(() => document.activeElement?.textContent ?? '');
  check(/Ver en vivo/.test(first), `TV: el foco empieza en "Ver en vivo" (está en: ${first.trim().slice(0, 30)})`);
  for (const k of ['ArrowDown', 'ArrowDown', 'ArrowRight']) { await page.keyboard.press(k); await page.waitForTimeout(250); }
  await shot(page, 'tv-03-filas-con-foco');
  // volver con ▲ hasta "Ver en vivo", OK, y Atrás
  let focused = '';
  for (let i = 0; i < 6 && !/Ver en vivo/.test(focused); i++) { await page.keyboard.press('ArrowUp'); await page.waitForTimeout(150); focused = await page.evaluate(() => document.activeElement?.textContent ?? ''); }
  check(/Ver en vivo/.test(focused), 'TV: con ▲ se vuelve a "Ver en vivo"');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  check(new URL(page.url()).pathname === '/ver/1', 'TV: OK abre el reproductor');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  check(new URL(page.url()).pathname === '/', 'TV: Atrás vuelve al inicio');
  await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: TV, tv: true, session: await sess('active'), url: '/ver/1' }));
  await page.waitForTimeout(1500);
  await shot(page, 'tv-04-reproductor'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: TV, tv: true, session: await sess('expired'), url: '/planes' }));
  await shot(page, 'tv-05-planes-vencido'); await ctx.close();

  ({ ctx, page } = await open(browser, { viewport: TV, tv: true, session: await sess('active'), url: '/perfil' }));
  await shot(page, 'tv-06-mi-perfil'); await ctx.close();
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} verificaciones fallaron` : '\nTodo bien');
process.exit(failures ? 1 : 0);
