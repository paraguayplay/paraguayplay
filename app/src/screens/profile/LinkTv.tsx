import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';
import { BackBar, Screen } from '../../ui/Layout';
import { Button } from '../../ui/Button';
import { Glass } from '../../ui/Glass';
import { Icon } from '../../ui/Icon';

const ALPHABET = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;
export const cleanCode = (s: string) => s.toUpperCase().replace(ALPHABET, '').slice(0, 6);
export const showCode = (c: string) => (c.length > 3 ? `${c.slice(0, 3)}-${c.slice(3)}` : c);

export function LinkTv() {
  const nav = useNavigate();
  const [q] = useSearchParams();
  const [code, setCode] = useState(() => cleanCode(q.get('code') ?? ''));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function confirm() {
    setBusy(true); setErr(null);
    try {
      const r = await api<{ message: string }>(`/auth/tv-code/${code}/confirm`, { method: 'POST', auth: true });
      setDone(r.message);
    } catch (x) {
      const e = x as ApiError;
      setErr(e.status === 410 ? 'El código venció. Mirá el código nuevo en el TV.' : e.message);
    } finally { setBusy(false); }
  }

  if (done) return (
    <Screen id="vincular">
      <div className="wrap center" style={{ paddingTop: 90 }}>
        <div className="warnic" style={{ color: 'var(--ok)', borderColor: 'rgba(43,212,125,.4)', background: 'rgba(43,212,125,.12)' }}><Icon name="check" size={34} /></div>
        <h1 className="h1" style={{ marginBottom: 12 }}>¡Listo!</h1>
        <p className="lead" style={{ marginBottom: 28 }}>{done}</p>
        <Button onClick={() => { useSession.getState().signOut(); nav('/entrar', { replace: true }); }}>Entrar de nuevo en este celular</Button>
      </div>
    </Screen>
  );

  const boxes = Array.from({ length: 6 }, (_, i) => code[i] ?? '');
  return (
    <Screen id="vincular">
      <BackBar title="Vincular televisor" to="/perfil" />
      <div className="wrap center">
        <Glass style={{ margin: '40px auto 22px', width: 120, height: 88, borderRadius: 16, display: 'grid', placeItems: 'center', color: 'var(--o2)' }}><Icon name="tv" size={56} /></Glass>
        <h1 style={{ fontSize: 25, fontWeight: 900 }}>Escribí el código del TV</h1>
        <p className="mut" style={{ fontSize: 15, margin: '10px 0 28px', lineHeight: 1.5 }}>Aparece en la pantalla del televisor. También podés escanear el QR con la cámara.</p>
        <label style={{ position: 'relative', display: 'block' }}>
          <span className="code" aria-hidden="true">
            {boxes.slice(0, 3).map((c, i) => <div key={i} className={i === code.length ? 'cur' : ''}>{c}</div>)}
            <div className="dash">–</div>
            {boxes.slice(3).map((c, i) => <div key={i + 3} className={i + 3 === code.length ? 'cur' : ''}>{c}</div>)}
          </span>
          <input aria-label="Código del televisor" value={showCode(code)} onChange={(e) => setCode(cleanCode(e.target.value))} autoCapitalize="characters" autoComplete="off" inputMode="text"
            style={{ position: 'absolute', inset: 0, opacity: 0, fontSize: 16 }} />
        </label>
        <p className="small mut" style={{ margin: '18px 0 26px', minHeight: 18 }}>{code.length === 6 && <>Vas a vincular el TV con el código <b style={{ color: 'var(--o2)' }}>{showCode(code)}</b></>}</p>
        {err && <p className="err" role="alert" style={{ marginBottom: 14 }}>{err}</p>}
        <Button onClick={confirm} loading={busy} disabled={code.length !== 6}>Vincular este televisor</Button>
        <div className="notice warn" style={{ marginTop: 22, textAlign: 'left' }}>
          <Icon name="alert" style={{ color: 'var(--warn)', flex: 'none' }} />
          <span className="mut">Tu cuenta funciona en un dispositivo a la vez. Al vincular el TV, se cierra la sesión en este celular.</span>
        </div>
      </div>
    </Screen>
  );
}
