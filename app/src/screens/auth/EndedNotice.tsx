import { useSession } from '../../lib/session';
import { Icon } from '../../ui/Icon';

export const ENDED_MSG = 'Se cerró tu sesión porque tu cuenta se abrió en otro dispositivo.';

export function EndedNotice() {
  const ended = useSession((s) => s.endedReason);
  if (ended !== 'other_device') return null;
  return (
    <div className="notice warn" role="status" style={{ margin: '12px 20px 0' }}>
      <Icon name="alert" style={{ color: 'var(--warn)', flex: 'none' }} />
      <span>{ENDED_MSG}</span>
    </div>
  );
}
