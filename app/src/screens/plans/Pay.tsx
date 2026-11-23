import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { useSession } from '../../lib/session';
import { formatGs } from '../../lib/format';
import { parseBankInfo } from '../../lib/bankInfo';
import { buildWhatsappUrl, remembered } from '../../lib/whatsapp';
import { isTvMode } from '../../lib/tv';
import type { PlanRequest } from '../../lib/types';
import { useGet, usePlans, useSettings } from '../../hooks/useData';
import { Glass } from '../../ui/Glass';
import { Icon } from '../../ui/Icon';
import { BackBar, Screen } from '../../ui/Layout';
import { Steps } from '../../ui/AppTop';
import { Skeleton } from '../../ui/misc';

/** Datos de la solicitud: de `me.pending_request` si coincide; si no, del historial. */
export function useRequestInfo(id: number) {
  const me = useSession((s) => s.me)!;
  const mem = remembered(id);
  const { data: plans } = usePlans();
  const fromMe = me.pending_request?.id === id ? me.pending_request : null;
  const { data: history } = useGet<PlanRequest[]>(fromMe || mem ? null : '/plan-requests');
  const fromHist = history?.find((r) => r.id === id);
  const planId = fromMe?.plan_id ?? fromHist?.plan.id;
  const plan = plans?.find((p) => p.id === planId) ?? fromHist?.plan;
  const amount = fromMe?.amount_gs ?? fromHist?.amount_gs;
  if (mem) return { planName: mem.planName, amountGs: mem.amountGs };
  return plan && amount !== undefined ? { planName: plan.name, amountGs: amount } : null;
}

export function useWhatsappFor(id: number, info: { planName: string; amountGs: number } | null, phone: string | null | undefined) {
  const me = useSession((s) => s.me)!;
  return remembered(id)?.whatsapp_url ?? (info ? buildWhatsappUrl(phone, { name: me.name, email: me.email, planName: info.planName, amountGs: info.amountGs, requestId: id }) : null);
}

export function WhatsQr({ url, size = 300 }: { url: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { QRCode.toDataURL(url, { width: size, margin: 1, color: { dark: '#111111', light: '#ffffff' } }).then(setSrc).catch(() => setSrc(null)); }, [url, size]);
  return src ? <img src={src} alt="Código QR" width={size} height={size} style={{ borderRadius: 20, background: '#fff', padding: 14, boxShadow: '0 0 0 8px rgba(242,106,10,.25),0 0 60px rgba(242,106,10,.35)' }} /> : null;
}

function CopyRow({ k, v }: { k: string; v: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(v); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* sin portapapeles */ } };
  return (
    <div className="kv">
      <span>{k}</span>
      <b className="row">{v}
        <button className="copy" aria-label={`Copiar ${k}`} onClick={copy}><Icon name={done ? 'check' : 'copy'} style={{ width: 16 }} /></button>
        {done && <span className="small" style={{ color: 'var(--ok)', marginLeft: 6 }}>Copiado</span>}
      </b>
    </div>
  );
}

export function BankBox({ text }: { text: string | null | undefined }) {
  const rows = parseBankInfo(text);
  if (!rows.length) return <p className="mut small">Pedí los datos de la cuenta por WhatsApp.</p>;
  return (
    <Glass style={{ padding: '6px 18px', borderRadius: 18 }}>
      {rows.map((r, i) => ('key' in r ? <CopyRow key={i} k={r.key} v={r.value} /> : <p key={i} className="small mut" style={{ padding: '11px 0' }}>{r.text}</p>))}
    </Glass>
  );
}

export function Pay() {
  const id = Number(useParams().id);
  const { data: settings } = useSettings();
  const info = useRequestInfo(id);
  const wa = useWhatsappFor(id, info, settings?.support_whatsapp);
  const tv = isTvMode();

  const amountBox = (
    <Glass style={{ padding: 20, textAlign: 'center', borderRadius: 22, background: 'linear-gradient(180deg,rgba(242,106,10,.18),rgba(255,255,255,.03))' }}>
      <div className="small mut">{info ? `Plan ${info.planName} · ` : ''}Solicitud N.º {id}</div>
      <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: -1, marginTop: 4 }}>{info ? formatGs(info.amountGs) : <Skeleton h={44} w={200} />}</div>
    </Glass>
  );

  return (
    <Screen id="pagar">
      <BackBar title="Pagar plan" to="/planes" />
      <div className="wrap" style={tv ? { display: 'flex', gap: 60, alignItems: 'flex-start' } : undefined}>
        <div style={tv ? { flex: 1 } : undefined}>
          <Steps at={2} />
          {amountBox}
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: '22px 0 10px' }}>1. Transferí a esta cuenta</h3>
          {settings ? <BankBox text={settings.bank_info} /> : <Skeleton h={180} r={18} />}
        </div>
        <div style={tv ? { width: 420, textAlign: 'center', paddingTop: 40 } : undefined}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: '22px 0 10px' }}>2. Mandanos el comprobante</h3>
          {tv && wa ? (
            <>
              <WhatsQr url={wa} size={320} />
              <p className="mut" style={{ marginTop: 20, fontSize: 20 }}>Escaneá con tu celular para mandar el comprobante</p>
            </>
          ) : wa ? (
            <>
              <a className="btn wa" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="wa" size={24} />Enviar comprobante por WhatsApp</a>
              <p className="small mut" style={{ textAlign: 'center', marginTop: 14, lineHeight: 1.45 }}>Se abre WhatsApp con tus datos y el número de solicitud ya escritos. Solo adjuntá la foto.</p>
            </>
          ) : <Skeleton h={54} r={16} />}
        </div>
      </div>
    </Screen>
  );
}
