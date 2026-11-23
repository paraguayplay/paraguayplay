# PARAGUAY PLAY TV — Panel de administración — Diseño

Fecha: 2026-11-23
Estado: maquetas aprobadas por el dueño (2026-11-23)
Diseño general: `2026-11-22-app-eventos-en-vivo-design.md`, sección 7.5 (este documento lo amplía para la parte 3)
Servidor: ya hecho (rutas `/api/admin/*` en `backend/routes/api.php`)
App cliente: ya hecha (`app/`, diseño `2026-11-23-app-cliente-design.md`)
Maquetas: `maquetas-panel/` (`.jpg` de cada pantalla + `maqueta.html`)

## 1. Intención

El dueño necesita una pantalla para trabajar el día a día sin tocar la base de datos: aprobar pagos, activar y
vigilar cuentas, cargar eventos con sus enlaces, ajustar planes y datos de pago. Lo más frecuente es **aprobar un pago
apenas llega el comprobante por WhatsApp**, muchas veces desde el celular; por eso el panel funciona igual de bien en
la computadora y en el teléfono.

## 2. Objetivos

- Las 12 pantallas de las maquetas, conectadas a la API de administración que ya existe.
- Aprobar o rechazar una solicitud en dos toques, con la fecha de vencimiento ya calculada y editable.
- Encontrar a cualquier usuario y corregir su estado, vencimiento y notas.
- Crear y editar eventos con varios enlaces ordenables, y **probar** cada enlace antes de publicarlo.
- Ver las cuentas sospechosas y suspenderlas.
- Editar planes y configuración.

## 3. Lo que no se hará en esta parte

- Varios administradores con permisos distintos (hay un solo rol `admin`).
- Estadísticas de audiencia o ingresos (no hay datos en el servidor para eso).
- Cambios en el servidor: el panel usa solo las rutas que ya existen.
- APK y despliegue final (parte 4).

## 4. Anti-objetivos

- Aprobar dos veces la misma solicitud o sumar días de más.
- Publicar un evento con un enlace que no funciona en la web sin enterarse.
- Que un cliente común pueda ver el panel o sus datos.

## 5. Enfoques considerados

| Enfoque | Ventajas | Desventajas |
|---|---|---|
| **Dentro de la misma app React, rutas `/admin/*`** (elegido en el diseño general, §7.8) | Reusa sesión, estilos, componentes, cliente de API y reproductor. Un solo build y un solo despliegue. | El JS del panel viaja con la app; se carga aparte (código separado) para no pesar a los clientes. |
| App aparte solo para el panel | Aislada | Duplica estilos, sesión y reproductor; otro build y otro lugar donde subir. |
| Panel hecho en Laravel (Blade/Filament) | Formularios rápidos | Otro estilo distinto del aprobado; el servidor está pensado solo como API. |

Se sigue con **rutas `/admin/*` dentro de `app/`**, con el código del panel en un bloque aparte (carga diferida) que
solo se descarga al entrar al panel.

## 6. Diseño

### 6.1 Acceso

- Se entra con el mismo login de la app (`/entrar`). Si `me.role === 'admin'`, después del login se va a `/admin`.
- Todas las rutas `/admin/*` exigen sesión y `role === 'admin'`; si no, van a `/` (o a `/entrar` sin sesión).
- El admin no tiene límite de dispositivos (ya lo maneja el servidor).
- En modo TV el panel no se ofrece: `/admin` en un TV muestra "El panel se usa desde una computadora o un celular".

### 6.2 Pantallas y rutas

| Ruta | Pantalla | Maqueta | API |
|---|---|---|---|
| `/admin` → `/admin/solicitudes` | Solicitudes + contadores | panel-01, panel-cel-01 | `GET plan-requests?status=`, `GET plan-requests/pending-count`, `GET users?status=active` / `?expiring_days=3` / `?status=pending` (se usa `meta.total`) |
| diálogo sobre la anterior | Aprobar / Rechazar | panel-02, panel-cel-02 | `GET plan-requests/{id}/preview` → `suggested_expires_at`; `POST plan-requests/{id}/approve {expires_at}`; `POST plan-requests/{id}/reject {note}` |
| `/admin/usuarios` | Usuarios | panel-03 | `GET users?q=&status=&expiring_days=&page=` |
| `/admin/usuarios/:id` | Detalle | panel-04 | `GET users/{id}`, `PATCH users/{id} {status, expires_at, plan_id, admin_notes}`, `DELETE users/{id}/sessions`, `GET users/{id}/plays` |
| `/admin/eventos` | Eventos | panel-05 | `GET events?q=&page=`; interruptores con `PUT events/{id} {is_visible}` / `{is_featured}` |
| `/admin/eventos/nuevo`, `/admin/eventos/:id` | Editar evento | panel-06 | `POST events`, `PUT events/{id}`, `DELETE events/{id}`, `PUT events/{id}/links {links:[…]}`, `POST uploads/image` |
| diálogo sobre la anterior | Probar enlace | panel-07 | — (reproduce en el navegador del admin) |
| `/admin/seguridad` | Cuentas sospechosas | panel-08 | `GET security/suspicious?hours=&min_ips=` |
| `/admin/planes` | Planes | panel-09 | `GET/POST/PUT/DELETE plans` |
| `/admin/configuracion` | Configuración | panel-10 | `GET/PUT settings` |

Las listas paginadas del servidor vienen como `{data, meta: {total, current_page, last_page}}`; las demás, como arreglos simples.

### 6.3 Comportamiento clave

- **Aprobar:** al abrir el diálogo se pide `preview` y se muestra la fecha sugerida en un campo de fecha y hora (hora de Paraguay). El admin puede cambiarla. "Aprobar y activar" manda `expires_at` en ISO. Un `409 already_reviewed` muestra "Esta solicitud ya fue revisada" y refresca la lista (protege del doble clic). El botón queda deshabilitado mientras se envía.
- **Rechazar:** pide un motivo opcional (máx. 255) y confirma.
- **Contador de pendientes:** en el menú y en la pestaña del celular; se refresca cada 60 s y al volver a la pestaña.
- **Usuarios:** buscador con espera de 300 ms; filtros por chips; paginación "Anterior / Siguiente" con `meta`.
- **Detalle:** atajos "+7 días / +1 mes / +1 año" suman al vencimiento actual (o a hoy si ya venció) antes de guardar. "Cerrar sesiones" pide confirmación. El botón WhatsApp abre `https://wa.me/<teléfono sin símbolos>`; si el número local empieza con 0, se reemplaza por 595.
- **Eventos:** lista paginada ordenada por fecha. Los chips "En vivo / Próximos / Terminados / Ocultos" filtran **la página cargada** (el servidor solo filtra por texto) — *decisión del constructor*.
- **Editar evento:** fecha y hora en hora de Paraguay. La imagen se sube con `uploads/image` y se guarda el `path` devuelto. Los enlaces se editan en una lista: agregar, borrar, reordenar (arrastrar en la computadora; botones ▲▼ en el celular), y por enlace: etiqueta, tipo (HLS/DASH/Web), URL, DRM (ninguno, ClearKey con pares `kid:key` uno por línea, Widevine con URL de licencia), cabeceras opcionales (Referer, User-Agent) y "Usar proxy". "Guardar" manda primero el evento y después la lista completa de enlaces.
- **Probar enlace:** reproduce el enlace tal cual con el mismo motor de la app (Shaka; `web` en un iframe). Si falla, muestra el motivo probable: CORS o contenido `http://` en página `https://` → sugiere "Usar proxy". Con el proxy activado, la prueba solo es real después de guardar (el servidor firma la URL); el diálogo lo dice. *Decisión del constructor:* no se agrega una ruta nueva de prueba en el servidor.
- **Seguridad:** por defecto últimas 24 h y 3+ IPs; "Ver" abre el detalle del usuario; "Suspender" pide confirmación y hace `PATCH status=suspended`.
- **Planes:** cada tarjeta guarda por separado. Borrar un plan con uso devuelve `409 plan_in_use` → se muestra el mensaje del servidor (lo desactiva).
- **Configuración:** WhatsApp se valida como 8–15 dígitos (se quitan espacios y `+` antes de enviar); la vista previa de los datos bancarios usa `parseBankInfo` de la app.

### 6.4 Aspecto

- Mismo sistema visual de la app (`app/src/styles/*`): vidrio, naranja, botones con relieve, Inter.
- Computadora: menú lateral de 248 px con logo, contadores en rojo/naranja y cuenta abajo; contenido con tablas de vidrio.
- Celular (< 900 px): sin menú lateral; pestañas desplazables arriba; tablas convertidas en tarjetas con los mismos datos y botones grandes; diálogos como hoja desde abajo.
- Avisos de éxito/error breves arriba a la derecha (o abajo en el celular).

### 6.5 Organización

- Código en `app/src/admin/` (pantallas, componentes propios como `Table`, `Switch`, `DateTimeField`, `LinkEditor`), cargado con `React.lazy` desde `routes.tsx`.
- Cliente de API: el mismo `api()`; tipos nuevos en `app/src/admin/types.ts` (copiados de `AdminUserResource`, `AdminEventResource`, respuestas de seguridad y paginación).
- Pruebas con el mismo helper `test/http.ts`.

## 7. Lo que queda al constructor

- Estructura interna de componentes del panel.
- Textos que no estén en las maquetas.
- Cómo se ve cada tabla en el celular, siguiendo panel-cel-01.
- Pruebas: lógica (cálculo de atajos de fecha, normalización de WhatsApp, armado de la lista de enlaces) automatizadas; pantallas revisadas con capturas en 1440×900 y 390×844 contra las maquetas.
