import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { isTvMode } from '../lib/tv';
import { focusFirst, installSpatial } from './spatial';
import { Icon } from '../ui/Icon';
import { Avatar } from '../ui/AppTop';
import { useSession } from '../lib/session';
import { Pill } from '../ui/misc';

const ROOTS = ['/', '/entrar'];

/** En modo TV: control remoto, tecla Atrás y foco inicial en cada pantalla. */
export function TvShell() {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!isTvMode()) return;
    return installSpatial(() => {
      if (document.querySelector('[role=dialog]')) { (document.querySelector('[data-dialog-cancel]') as HTMLElement | null)?.click(); return; }
      if (ROOTS.includes(window.location.pathname)) return;
      nav(-1);
    });
  }, [nav]);
  useEffect(() => {
    if (!isTvMode()) return;
    const t = setTimeout(focusFirst, 60);
    return () => clearTimeout(t);
  }, [loc.pathname]);
  return null;
}

export function TvHints({ rows }: { rows?: boolean }) {
  return (
    <div className="tvhint" aria-hidden="true">
      {rows && <span><b>▲ ▼</b>Filas</span>}
      <span><b>◀ ▶</b>Moverse</span><span><b>OK</b>Elegir</span><span><b>↩</b>Atrás</span>
    </div>
  );
}

/** Barra superior del TV (reemplaza la barra inferior del celular). */
export function TvNav() {
  const me = useSession((s) => s.me);
  const sub = me?.subscription;
  const link = (to: string, label: string, icon?: 'home' | 'search' | 'user') => (
    <NavLink to={to} end className={({ isActive }) => (isActive ? 'on' : '')}>{icon && <Icon name={icon} size={26} />}{label}</NavLink>
  );
  return (
    <div className="tvtop">
      <div className="l"><img src="/logo.png" alt="" /><span className="brand">PARAGUAY PLAY <b>TV</b></span></div>
      <nav className="tvnav" aria-label="Secciones">
        {link('/', 'Inicio', 'home')}{link('/categorias', 'Categorías')}{link('/agenda', 'Agenda')}{link('/buscar', '', 'search')}{link('/perfil', 'Perfil', 'user')}
      </nav>
      <div className="tvuser">
        {sub?.status === 'active' && <Pill tone="ok">{`Activa · ${sub.days_left ?? 0} días`}</Pill>}
        {me?.name.split(' ')[0]}<Avatar />
      </div>
    </div>
  );
}
