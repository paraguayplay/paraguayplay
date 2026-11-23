import { useState } from 'react';
import { useCatalog } from '../../hooks/useCatalog';
import { searchEvents } from '../../lib/catalogCache';
import { BackBar, Screen } from '../../ui/Layout';
import { Field } from '../../ui/Field';
import { EventRow } from './parts';

export function Search() {
  const { data } = useCatalog();
  const [q, setQ] = useState('');
  const results = data ? searchEvents(data, q) : [];
  return (
    <Screen id="buscar">
      <BackBar title="Buscar" />
      <div className="wrap" style={{ paddingTop: 16 }}>
        <Field label="Buscar eventos" icon="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Título o categoría" autoFocus />
        <div style={{ marginTop: 18 }}>
          {results.map((e) => <EventRow key={e.id} e={e} />)}
          {q.trim() && data && !results.length && <p className="mut center" style={{ padding: 30 }}>No encontramos eventos con “{q.trim()}”.</p>}
        </div>
      </div>
    </Screen>
  );
}
