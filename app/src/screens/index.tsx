import { Login } from './auth/Login';
import { Register } from './auth/Register';
import { Forgot } from './auth/Forgot';
import { Reset } from './auth/Reset';

// Pantallas de relleno: cada tarea del plan reemplaza la suya.
const stub = (name: string) => () => <div className="screen glow" data-testid={`screen-${name}`} />;

export const screens = {
  Login,
  Register,
  Forgot,
  Reset,
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
