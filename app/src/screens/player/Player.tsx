import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useSession } from '../../lib/session';
import { decryptPlay } from '../../lib/crypto';
import { isTvMode } from '../../lib/tv';
import { refreshMe } from '../../hooks/useMe';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { LiveTag } from '../../ui/misc';
import { createEngine, UNSUPPORTED_MSG, type Engine, type PlayLink } from './shaka';
import { ServerSwitch } from './ServerSwitch';
import { Watermark, watermarkText } from './Watermark';

type PlayResponse = { event: { id: number; title: string }; payload: string; iv: string };

export function Player() {
  const nav = useNavigate();
  const id = Number(useParams().id);
  const me = useSession((s) => s.me)!;
  const sessionKey = useSession((s) => s.sessionKey);
  const tv = isTvMode();

  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [title, setTitle] = useState('');
  const [links, setLinks] = useState<PlayLink[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [paused, setPaused] = useState(true); // hasta que el video arranque de verdad
  const [castable, setCastable] = useState(false);
  const [showUi, setShowUi] = useState(true);

  // 1) pedir y descifrar los enlaces (solo en memoria)
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await api<PlayResponse>(`/events/${id}/play`);
        const { links } = await decryptPlay(r.payload, r.iv, sessionKey ?? '');
        if (!live) return;
        setTitle(r.event.title);
        setLinks(links);
      } catch (e) {
        if (!live) return;
        const x = e as ApiError;
        if (x.code === 'subscription_inactive') { refreshMe(); nav('/planes', { replace: true }); return; }
        if (x.status === 401) return;
        setFatal(x.status === 404 ? 'Este evento ya no está disponible.' : x instanceof ApiError ? x.message : 'No se pudo abrir el evento.');
      }
    })();
    return () => { live = false; };
  }, [id, sessionKey, nav]);

  // 2) motor de video: uno por pantalla; se libera al salir
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const eng = createEngine(v, () => setFailed('No se pudo cargar este servidor'));
    engineRef.current = eng;
    return () => { eng.destroy(); engineRef.current = null; };
  }, [links !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3) cargar el servidor elegido
  const current = links?.[idx];
  useEffect(() => {
    const eng = engineRef.current;
    if (!current || !eng) return;
    setFailed(null);
    if (current.type === 'web') { eng.destroy(); return; }
    eng.load(current).catch((e) => setFailed((e as Error)?.message === UNSUPPORTED_MSG ? UNSUPPORTED_MSG : 'No se pudo cargar este servidor'));
  }, [current]);

  // Enviar al TV (Chromecast / AirPlay), solo si el navegador lo ofrece
  useEffect(() => {
    const v = videoRef.current as any;
    if (!v?.remote?.watchAvailability) return;
    let wid: number | undefined;
    v.remote.watchAvailability((a: boolean) => setCastable(a)).then((x: number) => { wid = x; }).catch(() => setCastable(false));
    return () => { if (wid !== undefined) v.remote.cancelWatchAvailability(wid).catch(() => {}); };
  }, [links !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  // controles que se ocultan solos
  const poke = useCallback(() => setShowUi(true), []);
  useEffect(() => {
    if (!showUi || failed || paused) return; // en pausa los controles no se esconden
    const t = setTimeout(() => setShowUi(false), 4000);
    return () => clearTimeout(t);
  }, [showUi, failed, idx, paused]);

  const toggle = () => { const v = videoRef.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
  const full = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else { await boxRef.current?.requestFullscreen(); await (screen.orientation as any)?.lock?.('landscape'); }
    } catch { /* no soportado */ }
  };
  const next = links && idx + 1 < links.length ? idx + 1 : null;

  if (fatal) return (
    <div className="screen glow nobar" data-testid="screen-ver">
      <div className="z wrap center" style={{ paddingTop: 120 }}>
        <p className="mut" style={{ marginBottom: 22, fontSize: 16 }}>{fatal}</p>
        <Button variant="secondary" onClick={() => nav('/')}>Volver al inicio</Button>
      </div>
    </div>
  );

  return (
    <div ref={boxRef} className="player-box" data-testid="screen-ver" onPointerMove={poke} onClick={poke} onKeyDown={poke}>
      <video
        ref={videoRef}
        playsInline
        autoPlay
        style={{ display: current?.type === 'web' ? 'none' : 'block' }}
        onPause={() => setPaused(true)}
        onPlay={() => setPaused(false)}
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
      />
      {current?.type === 'web' && (
        tv ? (
          <div className="player-msg"><p>Este servidor no funciona en el televisor</p>{next !== null && <Button onClick={() => setIdx(next)}>{`Probar ${links![next].label}`}</Button>}</div>
        ) : (
          <>
            <iframe src={current.url} title={title} allow="autoplay; fullscreen; encrypted-media" allowFullScreen referrerPolicy="no-referrer" />
            <a className="btn2 web-open" href={current.url} target="_blank" rel="noopener noreferrer">Abrir en el navegador</a>
          </>
        )
      )}
      <Watermark text={watermarkText(me.id, me.email)} />

      {!links && !failed && <div className="player-msg"><span className="spin" style={{ width: 44, height: 44 }} /></div>}
      {failed && (
        <div className="player-msg">
          <p style={{ fontWeight: 800, fontSize: 18 }}>{failed}</p>
          {next !== null
            ? <Button style={{ width: 'auto', padding: '0 24px' }} onClick={() => setIdx(next)}>{`Probar ${links![next].label}`}</Button>
            : <Button variant="secondary" style={{ width: 'auto', padding: '0 24px' }} onClick={() => { setIdx(0); setLinks([...(links ?? [])]); }}>Volver a intentar</Button>}
        </div>
      )}

      <div className={`player-ui ${showUi || failed || !links || paused ? 'on' : ''}`}>
        <div className="player-top row">
          <button className="back" aria-label="Volver" onClick={() => nav(-1)}><Icon name="back" /></button>
          {tv && <img src="/logo.png" alt="" style={{ width: 60, marginLeft: 12 }} />}
          <div style={{ marginLeft: 10, minWidth: 0 }}>
            <div className="player-title">{title}</div>
            {current && <div className="small mut">{current.label}</div>}
          </div>
          <div className="row" style={{ marginLeft: 'auto', gap: 18 }}>
            {castable && <button aria-label="Enviar al TV" onClick={() => (videoRef.current as any)?.remote?.prompt().catch(() => {})}><Icon name="cast" /></button>}
            {tv && <LiveTag />}
          </div>
        </div>
        {current?.type !== 'web' && links && !failed && (
          <div className="player-center row">
            <button aria-label="Recargar" onClick={() => setLinks([...links])}><Icon name="refresh" size={30} /></button>
            <button className="bigplay focusable" aria-label={paused ? 'Reproducir' : 'Pausar'} onClick={toggle}><Icon name={paused ? 'play' : 'pause'} size={30} style={{ color: '#fff' }} /></button>
            {!tv && <button aria-label="Pantalla completa" onClick={full}><Icon name="full" size={30} /></button>}
          </div>
        )}
        {links && (
          <div className="player-bottom">
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
              {!tv && <LiveTag />}
              <ServerSwitch links={links} idx={idx} onPick={setIdx} />
            </div>
            <div className="bar"><i /></div>
          </div>
        )}
      </div>
    </div>
  );
}
