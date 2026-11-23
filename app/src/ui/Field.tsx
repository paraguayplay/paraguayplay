import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: IconName; error?: string; trailing?: ReactNode };

export function Field({ label, icon, error, trailing, onFocus, onBlur, ...rest }: Props) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label className="lbl" htmlFor={id}>{label}</label>
      <div className={`field ${focused ? 'f' : ''}`} style={error ? { borderColor: 'var(--bad)' } : undefined}>
        {icon && <svg><use href={`#i-${icon}`} /></svg>}
        <input
          id={id}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {trailing}
      </div>
      {error && <p className="err" style={{ margin: '6px 4px 0' }}>{error}</p>}
    </div>
  );
}
