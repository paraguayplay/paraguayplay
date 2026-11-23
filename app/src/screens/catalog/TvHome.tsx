import { Link, useNavigate } from 'react-router-dom';
import type { Catalog, CatalogEvent } from '../../lib/types';
import { pickFeatured } from '../../lib/catalogCache';
import { formatEventTime } from '../../lib/format';
import { Poster } from '../../ui/Poster';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { LiveTag } from '../../ui/misc';
import { TvHints } from '../../tv/TvShell';
import { when } from './parts';

function TvCard({ e }: { e: CatalogEvent }) {
  return (
    <Link to={`/evento/${e.id}`} className="tvcard">
      <Poster category={e.category} imageUrl={e.image_url}>
        <div className="tag">{e.is_live ? <LiveTag short /> : <span className="soon">{formatEventTime(e.starts_at)}</span>}</div>
      </Poster>
      <h4>{e.title}</h4>
      <p>{e.category ?? 'Evento'}</p>
    </Link>
  );
}

export function TvRow({ id, title, live, events }: { id: string; title: string; live?: boolean; events: CatalogEvent[] }) {
  if (!events.length) return null;
  return (
    <section style={{ marginBottom: 20 }}>
      <h2 className="tvsec">{live && <span className="live" style={{ fontSize: 15, padding: '6px 12px' }}>EN VIVO</span>}{title}</h2>
      <div className="tvrow" data-row={id}>{events.map((e) => <TvCard key={e.id} e={e} />)}</div>
    </section>
  );
}

export function TvHome({ data }: { data: Catalog }) {
  const nav = useNavigate();
  const f = pickFeatured(data);
  return (
    <>
      {f && (
        <div className="tvhero">
          <Poster category={f.category} imageUrl={f.image_url} />
          <div className="fade" />
          <div className="txt">
            <div className="row" style={{ gap: 14, marginBottom: 22 }}>
              {f.is_live && <span className="live" style={{ fontSize: 17, padding: '8px 14px' }}>EN VIVO</span>}
              {f.category && <span className="soon" style={{ fontSize: 17, padding: '8px 14px' }}>{f.category}</span>}
              <span className="soon" style={{ fontSize: 17, padding: '8px 14px' }}>{when(f)}</span>
            </div>
            <h1>{f.title}</h1>
            {f.description && <p className="mut" style={{ fontSize: 26, margin: '22px 0 34px', lineHeight: 1.4, maxWidth: 900 }}>{f.description}</p>}
            <div className="row" style={{ gap: 22, marginTop: f.description ? 0 : 34 }}>
              {f.is_live
                ? <Button size="tv" style={{ width: 'auto' }} onClick={() => nav(`/ver/${f.id}`)} data-autofocus><Icon name="play" size={30} />Ver en vivo</Button>
                : <Button size="tv" style={{ width: 'auto' }} onClick={() => nav(`/evento/${f.id}`)} data-autofocus>Ver detalles</Button>}
              {f.is_live && <Button variant="secondary" size="tv" style={{ width: 'auto' }} onClick={() => nav(`/evento/${f.id}`)}>Más información</Button>}
            </div>
          </div>
        </div>
      )}
      <TvRow id="live" title="Ahora" live events={data.live.filter((e) => e.id !== f?.id)} />
      <TvRow id="upcoming" title="Próximos" events={data.upcoming} />
      {data.categories.length > 0 && (
        <section>
          <h2 className="tvsec">Categorías</h2>
          <div className="row" style={{ gap: 20, padding: '0 96px 60px' }} data-row="cats">
            {data.categories.map((c) => <button key={c.name} className="chip" onClick={() => nav(`/categorias#${encodeURIComponent(c.name)}`)}>{c.name}</button>)}
          </div>
        </section>
      )}
      <TvHints rows />
    </>
  );
}
