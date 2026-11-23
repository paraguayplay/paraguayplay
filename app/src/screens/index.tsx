import { Login } from './auth/Login';
import { Register } from './auth/Register';
import { Forgot } from './auth/Forgot';
import { Reset } from './auth/Reset';
import { Plans } from './plans/Plans';
import { Pay } from './plans/Pay';
import { InReview } from './plans/InReview';
import { Suspended } from './plans/Suspended';
import { Home } from './catalog/Home';
import { Categories } from './catalog/Categories';
import { Agenda } from './catalog/Agenda';
import { Search } from './catalog/Search';
import { EventDetail } from './catalog/EventDetail';

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
  Home,
  Categories,
  Agenda,
  Search,
  EventDetail,
  Player: stub('ver'),
  Profile: stub('perfil'),
  History: stub('historial'),
  ChangePassword: stub('contrasena'),
  LinkTv: stub('vincular'),
};
