# PARAGUAY PLAY TV — Diseño

Fecha: 2026-11-22
Estado: aprobado por el dueño (2026-11-22)

## 1. Intención

**PARAGUAY PLAY TV** es una app para ver eventos en vivo de todo tipo desde celulares Android, iPhone/iPad y cualquier Smart TV.
El dueño (administrador) publica enlaces de transmisión: propios, de organizadores que dieron permiso o de acceso
libre con permiso de redistribución. Los usuarios se registran, el administrador activa su cuenta cuando pagan
la suscripción y, con la cuenta activa, pueden ver todos los eventos publicados.

La app se distribuye **desde la web oficial del dueño**, no desde tiendas (Google Play, App Store, Samsung, LG).

## 2. Objetivos

- Registro e inicio de sesión de usuarios. Las cuentas nuevas quedan **pendientes** hasta que el administrador las activa.
- Suscripción con **fecha de vencimiento**. Al vencer, la cuenta deja de ver contenido sin intervención manual.
- Catálogo de eventos: en vivo ahora, próximos y por categoría.
- Reproducción de:
  - HLS (`.m3u8`)
  - DASH (`.mpd`), incluido el DRM opcional (ClearKey o Widevine, si el organizador entrega claves o una URL de licencia)
  - Páginas web de transmisión pública (se muestran dentro de la app cuando el sitio lo permite; si no, se abren en el navegador)
- Uso en celular (pantalla táctil) y en televisor (control remoto con flechas, OK y atrás).
- Panel web de administración para gestionar eventos, enlaces y usuarios.

## 3. Lo que no se hará (por ahora)

- Publicar en tiendas oficiales.
- Cobro automático dentro de la app: el pago se hace por fuera (transferencia, PayPal, etc.) y la activación es manual.
- Que los usuarios transmitan desde su celular.
- Grabaciones o repeticiones (VOD) propias. Si un enlace es de un video grabado, se reproduce igual que uno en vivo.
- Chat, comentarios o funciones sociales.

## 4. Anti-objetivos (sería un fracaso aunque "funcione")

- Que en el televisor no se pueda manejar todo con el control remoto.
- Que una cuenta pagada se comparta sin límite entre muchas personas.
- Que un usuario sin suscripción activa pueda obtener los enlaces de los streams desde la app o la API.
- Distribuir contenido sin derechos. La app está pensada solo para contenido propio, con permiso o de redistribución libre.

## 5. Restricciones

**Distribución sin tiendas:**

| Dispositivo | Cómo se instala |
|---|---|
| Android (celular) | APK descargado desde la web oficial |
| Android TV / Google TV / Fire TV / TV Box | El mismo APK, que aparece en el lanzador del televisor |
| iPhone / iPad | Web app: Safari → "Añadir a pantalla de inicio". Apple no permite instalar apps desde una web. |
| Samsung (Tizen), LG (webOS), otras Smart TV | Versión web para televisor, abierta desde el navegador del TV, **o** transmitir desde el celular por Chromecast o AirPlay. Instalar apps de Tizen o webOS fuera de sus tiendas requiere modo desarrollador. |

**Reproducción de streams externos:**

- **CORS:** un `.m3u8` o `.mpd` alojado en otro servidor solo se reproduce en un navegador o WebView si ese servidor lo permite (cabeceras CORS). Muchos no lo permiten.
- **HTTP en una página HTTPS:** los streams `http://` quedan bloqueados en la web.
- **Solución a ambos:** un **proxy de streams** opcional en el servidor, que se activa por enlace. Ojo: consume ancho de banda del servidor del dueño.
- **Páginas web embebidas:** muchos sitios no se dejan mostrar dentro de otra página (bloquean el uso en `iframe`). En ese caso se abren aparte. En el televisor estas páginas casi nunca funcionan bien.
- **DASH en iPhone:** solo funciona en iOS 17.1 o posterior. En versiones anteriores únicamente HLS.
- **Widevine:** no existe en iPhone (Safari usa FairPlay). Los eventos con Widevine no se verán en iPhone.

## 6. Enfoques considerados

| Enfoque | Ventajas | Desventajas |
|---|---|---|
| **A. Una web app + APK Android** (elegido) | Un solo código para todos los dispositivos. Los cambios llegan al instante. Es el único enfoque que llega a iPhone y a todas las Smart TV sin tiendas. | En iPhone es web app, no app nativa. En Samsung/LG depende del navegador del TV o del casting. |
| B. Apps nativas (Flutter / React Native) | Reproductor algo más robusto en Android | En iPhone no se puede distribuir sin App Store, así que igual se necesita la web app. Son dos productos que mantener. |
| C. Solo web adaptable | Lo más rápido | Sin APK. Mala experiencia en Android TV. |

Se eligió **A**, con soporte para **todo tipo de Smart TV**.

## 7. Diseño

### 7.1 Piezas

1. **App cliente (web app)**
   - Un solo código que detecta si está en celular o en televisor.
   - En televisor usa un modo "10 pies": letra grande, foco visible y navegación con flechas.
   - Se instala como web app (PWA) y se empaqueta como APK para Android y Android TV.
2. **Servidor (API)**
   - Cuentas, sesiones, suscripciones, catálogo de eventos, entrega protegida de enlaces y proxy de streams opcional.
3. **Panel de administración**
   - Web, solo para el dueño. Puede ir dentro del mismo servidor, en la ruta `/admin`.

### 7.2 Flujo del usuario

1. Descarga el APK o abre la web e inicia sesión con **correo y contraseña**. Si no tiene cuenta, se registra con nombre, correo, contraseña y teléfono/WhatsApp.
   - **¿Olvidaste tu contraseña?:** se envía al correo un enlace para crear una nueva. Usa el correo del dominio en Hostinger por SMTP.
2. Cuenta **pendiente**: ve la pantalla de **planes**, elige uno y sigue los pasos de pago (ver 7.2.1).
3. Cuenta **activa**: ve el catálogo con estas secciones:
   - En vivo ahora
   - Próximos
   - Por categoría
4. Elige un evento y se reproduce el enlace principal. Si falla, puede pasar a un enlace alternativo.
5. Cuenta **vencida**: vuelve a la pantalla de planes para reactivar.
6. **Mi perfil** (siempre accesible) muestra:
   - plan actual, estado y fecha de vencimiento, con los días restantes
   - historial de planes y solicitudes
   - botones **Renovar** y **Cambiar de plan**, disponibles en cualquier momento
   - cerrar sesión y cambiar contraseña

#### 7.2.1 Planes y pago

| Plan | Precio | Duración |
|---|---|---|
| Semanal | Gs 5.000 | 7 días |
| Mensual | Gs 20.000 | 1 mes |
| Anual | Gs 240.000 | 1 año |

El dueño puede editar los precios y los planes desde el panel.

Flujo de pago, todo manual:

1. El usuario elige un plan, en el registro, en Mi perfil o al vencer. Se crea una **solicitud** pendiente con el plan elegido.
2. La app muestra los **datos de la cuenta bancaria** para la transferencia, el monto y un botón **"Enviar comprobante por WhatsApp"**. Ese botón abre WhatsApp de soporte con un mensaje ya escrito: nombre, correo, plan, monto y número de solicitud. El usuario adjunta ahí la foto del comprobante.
3. El dueño revisa el pago en su banco y **aprueba la solicitud** en el panel.
4. La cuenta se activa o se extiende. Mientras tanto, el usuario ve "Solicitud en revisión".

Cálculo del vencimiento (decisión del constructor):
- **Cuenta vencida o nueva:** se cuenta desde el momento de la aprobación.
- **Cuenta aún activa (renovación):** se suma a la fecha de vencimiento actual, así no pierde días.
- **Cambio de plan con la cuenta activa:** se suma igual que una renovación. No hay reembolsos ni prorrateo.
- **Ajuste manual:** el dueño siempre puede editar la fecha a mano antes de aprobar.

**Televisor sin teclado:** el inicio de sesión muestra un **código corto + QR**. El usuario lo confirma desde su celular, donde ya tiene la sesión iniciada. También queda la opción de escribir usuario y contraseña con el control.

Boceto de la pantalla principal en el televisor:

```
┌──────────────────────────────────────────────────────────┐
│  [LOGO]                                   Juan · Activa │
│                                                          │
│  EN VIVO AHORA                                           │
│  [▶ Evento 1] [ Evento 2 ] [ Evento 3 ] [ Evento 4 ] →   │
│                                                          │
│  PRÓXIMOS                                                │
│  [ Sáb 20:00 ] [ Dom 18:00 ] [ Lun 21:00 ] →             │
│                                                          │
│  DEPORTES · MÚSICA · RELIGIOSOS · CONFERENCIAS ...       │
└──────────────────────────────────────────────────────────┘
```

### 7.3 Datos

**Usuario:**
- nombre, correo, teléfono, contraseña (cifrada)
- estado: pendiente / activo / suspendido
- fecha de vencimiento de la suscripción y plan actual
- notas del administrador

**Plan:** nombre, precio en guaraníes, duración en días, activo sí/no, orden.

**Solicitud de plan:**
- usuario, plan, monto
- estado: pendiente / aprobada / rechazada
- fecha de la solicitud y de la revisión
- vencimiento resultante, nota

**Token de recuperación de contraseña:** de un solo uso, vence en 1 hora.

**Evento:**
- título, descripción, imagen, categoría
- inicio y fin
- visible sí/no, destacado sí/no
- lista ordenada de **enlaces**

**Enlace:**
- tipo: HLS / DASH / Web
- URL
- etiqueta (por ejemplo, "Servidor 1 HD")
- DRM opcional:
  - tipo: ClearKey o Widevine
  - claves o URL de licencia
- cabeceras opcionales: Referer, User-Agent
- usar proxy sí/no

**Sesión / dispositivo:**
- usuario, nombre del dispositivo, última actividad
- se usa para que solo haya un dispositivo activo por cuenta

### 7.4 Protección

- **Enlaces:** solo se entregan a usuarios con suscripción activa, al momento de reproducir y nunca dentro del catálogo. Así el catálogo no expone las URLs.
- **Proxy:** cuando un enlace usa el proxy, se entrega una URL firmada que vence a las pocas horas.
- **Un solo dispositivo a la vez** por cuenta. Si el usuario inicia sesión en otro dispositivo, se le pregunta si quiere cerrar la sesión anterior; la sesión anterior se corta en la siguiente comprobación (en menos de 1 minuto, también en medio de una reproducción).
- **Protección contra la extracción de enlaces** (pedido del dueño):
  - **Límite honesto:** un navegador tiene que conocer la dirección del video para reproducirlo, así que ninguna web puede ocultarla al 100 % de alguien con conocimientos técnicos (pestaña "Red" de las herramientas de desarrollador). El objetivo es que **sea difícil sacarla, que no sirva fuera de la app y que se sepa quién la filtró**.
  - **Sin enlaces en el código fuente:** el código de la app no contiene ningún enlace. Solo se piden al reproducir, con una sesión activa.
  - **Respuesta cifrada:** la respuesta de reproducción viaja cifrada (AES-GCM) con una clave ligada a la sesión. El JS se publica minificado y ofuscado. Esto disuade a curiosos, no a expertos.
  - **Enlaces atados a la sesión** (para los enlaces con proxy): la URL visible es de nuestro dominio y queda firmada con el usuario y su sesión. Deja de funcionar si se comparte después de cerrar sesión, si el usuario vence o si entra en otro dispositivo.
  - **Marca de agua en el video:** un texto tenue y móvil con el ID del usuario se superpone sobre el video. Si alguien graba o retransmite la pantalla, se sabe quién fue.
  - **Registro de reproducciones:** se guarda cada reproducción (usuario, IP, dispositivo, evento) y el panel marca las cuentas sospechosas (muchas IPs distintas en 24 h). Desde ahí se pueden suspender.
  - **Disuasión en la web:** se bloquea el clic derecho y los atajos de herramientas de desarrollador. Se puede saltar, pero frena a la mayoría.
  - **La app Android (APK) es la más protegida:** no tiene herramientas de desarrollador accesibles y su código se ofusca.
  - **Sin servidores de streaming propios** (decisión del dueño): todos los streams vienen de URLs de proveedores. Si algún proveedor ofrece enlaces con token o vencimiento, el panel permite cargarlos igual. Los enlaces públicos de terceros, por definición, ya se pueden encontrar en su fuente original.
- **Contraseñas:** cifradas con argon2 o bcrypt.
- **Conexiones:** todo por HTTPS.

### 7.5 Panel de administración

- **Usuarios:**
  - listar y buscar, con filtros: pendientes, activos, vencidos, vencen en 3 días
  - **aceptar** usuarios y **poner o editar la fecha de vencimiento** a mano
  - suspender
  - ver y cerrar sus sesiones
- **Solicitudes de plan:**
  - bandeja con las pendientes primero, con un contador visible
  - aprobar, con la fecha de vencimiento calculada y editable, o rechazar con un motivo
- **Planes:** editar nombre, precio y duración; activar o desactivar.
- **Eventos:** crear, editar, ocultar y destacar; agregar varios enlaces por evento y reordenarlos.
- **Probar enlace:** reproduce el enlace dentro del panel y avisa si falla por CORS o HTTP, sugiriendo activar el proxy.
- **Configuración:**
  - datos bancarios para la transferencia
  - número de WhatsApp de soporte
  - texto de ayuda
  - enlace de descarga del APK

### 7.6 Marca y experiencia

- **Nombre:** PARAGUAY PLAY TV
- **Logo:** `assets/logo.png` (botón de play blanco sobre círculo naranja)
- **Colores:** naranja del logo (aprox. `#F26A0A`), blanco y fondo oscuro (casi negro) para que el video y las tarjetas resalten en el televisor
- **Ícono:** el mismo logo para el APK, la web app y el banner de Android TV

**Sensación buscada:** moderna, tecnológica y premium.
- **Visual:**
  - fondo oscuro con brillos naranjas suaves (glow)
  - superficies tipo vidrio (glassmorphism)
  - botones con relieve 2.5D o 3D: sombra, luz superior y "hundirse" al presionar
  - tarjetas que se elevan y crecen un poco al recibir el foco
- **Animaciones sencillas:**
  - transiciones de pantalla cortas, de unos 200–300 ms
  - aparición escalonada de tarjetas
  - pulso en la etiqueta "EN VIVO"
  - esqueletos animados mientras carga
- **Rendimiento:** las animaciones usan solo `transform` y `opacity`, para que vayan fluidas en televisores y TV Box baratos. Si el dispositivo es lento, se reducen solas.
- **Carga rápida:**
  - la app pesa poco y se guarda en caché (PWA)
  - imágenes en WebP, en el tamaño justo y cargadas a medida que se necesitan
  - el catálogo aparece al instante desde la caché y luego se actualiza
- **Control remoto:**
  - todo se maneja con flechas, OK y Atrás
  - foco siempre visible, con un borde naranja brillante y la tarjeta agrandada
  - la tecla Atrás vuelve de forma predecible
  - el foco se recuerda al regresar a una fila
  - nada depende de pasar el mouse por encima

### 7.7 Alojamiento: Hostinger Premium + dominio propio

El plan Premium de Hostinger es hosting compartido: ejecuta PHP y MySQL, pero no aplicaciones Node.js permanentes. Por eso, **todo el servidor se hace en PHP + MySQL** y todo queda en esa misma cuenta, sin costo extra.

- **Dominio** (por ejemplo, `paraguayplaytv.com`):
  - `paraguayplaytv.com`: la app (web app para celular y TV) y la página de descarga del APK
  - `paraguayplaytv.com/api`: el servidor
  - `paraguayplaytv.com/admin`: el panel
- **Certificado SSL:** el gratuito de Hostinger (necesario para HTTPS y para la web app).
- **Proxy de streams:** con un límite. En hosting compartido, pasar video en vivo por el servidor consume mucho CPU y ancho de banda, y Hostinger puede limitar o suspender la cuenta.
  - El proxy solo reescribe las listas `.m3u8` y `.mpd`, que son livianas. Los segmentos de video siguen yendo directo al servidor de origen.
  - Si un origen bloquea también los segmentos, ese enlace no funcionará en la web. No se usarán servidores adicionales (decisión del dueño): en esos casos se apaga el proxy para ese enlace o se pide al proveedor un enlace compatible.

### 7.8 Tecnología (decisiones del constructor, propuestas)

- **Cliente:**
  - React + Vite como PWA, compilado a archivos estáticos que se suben a `public_html`
  - Shaka Player para HLS, DASH y DRM; en iPhone, HLS nativo de Safari como respaldo
  - Navegación espacial para el control remoto (Norigin Spatial Navigation)
- **APK:** Capacitor, con entrada en el lanzador de Android TV (leanback / banner). Este empaquetado nativo **no** pasa por el proxy: lee los streams sin las restricciones de CORS, así que en Android funcionan más enlaces que en la web.
- **Casting:** Chromecast desde Android y Chrome; AirPlay nativo desde iPhone.
- **Servidor:** PHP 8 con Laravel, MySQL de Hostinger y autenticación por tokens con registro de la sesión activa. Se despliega por SSH/Git, incluidos en el plan Premium.
- **Panel:** dentro de la misma app React, ruta `/admin`, solo para el rol administrador.
- **Idioma:** español.

## 8. Pendiente de decidir por el dueño

- El nombre exacto del dominio (se registra en Hostinger; el plan Premium suele incluir el primer año gratis).

## 9. Lo que queda al constructor

- Diseño visual (sobre el logo y los colores de 7.6)
- Estructura interna del código
- Textos de pantallas
- Pruebas en dispositivos reales: Android TV, Fire TV, navegador de Samsung y LG, iPhone
