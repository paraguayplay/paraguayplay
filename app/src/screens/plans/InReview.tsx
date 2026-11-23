import { useNavigate } from 'react-router-dom';
import { useSession } from '../../lib/session';
import { formatGs } from '../../lib/format';
import { isTvMode } from '../../lib/tv';
import { useSettings } from '../../hooks/useData';
import { Button } from '../../ui/Button';
import { Glass } from '../../ui/Glass';
import { Icon } from '../../ui/Icon';
import { Screen } from '../../ui/Layout';
import { AppTop, Steps } from '../../ui/AppTop';
import { Pill } from '../../ui/misc';
import { useRequestInfo, useWhatsappFor, WhatsQr } from './Pay';

export function InReview() {
  const nav = useNavigate();
  const req = useSession((s) => s.me!.pending_request!);
  const { data: settings } = useSettings();
  const info = useRequestInfo(req.id);
  const wa = useWhatsappFor(req.id, info, settings?.support_whatsapp);

  return (
    <Screen id="en-revision">
      <AppTop />
      <div className="wrap center" style={{ maxWidth: 560, margin: '0 auto' }}>
        <Steps at={3} />
        <div style={{ position: 'relative', width: 150, height: 150, margin: '36px auto 26px', display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from 200deg,var(--o) 0 70%,transparent 70%)', WebkitMask: 'radial-gradient(circle,transparent 62px,#000 63px)', mask: 'radial-gradient(circle,transparent 62px,#000 63px)', filter: 'drop-shadow(0 0 14px rgba(242,106,10,.7))' }} />
          <Glass style={{ position: 'absolute', inset: 16, borderRadius: '50%' }} />
          <Icon name="clock" size={58} style={{ position: 'relative', color: 'var(--o2)' }} />
        </div>
        <Pill tone="warn">Solicitud en revisión</Pill>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '16px 0 10px' }}>¡Recibimos tu pedido!</h1>
        <p className="mut" style={{ fontSize: 15, lineHeight: 1.55 }}>Apenas confirmemos la transferencia, tu cuenta se activa sola. Suele tardar menos de una hora.</p>
        <Glass style={{ padding: '6px 18px', borderRadius: 18, margin: '24px 0', textAlign: 'left' }}>
          <div className="kv"><span>Solicitud</span><b>N.º {req.id}</b></div>
          <div className="kv"><span>Plan</span><b>{info?.planName ?? '…'}</b></div>
          <div className="kv"><span>Monto</span><b>{formatGs(req.amount_gs)}</b></div>
        </Glass>
        {wa && (isTvMode()
          ? <div style={{ marginBottom: 20 }}><WhatsQr url={wa} size={240} /><p className="mut" style={{ marginTop: 14 }}>Escaneá para reenviar el comprobante</p></div>
          : <a className="btn wa" href={wa} target="_blank" rel="noopener noreferrer" style={{ marginBottom: 14 }}><Icon name="wa" size={24} />Reenviar comprobante</a>)}
        <Button variant="secondary" onClick={() => nav('/planes')}>Cambiar de plan</Button>
      </div>
    </Screen>
  );
}
