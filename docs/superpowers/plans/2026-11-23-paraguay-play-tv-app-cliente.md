# PARAGUAY PLAY TV — App cliente (celular + TV + PWA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La web app (PWA) que usan los clientes en celular y TV, conectada al servidor Laravel de `backend/`, con el aspecto de las maquetas aprobadas.

**Architecture:** SPA en `app/` con React + Vite + TypeScript. Un módulo `api/` habla con `/api`, un store de sesión guarda token y `session_key`, y una función pura decide la pantalla según el estado de la cuenta. Los componentes visuales salen de `maquetas-app/style.css`. El modo TV es el mismo árbol de pantallas, con clase `tv` en `<html>`, navegación espacial y layouts propios donde la maqueta lo pide.

**Tech Stack:** React 18, Vite 6, TypeScript, React Router 6, Zustand, Shaka Player 4, `@noriginmedia/norigin-spatial-navigation`, `qrcode`, `@fontsource/inter`, `vite-plugin-pwa`, `vite-plugin-javascript-obfuscator` (solo build), Vitest + Testing Library + MSW para pruebas, Playwright (preinstalado) para capturas.

**Spec:** `docs/superpowers/specs/2026-11-23-app-cliente-design.md` (amplía `2026-11-22-app-eventos-en-vivo-design.md`). Maquetas: `docs/superpowers/specs/maquetas-app/` — `maqueta.html` + `style.css` son la referencia de estilos; cada pantalla se compara con su `.jpg`.

## Global Constraints

- Todo texto visible en español con "vos" (registrate, elegí, tenés), como en las maquetas.
- Colores: naranja `#F26A0A` / `#FF8F3A` / `#B84C04`; fondo `#09090D`; textos `#F5F5F7` / `#A9A9B6` / `#6E6E7C`; verde `#2BD47D`; amarillo `#FFC23D`; rojo `#FF4D5E`; "EN VIVO" `#E11D2E`. Letra Inter local (`@fontsource/inter`), nunca de Google.
- Animaciones solo con `transform` y `opacity`, 200–300 ms.
- La API está en el mismo origen, base `/api`. En desarrollo Vite hace proxy de `/api` a `http://127.0.0.1:8000`.
- Ninguna URL de stream en el código, en `localStorage`, en IndexedDB ni en la caché del service worker. Los enlaces de `/play` solo viven en memoria.
- `/api/me` cada **45 s** y al volver a la pestaña (`visibilitychange`).
- Fechas en `America/Asuncion` con `Intl.DateTimeFormat('es-PY', { timeZone: 'America/Asuncion', ... })`.
- Montos con el `price_label` del servidor cuando existe; si no, `formatGs(n)` → `"Gs 20.000"`.
- Mensajes de error: el `message` que manda el servidor; si no hay, "No pudimos conectar. Revisá tu internet e intentá de nuevo."
- Rutas fijadas por el servidor: `/restablecer?token=&email=` y `/vincular?code=`.
- Sin "Recordarme", sin "N viendo", sin lugar del evento (spec §3).

## Review Focus

1. **Hora del dispositivo distinta a Paraguay** (TV con zona horaria UTC o mal configurada): las horas de los eventos se muestran igual en hora de Paraguay. → Task 6, `formatEventTime` con `TZ=UTC`.
2. **Sin internet al abrir:** con catálogo en caché se muestra la caché con un aviso "Sin conexión"; sin caché, pantalla de error con **Reintentar**, nunca una pantalla en blanco. → Task 6.
3. **Catálogo vacío** (el dueño todavía no cargó eventos): "Todavía no hay eventos. Volvé pronto." en lugar de filas vacías. → Task 6.
4. **Sesión cerrada en medio del video** (`/me` da 401): el video se detiene y se libera; no sigue sonando detrás del aviso. → Task 7.
5. **Demasiados intentos de login** (`429`): "Demasiados intentos. Esperá un minuto e intentá de nuevo.", y el botón no queda trabado en "cargando". → Task 4.

---

## Estructura de archivos

```
app/
  index.html, vite.config.ts, tsconfig.json, package.json, .env.example
  public/            logo.png, íconos PWA generados, robots.txt
  src/
    main.tsx, App.tsx, routes.tsx
    styles/          tokens.css, base.css, components.css (portados de maqueta), tv.css, lite.css
    ui/              Button.tsx, Glass.tsx, Field.tsx, Icon.tsx (+ icons.svg sprite), Pill.tsx, LiveTag.tsx,
                     Poster.tsx, Skeleton.tsx, Dialog.tsx
    lib/             api.ts, session.ts, device.ts, format.ts, bankInfo.ts, crypto.ts, destination.ts,
                     keys.ts, lite.ts, protect.ts, catalogCache.ts
    hooks/           useMe.ts, useCatalog.ts
    screens/         auth/ (Login, Register, Forgot, Reset, OtherDeviceDialog, TvLogin)
                     plans/ (Plans, Pay, InReview, Suspended)
                     catalog/ (Home, Categories, Agenda, EventDetail, Search)
                     player/ (Player, shaka.ts, Watermark.tsx, ServerSwitch.tsx)
                     profile/ (Profile, History, ChangePassword, LinkTv)
    tv/              spatial.ts, TvShell.tsx (barra de ayuda del control), useBackKey.ts
  test/              setup.ts, msw/handlers.ts, fixtures/ (me-*.json, catalog.json, play.json)
  e2e/               screens.spec.ts (capturas), mock-server.ts
```

---

### Task 1: Proyecto, estilos base y componentes visuales

**Files:**
- Create: `app/package.json`, `app/vite.config.ts`, `app/tsconfig.json`, `app/index.html`, `app/src/main.tsx`, `app/src/App.tsx`, `app/src/styles/{tokens,base,components}.css`, `app/src/ui/*.tsx`, `app/src/ui/icons.svg`, `app/public/logo.png` (copia de `assets/logo.png`), `app/test/setup.ts`, `app/src/ui/ui.test.tsx`
- Modify: `.gitignore` (agregar `app/node_modules/`)

**Interfaces:**
- Produces: componentes `<Button variant="primary"|"secondary"|"whatsapp" size?="md"|"tv">`, `<Glass>`, `<Field icon label error focused?>`, `<Icon name>` (nombres = ids de la maqueta sin `i-`: `mail, lock, user, phone, eye, home, grid, cal, tv, search, back, chev, play, pause, copy, wa, clock, cast, full, vol, refresh, key, out, hist, swap, check, alert, help, share`), `<Pill tone="ok"|"warn"|"bad">`, `<LiveTag>`, `<Poster category imageUrl? children>` (fondo `a1..a6` según categoría si no hay imagen: Deportes→a1, Música→a2, Religiosos→a3, Conferencias→a4, otras→a5/a6 por hash), `<Skeleton>`, `<Dialog>`.
- Scripts: `npm run dev`, `npm run build`, `npm test` (Vitest), `npm run lint` (`tsc --noEmit`).

- [ ] **Step 1:** `npm create vite@latest app -- --template react-ts`, instalar dependencias del Tech Stack, configurar Vitest (`jsdom`, `test/setup.ts` con `@testing-library/jest-dom`) y el proxy `/api` → `http://127.0.0.1:8000`.
- [ ] **Step 2: Prueba que falla** — `ui.test.tsx`: `Button` primary renderiza con clase `btn`; al `pointerdown` agrega `press` y al `pointerup` la quita; `Poster` sin `imageUrl` y `category="Música"` tiene clase `a2`; `Icon name="play"` renderiza `<use href="#i-play">`.
- [ ] **Step 3:** `npm test` → FAIL.
- [ ] **Step 4:** Portar `maquetas-app/style.css` a `tokens.css` (variables), `base.css` (fondo con glow + grain) y `components.css` (btn, btn2, wa, field, glassbox, live, soon, chip, poster a1–a6, pill, tabbar, skel). Los estilos sueltos del `<style>` de `maqueta.html` van a cada pantalla. Sprite de íconos copiado del `<defs>` de la maqueta. Animaciones: pulso de `.live::before` (opacity 1→.4, 1.2 s), aparición escalonada `.stagger > *` (opacity+translateY, 40 ms por ítem), shimmer de `.skel` con `transform`.
- [ ] **Step 5:** `npm test` y `npm run build` → PASS.
- [ ] **Step 6: Commit** — `feat(app): proyecto React y componentes visuales`.

---

### Task 2: Cliente de API, sesión y dispositivo

**Files:**
- Create: `app/src/lib/{api,session,device,format}.ts`, `app/test/msw/handlers.ts`, `app/src/lib/lib.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; code?: string; data?: unknown }`
  - `api<T>(path: string, opts?: { method?: string; body?: unknown; auth?: boolean }): Promise<T>` — agrega `Accept: application/json`, `Authorization: Bearer <token>` si hay; `204` → `undefined`; error → `ApiError` con `message` del servidor o el texto de red de Global Constraints; `429` sin `message` → "Demasiados intentos. Esperá un minuto e intentá de nuevo."; `401` con sesión guardada → llama `session.expire('other_device')` y lanza.
  - `useSession` (Zustand, persistido en `localStorage` clave `ppt.session`): `{ token: string|null; sessionKey: string|null; me: Me|null; endedReason: 'other_device'|null; signIn(r: AuthResponse): void; setMe(me: Me): void; expire(reason): void; signOut(): void }`. `signOut` también borra `ppt.catalog`.
  - Tipos `Me`, `Plan`, `PlanRequest`, `CatalogEvent`, `Catalog`, `AuthResponse {token, session_key, user: Me}` exactamente como `MeResource`, `PlanResource`, `PlanRequestResource`, `CatalogEventResource` del backend (ver `backend/app/Http/Resources/`).
  - `deviceName(ua = navigator.userAgent): string` → `"Android · Chrome"`, `"iPhone · Safari"`, `"iPad · Safari"`, `"Smart TV · Samsung"` (Tizen), `"Smart TV · LG"` (Web0S), `"Android TV"` (`Android` + `TV`/`AFT`), `"Computadora · Chrome"`, etc.
  - `formatGs(n: number): string` → `"Gs 20.000"`; `formatEventTime(iso: string): string` → `"Sáb 28 · 20:00"`; `formatDate(iso)` → `"10 de diciembre"`.

- [ ] **Step 1: Prueba que falla** — `api` agrega el Bearer; `422` devuelve `ApiError` con `message` del cuerpo; `429` sin cuerpo da el texto fijo; `401` con token llama `expire('other_device')`; fallo de red da el texto de red; `deviceName` con UAs reales de Tizen, webOS, Fire TV (`AFTMM`), iPhone y Android Chrome; `formatGs(240000)` = `"Gs 240.000"`; `formatEventTime('2026-11-28T23:00:00Z')` = `"Sáb 28 · 20:00"` con `process.env.TZ='UTC'`.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implementar. **Step 4:** → PASS.
- [ ] **Step 5: Commit** — `feat(app): cliente de API y sesión`.

---

### Task 3: Elegir pantalla por estado, rutas y `/me` periódico

**Files:**
- Create: `app/src/lib/destination.ts`, `app/src/hooks/useMe.ts`, `app/src/routes.tsx`, `app/src/lib/destination.test.ts`, `app/src/hooks/useMe.test.tsx`
- Modify: `app/src/App.tsx`

**Interfaces:**
- Consumes: `api`, `useSession`, `Me` (Task 2).
- Produces:
  - `destinationFor(me: Me | null): '/entrar' | '/planes' | '/en-revision' | '/suspendida' | '/'` — reglas exactas de spec §6.2 (`expired` sin solicitud → `/planes`).
  - `<RequireStatus allow={['active']}>` — si `destinationFor(me)` no está permitido, redirige ahí. Rutas públicas: `/entrar`, `/registro`, `/recuperar`, `/restablecer`. `/vincular` requiere sesión (sin sesión → `/entrar?next=/vincular?code=...`).
  - `useMe()` — pide `/api/me` al montar, cada 45 000 ms y en `visibilitychange` visible; guarda con `setMe`.
  - Aviso global: si `endedReason === 'other_device'`, `/entrar` muestra arriba "Se cerró tu sesión porque tu cuenta se abrió en otro dispositivo."

- [ ] **Step 1: Prueba que falla** — `destinationFor`: null → `/entrar`; pending sin solicitud → `/planes`; pending con solicitud → `/en-revision`; expired con solicitud → `/en-revision`; expired → `/planes`; suspended → `/suspendida`; active → `/`. `useMe` con timers falsos: 1 llamada al montar, 2 a los 45 s; un 401 deja `token` en null y `endedReason` en `other_device`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar (rutas con pantallas vacías de relleno que las tareas siguientes reemplazan). **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): rutas según el estado de la cuenta`.

---

### Task 4: Entrar, crear cuenta y recuperar contraseña (celular)

**Files:**
- Create: `app/src/screens/auth/{Login,Register,Forgot,Reset,OtherDeviceDialog}.tsx`, `app/src/screens/auth/auth.test.tsx`

**Interfaces:**
- Consumes: `api`, `useSession.signIn`, `deviceName`, `destinationFor`, componentes de Task 1.
- Login: `POST /auth/login {email, password, device_name}`; `409 other_device_active` → `<OtherDeviceDialog device>` (maqueta cel-12: "Tu cuenta ya está abierta", "Usar en este celular" / "Cancelar") → reintenta con `force: true`. Éxito → `signIn` y navegar a `destinationFor(user)`.
- Registro: `POST /auth/register {name, email, phone, password, password_confirmation, device_name}` (la maqueta muestra un solo campo de contraseña: `password_confirmation` = `password`). Casilla de términos obligatoria.
- Olvidé: `POST /auth/forgot-password {email}` → muestra la caja verde con el `message` del servidor.
- Restablecer: `POST /auth/reset-password {email, token, password, password_confirmation}` → "Listo, ya podés entrar con tu nueva contraseña." y botón a `/entrar`; `invalid_reset_token` → mensaje del servidor + enlace a `/recuperar`.

- [ ] **Step 1: Prueba que falla** (MSW) — login correcto navega a `/planes` con un `Me` pending; 409 abre el diálogo con "Smart TV · Living" y "Usar en este celular" manda `force: true`; 422 muestra "Correo o contraseña incorrectos."; **429 muestra el texto de demasiados intentos y el botón vuelve a estar habilitado**; registro manda `password_confirmation` igual a `password` y el `device_name`; olvidé muestra el mensaje del servidor; restablecer con token inválido muestra el enlace a `/recuperar`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar copiando la composición de cel-01/02/03. **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): entrar, registrarse y recuperar contraseña`.

---

### Task 5: Planes, pago, en revisión y suspendida

**Files:**
- Create: `app/src/lib/bankInfo.ts`, `app/src/screens/plans/{Plans,Pay,InReview,Suspended}.tsx`, `app/src/screens/plans/plans.test.tsx`, `app/src/lib/bankInfo.test.ts`

**Interfaces:**
- Consumes: `api`, `useSession`, componentes, `formatGs`.
- Produces: `parseBankInfo(text: string): Array<{ key: string; value: string } | { text: string }>` — línea `Clave: valor` → fila (se corta en el primer `:`); líneas vacías se ignoran; el resto → texto.
- `/planes`: `GET /plans`; preselecciona el plan con `duration_days` 30 (o el del medio) con la insignia "MÁS ELEGIDO"; título "Elegí tu plan" o, si `status==='expired'`, "Tu plan venció". Botón "Continuar con {nombre}" → `POST /plan-requests {plan_id}` → guarda `{id, whatsapp_url}` en `sessionStorage` `ppt.lastRequest` → `/pagar/:id`.
- `/pagar/:id`: monto, filas de `parseBankInfo(settings.bank_info)` con botón copiar (`navigator.clipboard.writeText`, aviso "Copiado"), botón "Enviar comprobante por WhatsApp" que abre `whatsapp_url`. Si `ppt.lastRequest` no tiene ese id (recarga, otro dispositivo), arma `https://wa.me/{support_whatsapp}?text=` con el mismo texto que el backend (`PlanRequestController::whatsappUrl`).
- `/en-revision`: datos de `me.pending_request`, "Reenviar comprobante" (mismo enlace) y "Cambiar de plan" → `/planes`.
- `/suspendida`: "Tu cuenta está suspendida" + botón WhatsApp de soporte (`https://wa.me/{support_whatsapp}`) + Cerrar sesión.
- En TV (`html.tv`), `/pagar/:id` muestra el QR del enlace de WhatsApp (librería `qrcode`, 320 px) a la derecha y los datos del banco a la izquierda, con el texto "Escaneá con tu celular para mandar el comprobante".

- [ ] **Step 1: Prueba que falla** — `parseBankInfo("Banco: Continental\nCuenta: 1234\n\nGracias")` → 2 filas + 1 texto; `"Alias: a:b"` → valor `"a:b"`. Planes: elegir Anual hace `POST` con su id y navega a `/pagar/9`; expired muestra "Tu plan venció"; Pago: el botón de WhatsApp usa el `whatsapp_url` devuelto; sin `ppt.lastRequest` arma el enlace con `Solicitud N.º 9`; `403 account_suspended` en el POST navega a `/suspendida`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar según cel-04/05/06 y tv-05. **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): planes y pago por transferencia`.

---

### Task 6: Catálogo — inicio, categorías, agenda, buscar y detalle

**Files:**
- Create: `app/src/lib/catalogCache.ts`, `app/src/hooks/useCatalog.ts`, `app/src/screens/catalog/{Home,Categories,Agenda,EventDetail,Search}.tsx`, `app/src/screens/catalog/catalog.test.tsx`, `app/src/lib/catalogCache.test.ts`

**Interfaces:**
- Consumes: `api`, `Catalog`, `Poster`, `LiveTag`, `formatEventTime`.
- Produces:
  - `useCatalog(): { data: Catalog | null; loading: boolean; offline: boolean; error: string | null; reload(): void }` — lee `localStorage` `ppt.catalog` al instante y luego pide `/api/catalog`; si la red falla con caché → `offline: true`; sin caché → `error`. `403 subscription_inactive` → `/planes`.
  - `pickFeatured(c: Catalog): CatalogEvent | null` — primer `live` con `is_featured`, si no el primer `live`, si no el primer `upcoming`.
  - `findEvent(c: Catalog, id: number): CatalogEvent | undefined` (busca en live, upcoming y categories).
  - `searchEvents(c: Catalog, q: string): CatalogEvent[]` — sin tildes ni mayúsculas, por título y categoría, sin repetidos.
- Pantallas: Inicio (cel-07 / tv-02): destacado, chips de categoría (filtran las filas), fila "EN VIVO Ahora", lista "Próximos". Categorías: una fila por `categories[]`. Agenda: `upcoming` agrupado por día. Detalle (cel-08): "Ver en vivo" → `/ver/:id` (deshabilitado con el texto "Empieza el Sáb 28 · 20:00" si aún no empezó); "Enviar al TV" se resuelve en Task 7. Barra inferior (Inicio, Categorías, Agenda, Perfil) en celular; arriba en TV.
- Estados: esqueletos mientras `loading` sin datos; aviso "Sin conexión · mostrando lo último guardado" si `offline`; error con botón **Reintentar**; catálogo vacío → "Todavía no hay eventos. Volvé pronto."

- [ ] **Step 1: Prueba que falla** — `pickFeatured` en los tres casos; `searchEvents(c, 'musica')` encuentra la categoría "Música"; `formatEventTime` con `TZ=UTC` (Review Focus 1); con caché y red caída se muestra la caché y el aviso de sin conexión; sin caché y red caída se muestra **Reintentar** y al tocarlo vuelve a pedir; catálogo vacío muestra el texto; la caché guardada **no contiene** ninguna clave `url`.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): catálogo de eventos`.

---

### Task 7: Reproductor

**Files:**
- Create: `app/src/lib/crypto.ts`, `app/src/screens/player/{Player,Watermark,ServerSwitch}.tsx`, `app/src/screens/player/shaka.ts`, `app/test/fixtures/play.json`, `app/src/lib/crypto.test.ts`, `app/src/screens/player/player.test.tsx`

**Interfaces:**
- Consumes: `api`, `useSession` (`sessionKey`, `me`, `token`), `findEvent`.
- Produces:
  - `decryptPlay(payloadB64: string, ivB64: string, sessionKeyB64: string): Promise<{ links: PlayLink[] }>` — WebCrypto `AES-GCM`, IV 12 bytes, etiqueta de 128 bits al final del texto cifrado (formato de `PlayPayloadCipher`).
  - `type PlayLink = { label: string; type: 'hls'|'dash'|'web'; url: string; drm: { type: 'clearkey'|'widevine'|null; clearkeys: Record<string,string>|null; license_url: string|null }; headers: Record<string,string>|null }`
  - `shakaConfig(link: PlayLink): object` — clearkey → `{ drm: { clearKeys: link.drm.clearkeys } }`; widevine → `{ drm: { servers: { 'com.widevine.alpha': license_url } } }`; sin DRM → `{}`.
  - `canUseShaka(): boolean` (`shaka.Player.isBrowserSupported()`); si es falso y el tipo es `hls`, `video.src = url` (HLS nativo de Safari); `dash` sin soporte → error "Este servidor no funciona en este dispositivo".
- `/ver/:id`: pide `/play`, descifra, reproduce `links[0]`. Error fatal de Shaka o del `<video>` → panel "No se pudo cargar este servidor" + **Probar {siguiente.label}**. `ServerSwitch` muestra todos los `label`. `web` → `<iframe allow="autoplay; fullscreen">` + botón "Abrir en el navegador"; en TV, mensaje "Este servidor no funciona en el televisor" + pasar al siguiente.
- `Watermark`: texto `ID {me.id} · {me.email antes de @, máx. 12}` a opacidad 0.15, cambia de lugar (top/left al azar entre 10 % y 80 %) cada 20 000 ms.
- "Enviar al TV": solo si `'remote' in HTMLMediaElement.prototype` y `video.remote.watchAvailability` reporta disponible → `video.remote.prompt()`. Se usa en el reproductor y en el detalle (el detalle abre el reproductor y lanza el prompt).
- Al desmontar o si `token` pasa a null o `me.subscription.status !== 'active'`: `player.destroy()`, `video.removeAttribute('src')`, `video.load()`, y se muestra el aviso que corresponda.

- [ ] **Step 1: Generar el vector de prueba** — desde `backend/`: `php -r` que haga `require 'vendor/autoload.php'`, use `PlayPayloadCipher::encrypt(['links'=>[['label'=>'Servidor 1 HD','type'=>'hls','url'=>'https://origen.example/live/index.m3u8','drm'=>['type'=>null,'clearkeys'=>null,'license_url'=>null],'headers'=>null]]], $key)` con `$key = str_repeat("k", 32)` e imprima `{payload, iv, session_key: base64($key)}` → guardar en `app/test/fixtures/play.json`.
- [ ] **Step 2: Prueba que falla** — `decryptPlay` con el fixture devuelve la URL y el label; con la clave cambiada lanza; `shakaConfig` para clearkey y widevine; Player (Shaka simulado con `vi.mock('./shaka')`): un error en el primer servidor muestra "Probar Servidor 2" y al tocarlo carga el segundo; la marca de agua muestra `ID 48213 · juan.benitez`; **con `useSession.expire('other_device')` durante la reproducción se llama `destroy()` y el `<video>` queda sin `src`** (Review Focus 4).
- [ ] **Step 3:** FAIL. **Step 4:** Implementar según cel-09 y tv-04 (horizontal en celular: pantalla completa + `screen.orientation.lock('landscape')` cuando exista, ignorando el error). **Step 5:** PASS.
- [ ] **Step 6: Commit** — `feat(app): reproductor con enlaces cifrados y cambio de servidor`.

---

### Task 8: Mi perfil, historial, contraseña y vincular TV (celular)

**Files:**
- Create: `app/src/screens/profile/{Profile,History,ChangePassword,LinkTv}.tsx`, `app/src/screens/profile/profile.test.tsx`

**Interfaces:**
- Consumes: `api`, `useSession`, `formatDate`, `formatGs`.
- Perfil (cel-10 / tv-06): anillo con `days_left` (proporción `days_left / plan.duration_days`), `Pill` por estado (Activa / En revisión / Vencida / Pendiente), "Vence el {formatDate}", **Renovar** y **Cambiar de plan** → `/planes`; menú: Historial, Vincular un televisor, Cambiar contraseña, Ayuda y soporte (muestra `help_text` + WhatsApp), Cerrar sesión (`POST /auth/logout`, luego `signOut`, aunque el POST falle).
- Historial: `GET /plan-requests` → lista con plan, monto, estado (Pendiente / Aprobada / Rechazada / Cancelada), fecha y `note` si hay.
- Contraseña: `PUT /me/password {current_password, password, password_confirmation}` → "Contraseña actualizada".
- Vincular (cel-11): 6 casillas, código desde `?code=` (sin guion, mayúsculas, solo `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`); muestra el aviso amarillo de un dispositivo; `POST /auth/tv-code/{code}/confirm` → pantalla "Listo. Tu TV ya está conectado." con el `message` del servidor y botón "Entrar de nuevo en este celular" que hace `signOut` y va a `/entrar`. `410` → "El código venció. Mirá el código nuevo en el TV."

- [ ] **Step 1: Prueba que falla** — perfil activo muestra "18" y "Vence el 10 de diciembre"; cerrar sesión limpia la sesión aunque el POST dé 500; vincular con `?code=k7m4qz` muestra `K7M-4QZ` y confirma `K7M4QZ`; 410 muestra el texto de código vencido; historial muestra "Rechazada" y la nota.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): mi perfil y vincular televisor`.

---

### Task 9: Modo TV — detección, control remoto y entrar con código

**Files:**
- Create: `app/src/lib/keys.ts`, `app/src/tv/{spatial.ts,TvShell.tsx,useBackKey.ts}`, `app/src/screens/auth/TvLogin.tsx`, `app/src/styles/tv.css`, `app/src/lib/keys.test.ts`, `app/src/screens/auth/tvlogin.test.tsx`
- Modify: `app/src/lib/device.ts` (agregar `isTv`), `app/src/main.tsx`, pantallas que necesiten variante TV (Home, Plans, Pay, Profile, Player)

**Interfaces:**
- Produces:
  - `isTv(ua: string, search: string, stored: string|null): boolean` — `?modo=tv` / `?modo=celular` gana y se guarda en `localStorage` `ppt.modo`; si no, el guardado; si no, UA con `Android TV|GoogleTV|AFT|Tizen|Web0S|webOS|SMART-TV|SmartTV|BRAVIA|HbbTV|CrKey|Android.*TV`.
  - `keyAction(e: { key: string; keyCode: number }): 'back'|'up'|'down'|'left'|'right'|'ok'|null` — back: `Escape`, `Backspace` (si el foco no está en un input), `GoBack`, `BrowserBack`, keyCode `10009` (Samsung) y `461` (LG).
  - `useBackKey()` — en `back`: `navigate(-1)` salvo en `/` y `/entrar` (no hace nada). En `/ver/:id` sale del reproductor.
  - `spatial.ts`: `init()` de Norigin con `shouldFocusDOMNode: true`; helpers `useFocusableCard(id)` y `FocusRow` que **recuerda el último índice** de la fila (`saveLastFocusedChild`).
  - `TvShell`: barra de ayuda (◀ ▶ Moverse · OK Elegir · ↩ Atrás) abajo a la derecha y navegación superior (Inicio, Categorías, Agenda, buscar, Perfil).
  - `TvLogin` (tv-01): `POST /auth/tv-code {device_name}` → muestra `code` como `XXX-XXX` y QR de `qr_url`; consulta `GET /auth/tv-code/{code}` cada 3000 ms; `approved` → `signIn({token, session_key, user})`; `410` → pide un código nuevo solo; botón enfocado "Usar correo y contraseña" → Login normal.
- `tv.css`: medidas de spec §6.9 (base 24 px, márgenes 96 px), clase de foco `.tvf` de la maqueta, `html.tv` escala con `font-size: calc(100vw / 80)` para que 1280 × 720 quede proporcional.

- [ ] **Step 1: Prueba que falla** — `isTv` con UA de Tizen, webOS, Fire TV y Chrome de escritorio; `?modo=celular` gana sobre UA de TV; `keyAction` para 10009, 461, Escape y Backspace dentro de un input (→ null); TvLogin con timers falsos: muestra `K7M-4QZ`, consulta a los 3 s, con `approved` guarda el token; **con 410 pide un código nuevo** (Review Focus del spec: renovación sola).
- [ ] **Step 2:** FAIL. **Step 3:** Implementar y adaptar las pantallas a tv-02 … tv-06. **Step 4:** PASS.
- [ ] **Step 5: Commit** — `feat(app): modo TV con control remoto y entrada por código`.

---

### Task 10: Protección, modo liviano y PWA

**Files:**
- Create: `app/src/lib/{protect,lite}.ts`, `app/src/styles/lite.css`, `app/src/lib/protect.test.ts`, `app/src/lib/lite.test.ts`, íconos PWA en `app/public/icons/` (192, 512, maskable 512, banner TV 320×180) generados desde `assets/logo.png`
- Modify: `app/vite.config.ts`, `app/src/main.tsx`

**Interfaces:**
- `installProtection(doc = document): () => void` — bloquea `contextmenu` y las teclas F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U (`preventDefault`). Solo en producción (`import.meta.env.PROD`).
- `isLite(env: { reducedMotion: boolean; cores?: number; memory?: number; tv: boolean }): boolean` — `true` si `reducedMotion`, `cores <= 2`, `memory <= 2` o `tv`. Agrega clase `lite` a `<html>`; `lite.css` quita `backdrop-filter`, usa fondo `rgba(24,24,30,.92)`, quita `.stagger` y reduce los glow a uno.
- PWA (`vite-plugin-pwa`, `registerType: 'autoUpdate'`): nombre "PARAGUAY PLAY TV", `short_name` "PY Play TV", `theme_color` `#09090D`, `background_color` `#09090D`, `display` `standalone`; precache solo de la app; `navigateFallbackDenylist: [/^\/api\//]`; runtime cache **solo** para imágenes `/storage/events/*` (CacheFirst, 7 días, 60 entradas). Nada de `/api`.
- Build de producción con `vite-plugin-javascript-obfuscator` (opciones moderadas: `compact`, `stringArray`, sin `selfDefending` ni `debugProtection` para no romper TVs viejos), `build.target: ['es2019']` y sin sourcemaps.

- [ ] **Step 1: Prueba que falla** — `installProtection`: `keydown` F12 y Ctrl+Shift+I quedan con `defaultPrevented`, `contextmenu` también; Ctrl+C no. `isLite` en los cuatro casos.
- [ ] **Step 2:** FAIL. **Step 3:** Implementar. **Step 4:** PASS.
- [ ] **Step 5: Verificación del build** — `npm run build`; `grep -rE "m3u8|\.mpd" dist/` → sin resultados; `grep -o "api/[a-z/{}*]*" dist/sw.js` → no aparece `/api` como ruta cacheada; no hay `.map` en `dist/`.
- [ ] **Step 6: Commit** — `feat(app): protección, modo liviano y PWA`.

---

### Task 11: Revisión visual, flujo completo y despliegue

**Files:**
- Create: `app/e2e/mock-server.ts`, `app/e2e/screens.spec.ts`, `app/playwright.config.ts`, `app/deploy/.htaccess`, `app/README.md`
- Modify: `backend/deploy/README-hostinger.md` (sección "Subir la app")

**Interfaces:**
- `mock-server.ts`: servidor Node mínimo que sirve `dist/` y responde `/api/*` con los fixtures de `app/test/fixtures/` (usuario activo, pendiente, en revisión, vencido; catálogo con los eventos de las maquetas; `/play` cifrado con el fixture de Task 7 y un HLS público de prueba).
- `screens.spec.ts`: recorre las 18 pantallas de las maquetas en 390 × 844 (`deviceScaleFactor: 1`) y 1920 × 1080 con `?modo=tv`, guarda capturas en `app/e2e/out/` con los mismos nombres que `maquetas-app/*.jpg`, y además prueba el flujo: entrar → planes → pagar → (cambiar fixture a activo) → inicio → evento → reproductor con marca de agua → perfil → cerrar sesión. En TV: solo con `ArrowRight`/`ArrowDown`/`Enter`/`Escape` se llega de inicio al reproductor y se vuelve.
- `app/deploy/.htaccess` para `public_html`: no tocar `/api/` ni `/storage/`; archivos que existen se sirven; lo demás → `index.html`. `index.html` y `sw.js` con `Cache-Control: no-cache`; `assets/*` con caché de 1 año.

- [ ] **Step 1:** Escribir `mock-server.ts` y `screens.spec.ts`. Correr: `npm run build && npx playwright test --trace off` → PASS.
- [ ] **Step 2:** Comparar cada captura de `app/e2e/out/` con su maqueta (mirar las dos imágenes lado a lado). Corregir diferencias de layout, tamaños, colores o textos hasta que coincidan (salvo lo quitado en spec §3).
- [ ] **Step 3:** Prueba manual contra el backend real: `php artisan serve` + `npm run dev`, usuario creado con `php artisan ppt:create-admin` y uno normal activado por la API de admin; reproducir un enlace HLS público con proxy activado.
- [ ] **Step 4:** `app/README.md` (cómo correr, probar y compilar) y la sección "Subir la app" en la guía de Hostinger (`npm ci && npm run build`, subir `dist/*` + `deploy/.htaccess` a `public_html`, sin pisar `public_html/api` ni `public_html/storage`; `FRONTEND_URL` del backend = el dominio).
- [ ] **Step 5: Commit** — `test(app): capturas, flujo completo y guía de despliegue`.
