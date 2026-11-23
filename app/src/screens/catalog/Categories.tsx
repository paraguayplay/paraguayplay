import { useCatalog } from '../../hooks/useCatalog';
import { isEmpty } from '../../lib/catalogCache';
import { Screen } from '../../ui/Layout';
import { TabBar } from '../../ui/TabBar';
import { CatalogState, EventCard, RowSkeleton } from './parts';

export function Categories() {
  const { data, loading, offline, error, reload } = useCatalog();
  return (
    <Screen id="categorias" bar>
      <div className="wrap" style={{ paddingTop: 24 }}>
        <h1 className="h1" style={{ marginBottom: 18 }}>Categorías</h1>
        <CatalogState loading={loading} error={data ? null : error} offline={offline} empty={!!data && isEmpty(data)} onRetry={reload} />
        {!data && !error && <RowSkeleton />}
        {data?.categories.filter((c) => c.events.length).map((c) => (
          <section key={c.name} style={{ marginBottom: 22 }}>
            <div className="sec"><h2 style={{ fontSize: 18, fontWeight: 800 }}>{c.name}</h2><span className="mut small">{c.events.length}</span></div>
            <div className="hscroll hscroll-x stagger">{c.events.map((e) => <EventCard key={e.id} e={e} />)}</div>
          </section>
        ))}
      </div>
      <TabBar />
    </Screen>
  );
}
