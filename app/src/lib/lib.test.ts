import { api, ApiError, NETWORK_MSG, TOO_MANY_MSG } from './api';
import { useSession } from './session';
import { deviceName } from './device';
import { formatGs, formatEventTime, formatDate } from './format';
import { mockApi } from '../../test/http';

const me = { id: 1, name: 'Juan', email: 'j@x.com', phone: '1', role: 'user', subscription: { status: 'pending', plan: null, expires_at: null, days_left: null }, pending_request: null };

beforeEach(() => { localStorage.clear(); useSession.getState().signOut(); useSession.setState({ endedReason: null }); });

describe('api', () => {
  test('agrega el token Bearer', async () => {
    const m = mockApi([{ path: '/api/me', body: me }]);
    useSession.getState().signIn({ token: 'T1', session_key: 'K', user: me as any });
    await api('/me');
    expect(m.calls[0].headers.authorization).toBe('Bearer T1');
    expect(m.calls[0].headers.accept).toBe('application/json');
  });
  test('422 trae el mensaje del servidor', async () => {
    mockApi([{ method: 'POST', path: '/api/auth/login', status: 422, body: { code: 'invalid_credentials', message: 'Correo o contraseña incorrectos.' } }]);
    const e = await api('/auth/login', { method: 'POST', body: {} }).catch((x: any) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(422);
    expect(e.code).toBe('invalid_credentials');
    expect(e.message).toBe('Correo o contraseña incorrectos.');
  });
  test('429 sin cuerpo da el texto de demasiados intentos', async () => {
    mockApi([{ method: 'POST', path: '/api/auth/login', status: 429 }]);
    const e = await api('/auth/login', { method: 'POST', body: {} }).catch((x: any) => x);
    expect(e.message).toBe(TOO_MANY_MSG);
    expect(TOO_MANY_MSG).toBe('Demasiados intentos. Esperá un minuto e intentá de nuevo.');
  });
  test('401 con sesión la cierra por otro dispositivo', async () => {
    mockApi([{ path: '/api/me', status: 401, body: { message: 'Unauthenticated.' } }]);
    useSession.getState().signIn({ token: 'T1', session_key: 'K', user: me as any });
    await api('/me').catch(() => {});
    expect(useSession.getState().token).toBeNull();
    expect(useSession.getState().endedReason).toBe('other_device');
  });
  test('fallo de red da el texto de red', async () => {
    mockApi([{ path: '/api/plans', networkError: true }]);
    const e = await api('/plans').catch((x: any) => x);
    expect(e.message).toBe(NETWORK_MSG);
    expect(NETWORK_MSG).toBe('No pudimos conectar. Revisá tu internet e intentá de nuevo.');
  });
  test('204 devuelve undefined', async () => {
    mockApi([{ method: 'POST', path: '/api/auth/logout', status: 204 }]);
    expect(await api('/auth/logout', { method: 'POST' })).toBeUndefined();
  });
});

describe('sesión', () => {
  test('signOut borra la caché del catálogo', () => {
    localStorage.setItem('ppt.catalog', '{}');
    useSession.getState().signIn({ token: 'T', session_key: 'K', user: me as any });
    useSession.getState().signOut();
    expect(localStorage.getItem('ppt.catalog')).toBeNull();
    expect(useSession.getState().token).toBeNull();
  });
  test('se guarda en localStorage', () => {
    useSession.getState().signIn({ token: 'T', session_key: 'K', user: me as any });
    expect(JSON.parse(localStorage.getItem('ppt.session')!).state.token).toBe('T');
  });
});

describe('deviceName', () => {
  test.each([
    ['Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) 76.0.3809.146/6.0 TV Safari/537.36', 'Smart TV · Samsung'],
    ['Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 WebAppManager', 'Smart TV · LG'],
    ['Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7633) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36', 'Fire TV'],
    ['Mozilla/5.0 (Linux; Android 12; BRAVIA 4K VH2 Build/STT1.211025.001; wv) AppleWebKit/537.36 Chrome/120 Safari/537.36 TV', 'Android TV'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1', 'iPhone · Safari'],
    ['Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36', 'Android · Chrome'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Computadora · Chrome'],
  ])('%#', (ua, name) => expect(deviceName(ua)).toBe(name));
});

describe('formatos', () => {
  test('guaraníes', () => {
    expect(formatGs(240000)).toBe('Gs 240.000');
    expect(formatGs(5000)).toBe('Gs 5.000');
  });
  test('hora del evento en Paraguay aunque el equipo esté en UTC', () => {
    expect(process.env.TZ).toBe('UTC');
    expect(formatEventTime('2026-11-28T23:00:00Z')).toBe('Sáb 28 · 20:00');
  });
  test('fecha larga', () => {
    expect(formatDate('2026-12-10T15:00:00Z')).toBe('10 de diciembre');
  });
});
