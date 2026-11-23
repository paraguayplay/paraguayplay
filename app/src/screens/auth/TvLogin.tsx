import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { api, ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';
import { deviceName } from '../../lib/device';
import { destinationFor } from '../../lib/destination';
import type { Me } from '../../lib/types';
import { Screen } from '../../ui/Layout';
import { Button } from '../../ui/Button';
import { Glass } from '../../ui/Glass';
import { EndedNotice } from './EndedNotice';
import { showCode } from '../profile/LinkTv';


type Code = { code: string; qr_url: string; expires_at: string };
type Poll = { status: 'waiting' } | { status: 'approved'; token: string; session_key: string; user: Me };

export const POLL_MS = 3000;

export function TvLogin({ onUseEmail }: { onUseEmail: () => void }) {
  const nav = useNavigate();
  const signIn = useSession((s) => s.signIn);
  const [code, setCode] = useState<Code | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const busy = useRef(false);

  const newCode = useCallback(async () => {
    try {
      setErr(null);
      const c = await api<Code>('/auth/tv-code', { method: 'POST', auth: false, body: { device_name: deviceName() } });
      setCode(c);
      setQr(await QRCode.toDataURL(c.qr_url, { width: 300, margin: 1 }).catch(() => null));
    } catch (e) { setErr((e as ApiError).message); }
  }, []);

  useEffect(() => { newCode(); }, [newCode]);

  useEffect(() => {
    if (!code) return;
    const t = setInterval(async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const r = await api<Poll>(`/auth/tv-code/${code.code}`, { auth: false });
        if (r.status === 'approved') {
          clearInterval(t);
          signIn({ token: r.token, session_key: r.session_key, user: r.user });
          nav(destinationFor(r.user), { replace: true });
        }
      } catch (e) {
        if ((e as ApiError).status === 410) { clearInterval(t); newCode(); }
      } finally { busy.current = false; }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [code, newCode, nav, signIn]);

  return (
    <Screen id="entrar" tvNative>
      <EndedNotice />
      <div className="tvlogin">
        <div style={{ flex: 1 }}>
          <img src="/logo.png" alt="" style={{ width: 150, filter: 'drop-shadow(0 0 50px rgba(242,106,10,.55))' }} />
          <h1 className="brand" style={{ fontSize: 64, margin: '30px 0 14px' }}>PARAGUAY PLAY <b>TV</b></h1>
          <p className="mut" style={{ fontSize: 30, lineHeight: 1.4, maxWidth: 720 }}>Iniciá sesión con tu celular. Es más rápido que escribir con el control.</p>
          <ol className="tvsteps">
            <li><b>1</b>Abrí la app en tu celular o escaneá el QR</li>
            <li><b>2</b>Andá a Perfil › Vincular un televisor</li>
            <li><b>3</b>Escribí este código</li>
          </ol>
        </div>
        <Glass style={{ width: 640, padding: 56, borderRadius: 40, textAlign: 'center' }}>
          {qr ? <img src={qr} alt="Código QR para vincular" width={300} height={300} className="tvqr" /> : <div className="tvqr skel" style={{ width: 300, height: 300, margin: '0 auto' }} />}
          {code && <div className="tvcode">{showCode(code.code)}</div>}
          
          {err && <p className="err" style={{ fontSize: 22, margin: '20px 0' }}>{err}</p>}
          <div className="mut" style={{ fontSize: 24 }}>El código se renueva solo</div>
          <Button variant="secondary" size="tv" style={{ marginTop: 44 }} onClick={onUseEmail} data-autofocus>Usar correo y contraseña</Button>
        </Glass>
      </div>
    </Screen>
  );
}
