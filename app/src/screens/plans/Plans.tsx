import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';
import { formatGs } from '../../lib/format';
import { rememberRequest } from '../../lib/whatsapp';
import { destinationFor } from '../../lib/destination';
import { refreshMe } from '../../hooks/useMe';
import type { Plan, PlanRequest } from '../../lib/types';
import { usePlans } from '../../hooks/useData';
import { Button } from '../../ui/Button';
import { Glass } from '../../ui/Glass';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Layout';
import { AppTop, Steps } from '../../ui/AppTop';
import { Skeleton } from '../../ui/misc';

const price = (p: Plan) => p.price_label ?? formatGs(p.price_gs);
const sub = (p: Plan) => (p.duration_days === 7 ? '7 días de acceso' : p.duration_days === 30 ? '1 mes de acceso' : p.duration_days === 365 ? '1 año de acceso' : `${p.duration_days} días de acceso`);

export function pickDefault(plans: Plan[]): Plan | undefined {
  return plans.find((p) => p.duration_days === 30) ?? plans[Math.floor(plans.length / 2)];
}

export function Plans() {
  const nav = useNavigate();
  const me = useSession((s) => s.me)!;
  const { data: plans, error, reload } = usePlans();
  const [sel, setSel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const popular = plans ? pickDefault(plans) : undefined;
  useEffect(() => { if (popular && sel === null) setSel(popular.id); }, [popular, sel]);

  const status = me.subscription.status;
  const title = status === 'expired' ? 'Tu plan venció' : status === 'active' ? 'Renovar o cambiar de plan' : 'Elegí tu plan';
  const lead = status === 'expired' ? 'Elegí un plan para seguir viendo.' : status === 'active' ? 'Los días nuevos se suman a tu vencimiento actual.' : 'Tu cuenta está lista. Activala con un plan para ver todos los eventos en vivo.';
  const chosen = plans?.find((p) => p.id === sel);

  async function go() {
    if (!chosen) return;
    setBusy(true); setErr(null);
    try {
      const r = await api<{ request: PlanRequest; whatsapp_url: string | null }>('/plan-requests', { method: 'POST', body: { plan_id: chosen.id } });
      rememberRequest({ id: r.request.id, whatsapp_url: r.whatsapp_url, planName: r.request.plan?.name ?? chosen.name, amountGs: r.request.amount_gs });
      nav(`/pagar/${r.request.id}`);
    } catch (e) {
      const x = e as ApiError;
      if (x.code === 'account_suspended') {
        const fresh = await refreshMe();
        nav(fresh ? destinationFor(fresh) : '/suspendida', { replace: true });
      }
      else setErr(x.message);
    } finally { setBusy(false); }
  }

  return (
    <Screen id="planes">
      <AppTop />
      <div className="wrap plans-wrap">
        {status !== 'active' ? <Steps at={1} /> : <div style={{ height: 20 }} />}
        <h1 style={{ fontSize: 27, fontWeight: 900 }}>{title}</h1>
        <p className="mut" style={{ fontSize: 14.5, margin: '6px 0 22px' }}>{lead}</p>
        {error && <div className="notice bad" style={{ marginBottom: 16 }}><span style={{ flex: 1 }}>{error}</span><Button variant="secondary" style={{ width: 'auto', height: 38, padding: '0 14px' }} onClick={reload}>Reintentar</Button></div>}
        <div role="radiogroup" aria-label="Planes" className="stagger">
          {!plans && !error && [0, 1, 2].map((i) => <div key={i} style={{ marginBottom: 16 }}><Skeleton h={86} r={22} /></div>)}
          {plans?.map((p) => (
            <label key={p.id} className={`glassbox plan row ${sel === p.id ? 'sel' : ''}`} style={{ gap: 14, marginBottom: 16, cursor: 'pointer' }}>
              <input type="radio" name="plan" value={p.id} checked={sel === p.id} onChange={() => setSel(p.id)} aria-label={`${p.name} ${price(p)}`} style={{ position: 'absolute', opacity: 0 }} />
              {p === popular && plans.length > 1 && <div className="badge">MÁS ELEGIDO</div>}
              <div className={`radio ${sel === p.id ? 'on' : ''}`} />
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 17 }}>{p.name}</div><div className="small mut">{sub(p)}</div></div>
              <div className="pr">{price(p)}</div>
            </label>
          ))}
        </div>
        <Glass style={{ padding: 16, margin: '6px 0 22px', borderRadius: 18 }}>
          {['Todos los eventos en vivo', 'Celular, tablet y Smart TV', 'Pago por transferencia, activación manual'].map((t, i) => (
            <div key={t} className="row small" style={{ gap: 10, marginBottom: i < 2 ? 9 : 0 }}><Icon name="check" style={{ color: 'var(--o2)', width: 18 }} />{t}</div>
          ))}
        </Glass>
        {err && <p className="err" role="alert" style={{ marginBottom: 14 }}>{err}</p>}
        <Button onClick={go} loading={busy} disabled={!chosen}>{chosen ? `Continuar con ${chosen.name}` : 'Continuar'}</Button>
      </div>
    </Screen>
  );
}
