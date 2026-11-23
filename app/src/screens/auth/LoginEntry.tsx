import { useState } from 'react';
import { isTvMode } from '../../lib/tv';
import { Login } from './Login';
import { TvLogin } from './TvLogin';

/** En el TV, primero el código + QR; con "Usar correo y contraseña", el formulario normal. */
export function LoginEntry() {
  const [email, setEmail] = useState(false);
  return isTvMode() && !email ? <TvLogin onUseEmail={() => setEmail(true)} /> : <Login />;
}
