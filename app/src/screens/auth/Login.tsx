import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';
import { deviceName } from '../../lib/device';
import { destinationFor } from '../../lib/destination';
import type { AuthResponse } from '../../lib/types';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Glass } from '../../ui/Glass';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Layout';
import { EndedNotice } from './EndedNotice';
import { OtherDeviceDialog } from './OtherDeviceDialog';

export function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const signIn = useSession((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [other, setOther] = useState<string | null>(null);

  async function submit(force = false) {
    setBusy(true);
    setError(null);
    try {
      const r = await api<AuthResponse>('/auth/login', { method: 'POST', auth: false, body: { email: email.trim(), password, device_name: deviceName(), ...(force ? { force: true } : {}) } });
      signIn(r);
      const next = new URLSearchParams(loc.search).get('next');
      nav(next && next.startsWith('/') ? next : destinationFor(r.user), { replace: true });
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'other_device_active') setOther(err.data?.device ?? 'otro dispositivo');
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: FormEvent) => { e.preventDefault(); submit(); };

  return (
    <Screen id="entrar">
      <EndedNotice />
      <div className="auth">
        <div className="hero-logo">
          <div className="halo"><img src="/logo.png" alt="" /></div>
          <h1 className="brand">PARAGUAY PLAY <b>TV</b></h1>
          <p>Eventos en vivo, donde estés</p>
        </div>
        <Glass style={{ padding: 22 }}>
          <form onSubmit={onSubmit}>
            <div className="stack">
              <Field label="Correo" icon="mail" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Field
                label="Contraseña" icon="lock" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required
                trailing={<button type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow(!show)} style={{ display: 'grid' }}><Icon name="eye" className="" style={{ width: 20, height: 20, stroke: 'var(--t3)', fill: 'none', strokeWidth: 1.8 }} /></button>}
              />
            </div>
            <div style={{ textAlign: 'right', margin: '14px 2px 18px' }}><Link className="link" to="/recuperar">¿Olvidaste tu contraseña?</Link></div>
            {error && <p className="err" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
            <Button type="submit" loading={busy && !other}>Iniciar sesión</Button>
          </form>
        </Glass>
        <div className="or">¿Primera vez?</div>
        <Button variant="secondary" onClick={() => nav('/registro' + loc.search)}>Crear cuenta</Button>
      </div>
      {other && <OtherDeviceDialog device={other} busy={busy} onConfirm={() => submit(true)} onCancel={() => setOther(null)} />}
    </Screen>
  );
}
