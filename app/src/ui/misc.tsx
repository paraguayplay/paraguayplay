import type { ReactNode } from 'react';

export function Pill({ tone, children }: { tone: 'ok' | 'warn' | 'bad'; children: ReactNode }) {
  return <span className={`pill ${tone}`}><span className="dot" />{children}</span>;
}

export function LiveTag({ short }: { short?: boolean }) {
  return <span className="live">{short ? 'VIVO' : 'EN VIVO'}</span>;
}

export function Skeleton({ w, h, r }: { w?: number | string; h: number | string; r?: number }) {
  return <div className="skel" style={{ width: w ?? '100%', height: h, borderRadius: r }} />;
}

export function Dialog({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="modal-bg" />
      <div className="sheet glassbox" role="dialog" aria-modal="true">{children}</div>
    </>
  );
}
