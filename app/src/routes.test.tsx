import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { useSession } from './lib/session';
import { mockApi } from '../test/http';
import { mePending, meActive } from '../test/fixtures/me';

beforeEach(() => { localStorage.clear(); useSession.getState().signOut(); mockApi([]); });

test('sin sesión, el inicio manda a entrar', async () => {
  render(<MemoryRouter initialEntries={['/']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByTestId('screen-entrar')).toBeInTheDocument();
});

test('cuenta pendiente que entra al inicio va a planes', async () => {
  useSession.getState().signIn({ token: 'T', session_key: 'K', user: mePending });
  render(<MemoryRouter initialEntries={['/']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByTestId('screen-planes')).toBeInTheDocument();
});

test('cuenta activa ve el inicio', async () => {
  useSession.getState().signIn({ token: 'T', session_key: 'K', user: meActive });
  render(<MemoryRouter initialEntries={['/']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByTestId('screen-inicio')).toBeInTheDocument();
});

test('después de cerrarse por otro dispositivo, entrar muestra el aviso', async () => {
  useSession.setState({ endedReason: 'other_device' });
  render(<MemoryRouter initialEntries={['/entrar']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByText('Se cerró tu sesión porque tu cuenta se abrió en otro dispositivo.')).toBeInTheDocument();
});

test('vincular sin sesión pasa por entrar y conserva el destino', async () => {
  render(<MemoryRouter initialEntries={['/vincular?code=K7M4QZ']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByTestId('screen-entrar')).toBeInTheDocument();
});
