import { useEffect, useState } from 'react';

export const watermarkText = (id: number, email: string) => `ID ${id} · ${email.split('@')[0].slice(0, 12)}`;

/** Texto tenue con el ID del usuario que cambia de lugar cada 20 s. */
export function Watermark({ text }: { text: string }) {
  const rnd = () => ({ top: 10 + Math.random() * 70, left: 10 + Math.random() * 70 });
  const [pos, setPos] = useState(rnd);
  useEffect(() => { const t = setInterval(() => setPos(rnd()), 20_000); return () => clearInterval(t); }, []);
  return (
    <div className="wm" aria-hidden="true" style={{ top: `${pos.top}%`, left: `${pos.left}%`, color: 'rgba(255,255,255,.15)', pointerEvents: 'none', zIndex: 4, transition: 'opacity .3s' }}>
      {text}
    </div>
  );
}
