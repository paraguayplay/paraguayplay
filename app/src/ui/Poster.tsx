import type { ReactNode } from 'react';

const BY_CATEGORY: Record<string, string> = { deportes: 'a1', musica: 'a2', religiosos: 'a3', conferencias: 'a4' };

export function artFor(category: string | null | undefined): string {
  const key = (category ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (BY_CATEGORY[key]) return BY_CATEGORY[key];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % 2 === 0 ? 'a5' : 'a6';
}

export function Poster({ category, imageUrl, className = '', style, children }: { category?: string | null; imageUrl?: string | null; className?: string; style?: React.CSSProperties; children?: ReactNode }) {
  return (
    <div className={`poster ${className}`} style={style}>
      <div className={`art ${artFor(category)}`} />
      {imageUrl && <img src={imageUrl} alt="" loading="lazy" decoding="async" />}
      <div className="shade" />
      {children}
    </div>
  );
}
