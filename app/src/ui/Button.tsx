import { useState, type ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'whatsapp';
  size?: 'md' | 'tv';
  loading?: boolean;
};

export function Button({ variant = 'primary', size = 'md', loading, className = '', children, disabled, type = 'button', ...rest }: Props) {
  const [press, setPress] = useState(false);
  const base = variant === 'secondary' ? 'btn2' : variant === 'whatsapp' ? 'btn wa' : 'btn';
  const cls = [base, size === 'tv' ? 'tvbtn' : '', press ? 'press' : '', className].filter(Boolean).join(' ');
  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || loading}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      onPointerLeave={() => setPress(false)}
      {...rest}
    >
      {loading ? <span className="spin" aria-label="Cargando" /> : children}
    </button>
  );
}
