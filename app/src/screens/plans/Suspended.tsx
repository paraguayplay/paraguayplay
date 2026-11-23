import { api } from '../../lib/api';
import { useSession } from '../../lib/session';
import { supportUrl } from '../../lib/whatsapp';
import { useSettings } from '../../hooks/useData';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Layout';
import { AppTop } from '../../ui/AppTop';
import { Pill } from '../../ui/misc';

export function Suspended() {
  const { data: settings } = useSettings();
  const wa = supportUrl(settings?.support_whatsapp);
  const out = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); useSession.getState().signOut(); };
  return (
    <Screen id="suspendida">
      <AppTop />
      <div className="wrap center" style={{ maxWidth: 560, margin: '0 auto', paddingTop: 60 }}>
        <div className="warnic" style={{ color: 'var(--bad)', borderColor: 'rgba(255,77,94,.4)', background: 'rgba(255,77,94,.12)' }}><Icon name="alert" size={34} /></div>
        <Pill tone="bad">Cuenta suspendida</Pill>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '16px 0 10px' }}>Tu cuenta está suspendida</h1>
        <p className="mut" style={{ fontSize: 15, lineHeight: 1.55, marginBottom: 26 }}>Escribinos por WhatsApp para saber qué pasó y reactivarla.</p>
        {wa && <a className="btn wa" href={wa} target="_blank" rel="noopener noreferrer" style={{ marginBottom: 14 }}><Icon name="wa" size={24} />Hablar con soporte</a>}
        <Button variant="secondary" onClick={out}>Cerrar sesión</Button>
      </div>
    </Screen>
  );
}
