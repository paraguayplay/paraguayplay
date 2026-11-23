# PARAGUAY PLAY TV — App (celular + TV)

Web app (PWA) que usan los clientes. Detecta si está en un celular o en un televisor.
Diseño: `docs/superpowers/specs/2026-11-23-app-cliente-design.md` · Maquetas: `docs/superpowers/specs/maquetas-app/`.

## Desarrollo

```bash
cd backend && php artisan serve        # API en http://127.0.0.1:8000
cd app && npm install && npm run dev    # app en http://localhost:5173 (manda /api al Laravel local)
```

Modo TV en la computadora: abrir `http://localhost:5173/?modo=tv` (vuelve con `?modo=celular`). En el TV se maneja con flechas, Enter y Escape.

## Pruebas

```bash
npm test             # pruebas automáticas (Vitest)
npm run lint         # tipos
npm run build && node e2e/mock-server.mjs 4173 & node e2e/screens.mjs
                     # capturas de las 18 pantallas en e2e/out/ + recorrido con el control
```

## Publicar

`npm run build` genera `dist/` (minificado y ofuscado, sin mapas de código). Cómo subirlo a Hostinger: `backend/deploy/README-hostinger.md`, sección 5b.

## Notas

- Los enlaces de los streams nunca se guardan: llegan cifrados en `/api/events/{id}/play` y se descifran en memoria.
- El service worker solo guarda la app y las imágenes de eventos; nunca `/api`.
- En TVs y equipos lentos se activa el modo liviano (sin desenfoque de vidrio).
