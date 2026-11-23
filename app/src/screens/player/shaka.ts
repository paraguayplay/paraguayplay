export type PlayLink = {
  label: string;
  type: 'hls' | 'dash' | 'web';
  url: string;
  drm: { type: 'clearkey' | 'widevine' | null; clearkeys: Record<string, string> | null; license_url: string | null };
  headers: Record<string, string> | null; // el navegador no permite enviarlas; las usa el APK
};

export const UNSUPPORTED_MSG = 'Este servidor no funciona en este dispositivo';

export function shakaConfig(link: PlayLink): Record<string, unknown> {
  if (link.drm?.type === 'clearkey' && link.drm.clearkeys) return { drm: { clearKeys: link.drm.clearkeys } };
  if (link.drm?.type === 'widevine' && link.drm.license_url) return { drm: { servers: { 'com.widevine.alpha': link.drm.license_url } } };
  return {};
}

export type Engine = { load(link: PlayLink): Promise<void>; destroy(): Promise<void> };

/** Reproduce HLS/DASH con Shaka; en Safari sin MSE usa el HLS nativo del <video>. */
export function createEngine(video: HTMLVideoElement, onFatal: (e: unknown) => void = () => {}): Engine {
  let player: any = null;
  const onVideoError = () => onFatal(video.error);

  async function reset() {
    if (player) { try { await player.destroy(); } catch { /* ya destruido */ } player = null; }
    video.removeEventListener('error', onVideoError);
    video.removeAttribute('src');
    try { video.load(); } catch { /* jsdom */ }
  }

  return {
    async load(link) {
      await reset();
      const mod: any = await import('shaka-player/dist/shaka-player.compiled.js');
      const shaka = mod.default ?? mod;
      shaka.polyfill.installAll();
      if (shaka.Player.isBrowserSupported()) {
        player = new shaka.Player();
        await player.attach(video);
        player.configure(shakaConfig(link));
        player.addEventListener('error', (ev: any) => { if (ev?.detail?.severity === 2) onFatal(ev.detail); });
        await player.load(link.url);
      } else if (link.type === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.addEventListener('error', onVideoError);
        video.src = link.url;
      } else {
        throw new Error(UNSUPPORTED_MSG);
      }
      await video.play().catch(() => { /* el navegador pide un toque para el sonido */ });
    },
    destroy: reset,
  };
}
