import { EndedNotice } from './auth/EndedNotice';

// Pantallas de relleno: cada tarea del plan reemplaza la suya.
const stub = (name: string, extra?: () => JSX.Element) => () => (
  <div className="screen glow" data-testid={`screen-${name}`}>{extra?.()}</div>
);

export const screens = {
  Login: stub('entrar', () => <EndedNotice />),
  Register: stub('registro'),
  Forgot: stub('recuperar'),
  Reset: stub('restablecer'),
  Plans: stub('planes'),
  Pay: stub('pagar'),
  InReview: stub('en-revision'),
  Suspended: stub('suspendida'),
  Home: stub('inicio'),
  Categories: stub('categorias'),
  Agenda: stub('agenda'),
  Search: stub('buscar'),
  EventDetail: stub('evento'),
  Player: stub('ver'),
  Profile: stub('perfil'),
  History: stub('historial'),
  ChangePassword: stub('contrasena'),
  LinkTv: stub('vincular'),
};
