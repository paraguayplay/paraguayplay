/** Modo liviano: sin desenfoque de vidrio ni animaciones escalonadas en equipos lentos o TVs. */
export function isLite(env: { reducedMotion: boolean; cores?: number; memory?: number; tv: boolean }): boolean {
  return env.reducedMotion || env.tv || (env.cores !== undefined && env.cores <= 2) || (env.memory !== undefined && env.memory <= 2);
}

export function applyLite(win: Window = window) {
  const html = win.document.documentElement;
  const lite = isLite({
    reducedMotion: win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    cores: win.navigator.hardwareConcurrency || undefined,
    memory: (win.navigator as any).deviceMemory,
    tv: html.classList.contains('tv'),
  });
  html.classList.toggle('lite', lite);
}
