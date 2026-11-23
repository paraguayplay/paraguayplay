import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Glass } from '../../ui/Glass';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Layout';

export function Reset() {
  const [q] = useSearchParams();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<{ msg: string; badToken: boolean } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await api('/auth/reset-password', { method: 'POST', auth: false, body: { email: q.get('email') ?? '', token: q.get('token') ?? '', password, password_confirmation: password } });
      setDone(true);
    } catch (x) {
      const err = x as ApiError;
      setError({ msg: err.message, badToken: err.code === 'invalid_reset_token' });
    } finally { setBusy(false); }
  }

  return (
    <Screen id="restablecer">
      <div className="auth">
        <Glass style={{ width: 86, height: 86, borderRadius: 26, margin: '60px auto 24px', display: 'grid', placeItems: 'center', color: 'var(--o2)' }}><Icon name="lock" size={42} /></Glass>
        <h1 style={{ fontSize: 27, fontWeight: 900, textAlign: 'center', marginBottom: 26 }}>Nueva contraseña</h1>
        {done ? (
          <>
            <div className="notice ok" role="status"><Icon name="check" style={{ color: 'var(--ok)', flex: 'none' }} /><span>Listo, ya podés entrar con tu nueva contraseña.</span></div>
            <Link to="/entrar"><Button style={{ marginTop: 22 }}>Ir a iniciar sesión</Button></Link>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <Field label="Nueva contraseña" icon="lock" type="password" autoComplete="new-password" placeholder="Mínimo 8 caracteres" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && (
              <p className="err" role="alert" style={{ marginTop: 14 }}>
                {error.msg}{' '}
                {error.badToken && <Link className="link" to="/recuperar">Pedir un enlace nuevo</Link>}
              </p>
            )}
            <Button type="submit" loading={busy} style={{ marginTop: 22 }}>Guardar contraseña</Button>
          </form>
        )}
      </div>
    </Screen>
  );
}
