import { useNavigate, useParams } from 'react-router-dom';
import { useCatalog } from '../../hooks/useCatalog';
import { findEvent } from '../../lib/catalogCache';
import { formatEventTime, formatHour } from '../../lib/format';
import { Screen, IconButton } from '../../ui/Layout';
import { Poster } from '../../ui/Poster';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { LiveTag, Skeleton } from '../../ui/misc';

export function EventDetail() {
  const nav = useNavigate();
  const id = Number(useParams().id);
  const { data } = useCatalog();
  const e = data ? findEvent(data, id) : undefined;
  const started = e ? e.is_live || new Date(e.starts_at).getTime() <= Date.now() : false;

  const share = async () => {
    const url = location.origin + `/evento/${id}`;
    try { if (navigator.share) await navigator.share({ title: e?.title, url }); else await navigator.clipboard.writeText(url); } catch { /* cancelado */ }
  };

  return (
    <Screen id="evento" glow={false}>
      <Poster category={e?.category} imageUrl={e?.image_url} style={{ height: 390, borderRadius: 0 }}>
        <div className="shade" style={{ background: 'linear-gradient(180deg,rgba(9,9,13,.4),transparent 30%,rgba(9,9,13,.6) 70%,var(--bg))' }} />
        <div className="top" style={{ position: 'relative', paddingTop: 14 }}>
          <IconButton icon="back" label="Volver" onClick={() => nav(-1)} />
          <IconButton icon="share" label="Compartir" onClick={share} />
        </div>
        {e && started && (
          <button className="bigplay" aria-hidden="true" tabIndex={-1} onClick={() => nav(`/ver/${id}`)} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <Icon name="play" size={32} style={{ color: '#fff', marginLeft: 4 }} />
          </button>
        )}
      </Poster>
      <div className="wrap" style={{ marginTop: -40, position: 'relative' }}>
        {!data && <Skeleton h={120} r={18} />}
        {data && !e && (
          <div className="center" style={{ paddingTop: 50 }}>
            <p className="mut" style={{ marginBottom: 20 }}>Este evento ya no está disponible.</p>
            <Button variant="secondary" onClick={() => nav('/')}>Volver al inicio</Button>
          </div>
        )}
        {e && (
          <>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              {e.is_live && <LiveTag />}
              {e.category && <span className="soon">{e.category}</span>}
            </div>
            <h1 style={{ fontSize: 27, fontWeight: 900, lineHeight: 1.12 }}>{e.title}</h1>
            <p className="small mut" style={{ margin: '8px 0 16px' }}>
              {e.is_live ? `En vivo · desde las ${formatHour(e.starts_at)}` : formatEventTime(e.starts_at)}
              {e.ends_at ? ` a ${formatHour(e.ends_at)}` : ''}
            </p>
            {started
              ? <Button onClick={() => nav(`/ver/${id}`)} style={{ marginBottom: 12 }}><Icon name="play" style={{ width: 20 }} />Ver en vivo</Button>
              : <Button disabled style={{ marginBottom: 12 }}>{`Empieza el ${formatEventTime(e.starts_at)}`}</Button>}
            {e.description && <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--t2)', marginTop: 8 }}>{e.description}</p>}
            {e.link_count > 1 && <p className="small mut" style={{ marginTop: 16 }}>{e.link_count} servidores disponibles</p>}
          </>
        )}
      </div>
    </Screen>
  );
}
