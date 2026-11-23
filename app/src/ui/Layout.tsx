import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

export function Screen({ id, children, bar = false, glow = true, className = '' }: { id: string; children: ReactNode; bar?: boolean; glow?: boolean; className?: string }) {
  return (
    <div className={`screen ${glow ? 'glow' : ''} ${bar ? '' : 'nobar'} ${className}`} data-testid={`screen-${id}`}>
      {glow && <div className="grain" />}
      <div className="z page-in">{children}</div>
    </div>
  );
}

export function IconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick?: () => void }) {
  return (
    <button className="back glassbox" style={{ borderRadius: 13 }} aria-label={label} onClick={onClick}>
      <Icon name={icon} />
    </button>
  );
}

export function BackBar({ title, right, to }: { title?: ReactNode; right?: ReactNode; to?: string }) {
  const nav = useNavigate();
  return (
    <div className="top" style={{ paddingTop: 14 }}>
      <IconButton icon="back" label="Volver" onClick={() => (to ? nav(to) : nav(-1))} />
      {typeof title === 'string' ? <span style={{ fontWeight: 700 }}>{title}</span> : title ?? <span />}
      {right ?? <div style={{ width: 40 }} />}
    </div>
  );
}

export function Brand({ size = 34 }: { size?: number }) {
  return (
    <div className="l">
      <img src="/logo.png" alt="" style={{ width: size }} />
      <span className="brand">PARAGUAY PLAY <b>TV</b></span>
    </div>
  );
}
