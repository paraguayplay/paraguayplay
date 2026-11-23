import { Link } from 'react-router-dom';
import { useSession } from '../lib/session';
import { Brand } from './Layout';

export function Avatar({ size }: { size?: number }) {
  const me = useSession((s) => s.me);
  const st = size ? { width: size, height: size, fontSize: size * 0.4 } : undefined;
  return <div className="avatar" style={st}>{(me?.name ?? '?').trim().charAt(0).toUpperCase()}</div>;
}

/** Logo + nombre a la izquierda, avatar (va a Mi perfil) a la derecha. */
export function AppTop({ extra }: { extra?: React.ReactNode }) {
  return (
    <div className="top" style={{ paddingTop: 14 }}>
      <Brand />
      <div className="row" style={{ gap: 10 }}>
        {extra}
        <Link to="/perfil" aria-label="Mi perfil"><Avatar /></Link>
      </div>
    </div>
  );
}

export function Steps({ at }: { at: 1 | 2 | 3 }) {
  return <div className="steps" style={{ marginTop: 20 }}>{[1, 2, 3].map((i) => <div key={i} className={i <= at ? 'on' : ''} />)}</div>;
}
