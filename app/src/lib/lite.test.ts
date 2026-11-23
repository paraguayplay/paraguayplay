import { isLite } from './lite';

test.each([
  [{ reducedMotion: true, tv: false }, true],
  [{ reducedMotion: false, cores: 2, tv: false }, true],
  [{ reducedMotion: false, memory: 2, tv: false }, true],
  [{ reducedMotion: false, tv: true }, true],
  [{ reducedMotion: false, cores: 8, memory: 8, tv: false }, false],
  [{ reducedMotion: false, tv: false }, false],
])('%#', (env, lite) => expect(isLite(env)).toBe(lite));
