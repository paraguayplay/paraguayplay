import { useGet } from '../../hooks/useData';
import { formatDate, formatGs } from '../../lib/format';
import type { PlanRequest } from '../../lib/types';
import { BackBar, Screen } from '../../ui/Layout';
import { Glass } from '../../ui/Glass';
import { Pill, Skeleton } from '../../ui/misc';

const LABEL: Record<PlanRequest['status'], [string, 'ok' | 'warn' | 'bad']> = {
  pending: ['Pendiente', 'warn'], approved: ['Aprobada', 'ok'], rejected: ['Rechazada', 'bad'], cancelled: ['Cancelada', 'bad'],
};

export function History() {
  const { data, error } = useGet<PlanRequest[]>('/plan-requests');
  return (
    <Screen id="historial">
      <BackBar title="Historial de planes" to="/perfil" />
      <div className="wrap" style={{ paddingTop: 20 }}>
        {error && <p className="err">{error}</p>}
        {!data && !error && [0, 1].map((i) => <div key={i} style={{ marginBottom: 12 }}><Skeleton h={80} r={18} /></div>)}
        {data?.length === 0 && <p className="mut center" style={{ padding: 40 }}>Todavía no pediste ningún plan.</p>}
        <div className="stagger">
          {data?.map((r) => (
            <Glass key={r.id} style={{ padding: 16, borderRadius: 18, marginBottom: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <div><div style={{ fontWeight: 800 }}>{r.plan.name} · {formatGs(r.amount_gs)}</div><div className="small mut">Solicitud N.º {r.id} · {formatDate(r.created_at)}</div></div>
                <Pill tone={LABEL[r.status][1]}>{LABEL[r.status][0]}</Pill>
              </div>
              {r.status === 'approved' && r.resulting_expires_at && <p className="small mut" style={{ marginTop: 8 }}>Activa hasta el {formatDate(r.resulting_expires_at)}</p>}
              {r.note && <p className="small" style={{ marginTop: 8, color: 'var(--t2)' }}>{r.note}</p>}
            </Glass>
          ))}
        </div>
      </div>
    </Screen>
  );
}
