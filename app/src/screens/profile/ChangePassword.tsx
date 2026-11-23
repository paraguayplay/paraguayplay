import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api';
import { BackBar, Screen } from '../../ui/Layout';
import { Field } from '../../ui/Field';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';

export function ChangePassword() {
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setDone(false);
    try {
      await api('/me/password', { method: 'PUT', body: { current_password: cur, password: pw, password_confirmation: pw } });
      setDone(true); setCur(''); setPw('');
    } catch (x) { setErr((x as ApiError).message); } finally { setBusy(false); }
  }

  return (
    <Screen id="contrasena">
      <BackBar title="Cambiar contraseña" to="/perfil" />
      <form className="wrap stack" style={{ paddingTop: 24 }} onSubmit={onSubmit}>
        <Field label="Contraseña actual" icon="lock" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required />
        <Field label="Nueva contraseña" icon="key" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
        {err && <p className="err" role="alert">{err}</p>}
        {done && <div className="notice ok" role="status"><Icon name="check" style={{ color: 'var(--ok)' }} /><span>Contraseña actualizada</span></div>}
        <Button type="submit" loading={busy}>Guardar</Button>
      </form>
    </Screen>
  );
}
