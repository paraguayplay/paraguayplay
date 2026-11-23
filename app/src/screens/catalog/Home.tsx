import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCatalog } from '../../hooks/useCatalog';
import { isEmpty, pickFeatured } from '../../lib/catalogCache';
import type { CatalogEvent } from '../../lib/types';
import { Screen, IconButton } from '../../ui/Layout';
import { AppTop } from '../../ui/AppTop';
import { TabBar } from '../../ui/TabBar';
import { Poster } from '../../ui/Poster';
import { Icon } from '../../ui/Icon';
import { LiveTag, Skeleton } from '../../ui/misc';
import { CatalogState, EventCard, EventRow, RowSkeleton, when } from './parts';
import { TvHome } from './TvHome';
import { isTvMode } from '../../lib/tv';

export function Home() {
  const nav = useNavigate();
  const { data, loading, offline, error, reload } = useCatalog();
  const [cat, setCat] = useState<string | null>(null);
  const featured = data ? pickFeatured(data) : null;
  const inCat = (e: CatalogEvent) => !cat || e.category === cat;
  const live = (data?.live ?? []).filter(inCat).filter((e) => !featured || cat || e.id !== featured.id);
  const upcoming = (data?.upcoming ?? []).filter(inCat);
  const cats = data?.categories.map((c) => c.name) ?? [];

  if (isTvMode()) return (
    <Screen id="inicio" bar tvNative>
      <div style={{ padding: '0 96px' }}><CatalogState loading={loading} error={data ? null : error} offline={offline} empty={!!data && isEmpty(data)} onRetry={reload} /></div>
      {data && <TvHome data={data} />}
      <TabBar />
    </Screen>
  );

  return (
    <Screen id="inicio" bar>
      <AppTop extra={<IconButton icon="search" label="Buscar" onClick={() => nav('/buscar')} />} />
      <div className="wrap" style={{ paddingTop: 16 }}>
        <CatalogState loading={loading} error={data ? null : error} offline={offline} empty={!!data && isEmpty(data)} onRetry={reload} />
        {!data && !error && <><Skeleton h={196} r={24} /><RowSkeleton /></>}
        {featured && !cat && (
          <Link to={`/evento/${featured.id}`} className="focusable" data-event={featured.id}>
            <Poster category={featured.category} imageUrl={featured.image_url} className="feat" style={{ marginBottom: 16 }}>
              <div className="tag">{featured.is_live ? <LiveTag /> : <span className="soon">PRÓXIMO</span>}</div>
              <div className="meta">
                <div className="small" style={{ color: 'var(--o2)', fontWeight: 800, letterSpacing: 1, marginBottom: 6 }}>{(featured.category ?? 'Evento').toUpperCase()} · DESTACADO</div>
                <h2>{featured.title}</h2>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
                  <span className="small mut">{when(featured)}</span>
                  <span className="btn" style={{ height: 40, width: 'auto', padding: '0 16px', fontSize: 14, borderRadius: 12 }}><Icon name="play" style={{ width: 16 }} />Ver</span>
                </div>
              </div>
            </Poster>
          </Link>
        )}
        {cats.length > 0 && (
          <div className="row hscroll-x" style={{ gap: 8, marginBottom: 16 }}>
            <button className={`chip ${!cat ? 'on' : ''}`} onClick={() => setCat(null)}>Todos</button>
            {cats.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
          </div>
        )}
        {live.length > 0 && (
          <>
            <div className="sec"><h3><span className="live" style={{ marginRight: 8, verticalAlign: 2 }}>EN VIVO</span>Ahora</h3></div>
            <div className="hscroll hscroll-x stagger" style={{ marginBottom: 16 }}>{live.map((e) => <EventCard key={e.id} e={e} />)}</div>
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <div className="sec"><h3>Próximos</h3><Link to="/agenda"><span>Ver todo</span></Link></div>
            <div className="stagger">{upcoming.slice(0, 6).map((e) => <EventRow key={e.id} e={e} />)}</div>
          </>
        )}
      </div>
      <TabBar />
    </Screen>
  );
}
