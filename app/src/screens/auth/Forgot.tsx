import { useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Glass } from '../../ui/Glass';
import { Icon } from '../../ui/Icon';
import { BackBar, Screen } from '../../ui/Layout';

export function Forgot() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const r = await api<{ message: string }>('/auth/forgot-password', { method: 'POST', auth: false, body: { email: email.trim() } });
      setDone(r.message);
    } catch (x) { setError((x as ApiError).message); } finally { setBusy(false); }
  }

  return (
    <Screen id="recuperar">
      <BackBar to="/entrar" />
      <form className="auth" onSubmit={onSubmit}>
        <Glass style={{ width: 86, height: 86, borderRadius: 26, margin: '40px auto 24px', display: 'grid', placeItems: 'center', color: 'var(--o2)' }}><Icon name="key" size={42} /></Glass>
        <h1 style={{ fontSize: 27, fontWeight: 900, textAlign: 'center' }}>¿Olvidaste tu contraseña?</h1>
        <p className="mut" style={{ fontSize: 15, textAlign: 'center', margin: '10px 10px 30px', lineHeight: 1.5 }}>Escribí tu correo y te mandamos un enlace para crear una nueva. Vence en 1 hora.</p>
        <Field label="Correo" icon="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {error && <p className="err" role="alert" style={{ marginTop: 14 }}>{error}</p>}
        <Button type="submit" loading={busy} style={{ marginTop: 22 }}>Enviar enlace</Button>
        {done && (
          <div className="notice ok" role="status" style={{ marginTop: 26 }}>
            <Icon name="check" style={{ color: 'var(--ok)', flex: 'none' }} />
            <span><span>{done}</span><br /><span className="mut">Revisá también la carpeta de spam.</span></span>
          </div>
        )}
      </form>
    </Screen>
  );
}
