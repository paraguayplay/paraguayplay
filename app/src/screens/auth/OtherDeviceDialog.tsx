import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/misc';
import { Icon } from '../../ui/Icon';

export function OtherDeviceDialog({ device, busy, onConfirm, onCancel }: { device: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog>
      <div className="warnic"><Icon name="phone" size={34} /></div>
      <h2 style={{ fontSize: 22, fontWeight: 900 }}>Tu cuenta ya está abierta</h2>
      <p className="mut" style={{ fontSize: 14.5, lineHeight: 1.5, margin: '10px 4px 20px' }}>
        Hay una sesión activa en <b style={{ color: 'var(--t)' }}>{device}</b>. Tu plan permite un dispositivo a la vez.
      </p>
      <Button onClick={onConfirm} loading={busy} style={{ marginBottom: 12 }}>Usar en este celular</Button>
      <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
      <p className="small" style={{ color: 'var(--t3)', marginTop: 14 }}>La otra sesión se cerrará en menos de un minuto.</p>
    </Dialog>
  );
}
