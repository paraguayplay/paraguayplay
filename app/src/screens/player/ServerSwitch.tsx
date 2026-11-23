import type { PlayLink } from './shaka';

export function ServerSwitch({ links, idx, onPick }: { links: PlayLink[]; idx: number; onPick: (i: number) => void }) {
  return (
    <div className="srv" role="group" aria-label="Servidores">
      {links.map((l, i) => (
        <button key={i} className={`focusable ${i === idx ? 'on' : ''}`} aria-pressed={i === idx} onClick={() => onPick(i)}>{l.label}</button>
      ))}
    </div>
  );
}
