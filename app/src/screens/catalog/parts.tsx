import { Link } from 'react-router-dom';
import type { CatalogEvent } from '../../lib/types';
import { formatEventTime, formatHour } from '../../lib/format';
import { Poster } from '../../ui/Poster';
import { LiveTag, Skeleton } from '../../ui/misc';
import { Button } from '../../ui/Button';

export const when = (e: CatalogEvent) => (e.is_live ? `En vivo desde las ${formatHour(e.starts_at)}` : formatEventTime(e.starts_at));

export function EventCard({ e, wide }: { e: CatalogEvent; wide?: boolean }) {
  return (
    <Link to={`/evento/${e.id}`} className="card focusable" data-event={e.id} style={wide ? { width: '100%' } : undefined}>
      <Poster category={e.category} imageUrl={e.image_url}>
        <div className="tag">{e.is_live ? <LiveTag short /> : <span className="soon">{formatEventTime(e.starts_at)}</span>}</div>
      </Poster>
      <h4>{e.title}</h4>
      <p>{e.category ?? 'Evento'}</p>
    </Link>
  );
}

const DAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
function dateBlock(iso: string) {
  const [w, d] = formatEventTime(iso).split(' ');
  const idx = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].indexOf(w);
  return { w: idx >= 0 ? DAYS[idx] : w.toUpperCase(), d };
}

export function EventRow({ e }: { e: CatalogEvent }) {
  const b = dateBlock(e.starts_at);
  return (
    <Link to={`/evento/${e.id}`} className="glassbox up focusable" data-event={e.id}>
      <div className="date"><span>{b.w}</span><b>{b.d}</b></div>
      <Poster category={e.category} imageUrl={e.image_url} />
      <div style={{ minWidth: 0 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700 }}>{e.title}</h4>
        <p className="small mut" style={{ marginTop: 3 }}>{formatHour(e.starts_at)} · {e.category ?? 'Evento'}</p>
      </div>
    </Link>
  );
}

export function CatalogState({ loading, error, offline, empty, onRetry }: { loading: boolean; error: string | null; offline: boolean; empty: boolean; onRetry: () => void }) {
  if (error) return (
    <div className="notice bad" style={{ margin: '20px 0' }}>
      <span style={{ flex: 1 }}>{error}</span>
      <Button variant="secondary" style={{ width: 'auto', height: 40, padding: '0 16px' }} onClick={onRetry}>Reintentar</Button>
    </div>
  );
  return (
    <>
      {offline && <div className="notice warn" role="status" style={{ marginBottom: 14 }}>Sin conexión · mostrando lo último guardado</div>}
      {empty && !loading && <p className="mut center" style={{ padding: '60px 20px', fontSize: 16 }}>Todavía no hay eventos. Volvé pronto.</p>}
    </>
  );
}

export function RowSkeleton() {
  return <div className="row" style={{ gap: 12, marginTop: 10 }}><Skeleton h={96} w={150} r={16} /><Skeleton h={96} w={150} r={16} /><Skeleton h={96} w={60} r={16} /></div>;
}
