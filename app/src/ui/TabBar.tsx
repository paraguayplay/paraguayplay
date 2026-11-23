import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

const TABS: [string, IconName, string][] = [['/', 'home', 'Inicio'], ['/categorias', 'grid', 'Categorías'], ['/agenda', 'cal', 'Agenda'], ['/perfil', 'user', 'Perfil']];

export function TabBar() {
  return (
    <nav className="tabbar glassbox" style={{ position: 'fixed', background: 'rgba(20,20,26,.82)' }} aria-label="Secciones">
      {TABS.map(([to, icon, label]) => (
        <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? 'on' : '')}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <svg><use href={`#i-${icon}`} /></svg>{label}
          </div>
        </NavLink>
      ))}
    </nav>
  );
}
