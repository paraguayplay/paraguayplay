import { useCatalog } from '../../hooks/useCatalog';
import { dayKey, formatDayTitle } from '../../lib/format';
import type { CatalogEvent } from '../../lib/types';
import { Screen } from '../../ui/Layout';
import { TabBar } from '../../ui/TabBar';
import { CatalogState, EventRow, RowSkeleton } from './parts';

export function groupByDay(events: CatalogEvent[]): { key: string; title: string; events: CatalogEvent[] }[] {
  const out: { key: string; title: string; events: CatalogEvent[] }[] = [];
  for (const e of events) {
    const k = dayKey(e.starts_at);
    const g = out.find((x) => x.key === k);
    if (g) g.events.push(e); else out.push({ key: k, title: formatDayTitle(e.starts_at), events: [e] });
  }
  return out;
}

export function Agenda() {
  const { data, loading, offline, error, reload } = useCatalog();
  const days = groupByDay(data?.upcoming ?? []);
  return (
    <Screen id="agenda" bar>
      <div className="wrap" style={{ paddingTop: 24 }}>
        <h1 className="h1" style={{ marginBottom: 18 }}>Agenda</h1>
        <CatalogState loading={loading} error={data ? null : error} offline={offline} empty={!!data && !data.upcoming.length} onRetry={reload} />
        {!data && !error && <RowSkeleton />}
        {days.map((d) => (
          <section key={d.key} style={{ marginBottom: 18 }}>
            <h3 className="small" style={{ color: 'var(--o2)', fontWeight: 800, letterSpacing: 0.5, margin: '0 0 10px 4px' }}>{d.title}</h3>
            {d.events.map((e) => <EventRow key={e.id} e={e} />)}
          </section>
        ))}
      </div>
      <TabBar />
    </Screen>
  );
}
