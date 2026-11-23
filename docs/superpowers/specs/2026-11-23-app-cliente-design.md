# PARAGUAY PLAY TV — App cliente (celular + TV) — Diseño

Fecha: 2026-11-23
Estado: maquetas aprobadas por el dueño (2026-11-23)
Diseño general: `2026-11-22-app-eventos-en-vivo-design.md` (este documento lo amplía para la parte 2)
Servidor: ya hecho (`backend/`, plan `2026-11-22-paraguay-play-tv-servidor.md`)
Maquetas: `maquetas-app/` (imágenes `.jpg` y la maqueta `maqueta.html` + `style.css`, que sirven de referencia de estilos)

## 1. Intención

La app que usan los clientes para ver los eventos, desde el celular (Android, iPhone, iPad) y desde cualquier televisor.
Es **una sola web app (PWA)** que detecta si está en un celular o en un TV y cambia de modo. Más adelante (plan 4) la
misma app se empaqueta como APK con Capacitor; el panel de administración es el plan 3. Ninguno de los dos entra aquí.

Tiene que sentirse **premium**: oscura, con brillos naranjas, vidrio y botones con relieve, como en las maquetas aprobadas.
En el TV tiene que poder usarse entera con el control remoto.

## 2. Objetivos

- Todas las pantallas de las maquetas, conectadas al servidor real.
- Elegir la pantalla según el estado de la cuenta: pendiente, en revisión, activa, vencida o suspendida.
- Reproducir HLS, DASH (con ClearKey o Widevine) y páginas web, con cambio de servidor.
- Respetar la regla de un dispositivo a la vez y sacar al usuario en menos de 1 minuto si entra en otro.
- Modo TV de "10 pies" con navegación por flechas, OK y Atrás.
- Instalable como PWA, con el catálogo disponible al instante desde la caché.

## 3. Lo que no se hará en esta parte

- Panel de administración (plan 3) y APK (plan 4).
- **Recordarme** (la campana de las maquetas): el servidor no tiene recordatorios. Se quita el botón. *(decisión del constructor)*
- **"2.340 viendo"** y el **lugar** del evento: el servidor no tiene esos datos. Se quitan; el lugar, si hace falta, va en la descripción. *(decisión del constructor)*
- Cabeceras `Referer` / `User-Agent` de los enlaces: un navegador no deja ponerlas. En la web se ignoran; las usará el APK.

## 4. Anti-objetivos

- Que en el TV haya algo que no se alcance con las flechas, o que Atrás haga algo inesperado.
- Que el catálogo, el código o el almacenamiento local muestren URLs de streams.
- Que en un TV Box barato las animaciones vayan a tirones.

## 5. Enfoques considerados

| Enfoque | Ventajas | Desventajas |
|---|---|---|
| **React + Vite + TypeScript, PWA** (elegido en el diseño general) | Un código para celular, TV y APK. Ecosistema para Shaka y navegación espacial. Archivos estáticos que van a `public_html`. | El JS pesa algo más que una web sin framework. |
| Flutter web | Un mismo código también para apps nativas | Pesado de cargar en TVs, peor accesibilidad, Shaka/DRM más difícil. |
| HTML + JS sin framework | Lo más liviano | Mucho trabajo a mano para rutas, estado y foco del TV; más difícil de mantener. |

Se sigue con **React + Vite + TypeScript**, como ya estaba decidido.

## 6. Diseño

### 6.1 Pantallas y rutas

| Ruta | Celular | TV | Maqueta |
|---|---|---|---|
| `/entrar` | correo y contraseña | código + QR, con "Usar correo y contraseña" | cel-01, tv-01 |
| `/registro` | crear cuenta | igual, en grande | cel-02 |
| `/recuperar` | pedir enlace por correo | — (se hace desde el celular) | cel-03 |
| `/restablecer?token&email` | nueva contraseña (enlace del correo, fijado por el servidor) | — | estilo de cel-03 |
| `/planes` | elegir plan | elegir plan | cel-04, tv-05 |
| `/pagar/:solicitud` | datos del banco + WhatsApp | datos del banco + **QR del enlace de WhatsApp** | cel-05 |
| `/en-revision` | solicitud en revisión | igual | cel-06 |
| `/` | inicio | inicio | cel-07, tv-02, tv-03 |
| `/categorias`, `/agenda` | lista por categoría / próximos por día | filas | estilo de cel-07 |
| `/evento/:id` | detalle | detalle (o directo al reproductor desde la fila) | cel-08 |
| `/ver/:id` | reproductor (horizontal) | reproductor | cel-09, tv-04 |
| `/perfil` (+ historial, contraseña) | Mi perfil | Mi perfil | cel-10, tv-06 |
| `/vincular?code=` | confirmar el código del TV (enlace del QR, fijado por el servidor) | — | cel-11 |
| `/suspendida` | cuenta suspendida + WhatsApp de soporte | igual | estilo de cel-06 |

El diálogo **"Tu cuenta ya está abierta"** (cel-12) aparece sobre `/entrar` cuando el login responde 409.

### 6.2 A qué pantalla va el usuario

Al abrir y después de cada login se pide `GET /api/me`:

- sin token o `401` → `/entrar`. Si el 401 llega con la sesión abierta: aviso "Se cerró tu sesión porque tu cuenta se abrió en otro dispositivo".
- `subscription.status = pending` sin `pending_request` → `/planes`
- `pending` o `expired` **con** `pending_request` → `/en-revision`
- `expired` → `/planes` con el título "Tu plan venció"
- `suspended` → `/suspendida`
- `active` → `/` (las rutas de planes siguen disponibles desde Mi perfil para renovar o cambiar)

`/me` se vuelve a pedir **cada 45 s** mientras la app está abierta (también durante la reproducción) y al volver a la pestaña.
Un `403 subscription_inactive` en `/catalog` o en `/play` también manda a `/planes`.

### 6.3 Sesión

- Login: `POST /auth/login {email, password, device_name}`. Si responde `409 other_device_active`, se muestra el diálogo con el nombre del otro dispositivo; "Usar en este celular" repite con `force: true`.
- `device_name` se arma desde el navegador: "Android · Chrome", "iPhone · Safari", "Smart TV · Samsung", etc.
- Se guardan `token` y `session_key` en `localStorage` (no hay otra forma en una PWA; el token muere al cerrar sesión o entrar en otro dispositivo).
- Cerrar sesión: `POST /auth/logout` y borrar todo lo local, incluida la caché del catálogo.

### 6.4 TV: entrar con código

1. `POST /auth/tv-code {device_name}` → se muestra el `code` como `K7M-4QZ` y un QR de `qr_url`.
2. Se consulta `GET /auth/tv-code/{code}` cada 3 s. `approved` → se guarda token + `session_key` y se va a la pantalla según el estado.
3. `410` → se pide un código nuevo solo, sin que el usuario haga nada.
4. En el celular, `/vincular?code=` llega con el código ya escrito; "Vincular este televisor" llama a `confirm`. Como el servidor cierra la sesión del celular, después se muestra "Listo, tu TV ya está conectado" y el botón para volver a entrar en el celular.

### 6.5 Planes y pago

- Planes: `GET /plans`. Datos de pago: `GET /settings/public` (`bank_info`, `support_whatsapp`, `help_text`, `apk_url`).
- `bank_info` es texto libre. Cada línea con forma `Clave: valor` se muestra como una fila con botón de copiar; las demás líneas, como texto.
- Elegir plan: `POST /plan-requests {plan_id}` → se va a `/pagar/:id` con el monto y el `whatsapp_url` que devuelve el servidor.
- En el TV no se puede abrir WhatsApp: se muestra un **QR del `whatsapp_url`** para escanear con el celular, más los datos del banco.
- Historial (Mi perfil): `GET /plan-requests`.

### 6.6 Catálogo

- `GET /api/catalog` → `live`, `upcoming`, `categories`. Destacado del inicio: el primer `live` con `is_featured` (si no hay, el primer `live`; si no hay ninguno en vivo, el primer próximo).
- Se guarda en caché local y se muestra al instante al abrir; luego se actualiza. Mientras no hay nada, esqueletos animados.
- Buscar (la lupa): filtro local por título y categoría sobre el catálogo ya cargado.
- Imagen: `image_url`; si no hay, un fondo abstracto según la categoría, como en las maquetas.
- Las fechas se muestran en hora de Paraguay (`America/Asuncion`).

### 6.7 Reproducción

1. `GET /api/events/{id}/play` → `{event, payload, iv}`. Se descifra con WebCrypto (AES-GCM; el payload es texto cifrado + etiqueta de 16 bytes; la clave es `session_key` en base64) y se obtienen los `links` en orden. Los enlaces solo viven en memoria.
2. Se reproduce el primero:
   - `hls` / `dash` → **Shaka Player**, con ClearKey o Widevine según `drm`. En Safari sin MSE (iPhone viejo), HLS nativo del `<video>`.
   - `web` → `iframe` a pantalla completa. Si el sitio no se deja mostrar, botón "Abrir en el navegador". En el TV se avisa "Este servidor no funciona en el televisor" y se ofrece pasar al siguiente.
3. Si un servidor falla, se muestra "No se pudo cargar este servidor" con el botón **Probar {siguiente}**. El usuario también puede cambiar de servidor en cualquier momento.
4. **Marca de agua:** "ID {id} · {inicio del correo}" tenue (≈15 %), que cambia de lugar cada 20 s.
5. **Enviar al TV:** el botón solo aparece si el navegador lo permite (Remote Playback API: Chromecast desde Chrome y AirPlay desde Safari).
6. Si en medio de la reproducción `/me` da 401 o la cuenta deja de estar activa, se corta el video y se muestra el aviso.

### 6.8 Protección en la web

Según el punto 7.4 del diseño general: sin URLs en el código, respuesta cifrada, bloqueo del clic derecho y de los atajos de herramientas de desarrollador (F12, Ctrl/Cmd+Shift+I/J/C, Ctrl+U), y build de producción minificado y ofuscado. El service worker **nunca** guarda `/api/events/*/play` ni el proxy.

### 6.9 Modo TV

- **Detección:** user agent de Android TV, Google TV, Fire TV (`AFT`), Tizen, webOS, `SMART-TV`, BRAVIA, etc. Se puede forzar con `?modo=tv` o `?modo=celular`, y queda guardado.
- **Navegación:** Norigin Spatial Navigation. Foco siempre visible (borde naranja con brillo y tarjeta agrandada, como en tv-03). Cada fila recuerda su tarjeta al volver.
- **Atrás:** Escape, Backspace, `10009` (Samsung), `461` (LG) y el botón Atrás de Android → vuelve una pantalla; en el inicio no hace nada.
- **Textos:** base 24 px, títulos de 64–78 px y márgenes de 96 px, para pantallas de 1920 × 1080 (escala proporcional en 1280 × 720).
- Barra de ayuda del control abajo a la derecha (◀ ▶ Moverse · OK Elegir · ↩ Atrás).
- Escribir con el control (login con correo, registro): campos normales; el TV muestra su propio teclado.

### 6.10 Aspecto

Se toma tal cual de `maquetas-app/style.css`:

- Colores: naranja `#F26A0A` / `#FF8F3A` / `#B84C04`, fondo `#09090D`, textos `#F5F5F7` / `#A9A9B6` / `#6E6E7C`, verde `#2BD47D`, amarillo `#FFC23D`, rojo `#FF4D5E`; "EN VIVO" en `#E11D2E`.
- Letra **Inter** (archivos incluidos en la app, sin pedirlos a Google).
- Vidrio, botones con relieve que se hunden al presionar, brillos naranjas de fondo, "EN VIVO" con pulso, tarjetas que aparecen escalonadas y transiciones de 200–300 ms.
- Íconos de línea como los de la maqueta.
- Textos en español con "vos" (registrate, elegí), como en las maquetas.

### 6.11 Rendimiento

- Animaciones solo con `transform` y `opacity`.
- **Modo liviano** automático si `prefers-reduced-motion`, `navigator.hardwareConcurrency <= 2`, `navigator.deviceMemory <= 2` o si es un TV: sin `backdrop-filter` (el desenfoque del vidrio es caro en TVs; se reemplaza por un fondo semitransparente sólido), sin animaciones escalonadas y con menos brillos.
- Imágenes con `loading="lazy"` y tamaño fijo para no mover la pantalla.
- PWA con `vite-plugin-pwa`: manifiesto, íconos generados desde `assets/logo.png` y caché de la app.

### 6.12 Organización

- Código en `app/` (la raíz del repo ya ignora `app/dist/`). Build → `app/dist`, que se sube a `public_html`.
- En desarrollo, Vite manda `/api` al Laravel local (`php artisan serve`). En producción la API está en el mismo dominio, `/api`.
- Mensajes de error: se muestran los `message` en español que ya manda el servidor.

## 7. Lo que queda al constructor

- Estructura interna de componentes y de estado.
- Librerías menores (rutas, QR, ofuscador) y cómo se prueban.
- Textos que no estén en las maquetas.
- Pruebas: lógica (descifrado, elección de pantalla por estado, teclas del control) con pruebas automáticas; pantallas revisadas con capturas en tamaño celular y TV contra las maquetas.
