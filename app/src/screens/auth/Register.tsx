import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';
import { deviceName } from '../../lib/device';
import { destinationFor } from '../../lib/destination';
import type { AuthResponse } from '../../lib/types';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Icon } from '../../ui/Icon';
import { BackBar, Screen } from '../../ui/Layout';

export function Register() {
  const nav = useNavigate();
  const signIn = useSession((s) => s.signIn);
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setFieldErr({});
    try {
      const r = await api<AuthResponse>('/auth/register', { method: 'POST', auth: false, body: { ...f, name: f.name.trim(), email: f.email.trim(), password_confirmation: f.password, device_name: deviceName() } });
      signIn(r);
      nav(destinationFor(r.user), { replace: true });
    } catch (x) {
      const err = x as ApiError;
      const errs = err.data?.errors as Record<string, string[]> | undefined;
      if (errs) setFieldErr(Object.fromEntries(Object.entries(errs).map(([k, v]) => [k, v[0]])));
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <Screen id="registro">
      <BackBar title={<img src="/logo.png" alt="" style={{ width: 34 }} />} to="/entrar" />
      <form className="auth" onSubmit={onSubmit}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: '22px 0 6px' }}>Crear cuenta</h1>
        <p className="mut" style={{ fontSize: 15, marginBottom: 20 }}>Registrate y elegí tu plan para empezar a ver.</p>
        <div className="stack">
          <Field label="Nombre y apellido" icon="user" autoComplete="name" value={f.name} onChange={set('name')} error={fieldErr.name} required />
          <Field label="Correo" icon="mail" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={fieldErr.email} required />
          <Field label="Teléfono / WhatsApp" icon="phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} error={fieldErr.phone} placeholder="+595 981 234 567" required />
          <Field label="Contraseña" icon="lock" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} error={fieldErr.password} placeholder="Mínimo 8 caracteres" minLength={8} required />
        </div>
        <label className="row small mut" style={{ gap: 10, margin: '18px 2px 20px', cursor: 'pointer' }}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: 1 }} />
          <span style={{ width: 22, height: 22, borderRadius: 7, flex: 'none', display: 'grid', placeItems: 'center', background: terms ? 'var(--o)' : 'transparent', border: terms ? 'none' : '2px solid var(--t3)' }}>
            {terms && <Icon name="check" style={{ width: 15, height: 15, color: '#fff', strokeWidth: 3 }} />}
          </span>
          Acepto los términos y la política de privacidad
        </label>
        {error && !Object.keys(fieldErr).length && <p className="err" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
        <Button type="submit" loading={busy} disabled={!terms}>Continuar</Button>
        <p className="small mut" style={{ textAlign: 'center', marginTop: 18 }}>¿Ya tenés cuenta? <Link className="link" to="/entrar">Iniciar sesión</Link></p>
      </form>
    </Screen>
  );
}
