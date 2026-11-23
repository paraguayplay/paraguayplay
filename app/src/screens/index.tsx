import { Login } from './auth/Login';
import { Register } from './auth/Register';
import { Forgot } from './auth/Forgot';
import { Reset } from './auth/Reset';
import { Plans } from './plans/Plans';
import { Pay } from './plans/Pay';
import { InReview } from './plans/InReview';
import { Suspended } from './plans/Suspended';

// Pantallas de relleno: cada tarea del plan reemplaza la suya.
const stub = (name: string) => () => <div className="screen glow" data-testid={`screen-${name}`} />;

export const screens = {
  Login,
  Register,
  Forgot,
  Reset,
  Plans,
  Pay,
  InReview,
  Suspended,
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
