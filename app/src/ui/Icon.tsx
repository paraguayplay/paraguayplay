import sprite from './icons.svg?raw';

export type IconName =
  | 'mail' | 'lock' | 'user' | 'phone' | 'eye' | 'home' | 'grid' | 'cal' | 'tv' | 'search' | 'back' | 'chev'
  | 'play' | 'pause' | 'copy' | 'wa' | 'clock' | 'bell' | 'cast' | 'full' | 'vol' | 'refresh' | 'key' | 'out'
  | 'hist' | 'swap' | 'check' | 'alert' | 'help' | 'share';

export function Icon({ name, size, className = 'ico', style }: { name: IconName; size?: number; className?: string; style?: React.CSSProperties }) {
  const s = size ? { width: size, height: size, ...style } : style;
  return (
    <svg className={className} style={s} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}

/** Se monta una vez en la raíz: define los símbolos que usa <Icon>. */
export function IconSprite() {
  return <div style={{ display: 'none' }} dangerouslySetInnerHTML={{ __html: sprite }} />;
}
