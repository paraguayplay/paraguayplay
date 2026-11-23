import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useSession } from '../../lib/session';
import { formatDate } from '../../lib/format';
import { supportUrl } from '../../lib/whatsapp';
import type { Me } from '../../lib/types';
import { useSettings } from '../../hooks/useData';
import { Screen } from '../../ui/Layout';
import { Avatar } from '../../ui/AppTop';
import { TabBar } from '../../ui/TabBar';
import { Button } from '../../ui/Button';
import { Glass } from '../../ui/Glass';
import { Icon, type IconName } from '../../ui/Icon';
import { Pill } from '../../ui/misc';

export function statusPill(me: Me) {
  const s = me.subscription.status;
  if (s === 'active') return <Pill tone="ok">Activa</Pill>;
  if (s === 'suspended') return <Pill tone="bad">Suspendida</Pill>;
  if (me.pending_request) return <Pill tone="warn">En revisión</Pill>;
  if (s === 'expired') return <Pill tone="bad">Vencida</Pill>;
  return <Pill tone="warn">Pendiente</Pill>;
}

export async function logout() {
  await api('/auth/logout', { method: 'POST' }).catch(() => { /* igual cerramos local */ });
  useSession.getState().signOut();
}

function Item({ icon, label, to, onClick, danger }: { icon: IconName; label: string; to?: string; onClick?: () => void; danger?: boolean }) {
  const inner = (
    <>
      <div className="ic" style={danger ? { background: 'rgba(255,77,94,.12)', color: 'var(--bad)' } : undefined}><Icon name={icon} style={{ width: 19 }} /></div>
      {label}
      {!danger && <Icon name="chev" className="ico chev" style={{ width: 18 }} />}
    </>
  );
  const style = danger ? { color: 'var(--bad)', width: '100%' } : { width: '100%' };
  return to ? <Link className="it focusable" to={to} style={style}>{inner}</Link> : <button className="it focusable" onClick={onClick} style={style}>{inner}</button>;
}

export function Profile() {
  const nav = useNavigate();
  const me = useSession((s) => s.me)!;
  const { data: settings } = useSettings();
  const [help, setHelp] = useState(false);
  const sub = me.subscription;
  const days = sub.status === 'active' ? sub.days_left ?? 0 : 0;
  const pct = sub.plan && sub.status === 'active' ? Math.min(100, Math.round((days / sub.plan.duration_days) * 100)) : 0;
  const wa = supportUrl(settings?.support_whatsapp);
  const out = async () => { await logout(); nav('/entrar', { replace: true }); };

  return (
    <Screen id="perfil" bar>
      <div className="wrap profile" style={{ paddingTop: 24 }}>
        <h1 className="h1" style={{ marginBottom: 14 }}>Mi perfil</h1>
        <div className="profile-grid">
          <Glass style={{ padding: 20, borderRadius: 24, background: 'linear-gradient(160deg,rgba(242,106,10,.2),rgba(255,255,255,.03) 60%)' }}>
            <div className="row" style={{ gap: 14 }}>
              <Avatar size={54} />
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 18 }}>{me.name}</div><div className="small mut">{me.email}</div></div>
            </div>
            <div className="hr" />
            <div className="row" style={{ gap: 18 }}>
              <div className="ring" style={{ background: `conic-gradient(var(--o) 0 ${pct}%,rgba(255,255,255,.08) ${pct}% 100%)` }}>
                <div><b>{days}</b><span>DÍAS</span></div>
              </div>
              <div>
                {statusPill(me)}
                <div style={{ fontWeight: 800, fontSize: 18, marginTop: 10 }}>{sub.plan ? `Plan ${sub.plan.name}` : 'Sin plan'}</div>
                {sub.expires_at && <div className="small mut" style={{ marginTop: 2 }}>{sub.status === 'active' ? 'Vence' : 'Venció'} el {formatDate(sub.expires_at)}</div>}
              </div>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 18 }}>
              <Button style={{ flex: 1, height: 48, fontSize: 15 }} onClick={() => nav('/planes')}>Renovar</Button>
              <Button variant="secondary" style={{ flex: 1, height: 48, fontSize: 15 }} onClick={() => nav('/planes')}>Cambiar de plan</Button>
            </div>
          </Glass>
          <Glass className="menu" style={{ borderRadius: 20 }}>
            <Item icon="hist" label="Historial de planes" to="/perfil/historial" />
            <Item icon="tv" label="Vincular un televisor" to="/vincular" />
            <Item icon="lock" label="Cambiar contraseña" to="/perfil/contrasena" />
            <Item icon="help" label="Ayuda y soporte" onClick={() => setHelp(!help)} />
            {help && (
              <div style={{ padding: '4px 16px 16px' }}>
                {settings?.help_text && <p className="small mut" style={{ lineHeight: 1.5, marginBottom: 12, whiteSpace: 'pre-line' }}>{settings.help_text}</p>}
                {wa && <a className="btn wa" href={wa} target="_blank" rel="noopener noreferrer" style={{ height: 46, fontSize: 15 }}><Icon name="wa" />Escribir a soporte</a>}
              </div>
            )}
            <Item icon="out" label="Cerrar sesión" onClick={out} danger />
          </Glass>
        </div>
      </div>
      <TabBar />
    </Screen>
  );
}
