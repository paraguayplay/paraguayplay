# PARAGUAY PLAY TV — Servidor (API + datos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La API en PHP/Laravel que maneja cuentas (1 dispositivo), planes y solicitudes de pago manual, catálogo de eventos con entrega protegida de enlaces, proxy de manifiestos, login por código para TV y todo lo que el panel de administración necesita.

**Architecture:** Laravel 12 solo-API (sin vistas) con Sanctum para tokens. Toda la lógica de suscripción vive en un servicio puro (`SubscriptionService`) que usan tanto el usuario como el admin. MySQL en Hostinger; SQLite en memoria para pruebas. La app React (plan 2) y el panel (plan 3) consumen esta API.

**Tech Stack:** PHP 8.3, Laravel 12, Laravel Sanctum, PHPUnit, MySQL (prod) / SQLite (tests).

**Spec:** `docs/superpowers/specs/2026-11-22-app-eventos-en-vivo-design.md`

**Planes siguientes (no incluidos aquí):** 2) app cliente React (celular + TV + PWA; incluye descifrar `/play`, marca de agua con ID de usuario, bloqueo de clic derecho/atajos y build ofuscado), 3) panel admin (incluye vista de cuentas sospechosas), 4) APK Capacitor (con ofuscación) + despliegue final.

## Global Constraints

- Repo en `/home/user` (raíz git); servidor en `backend/`. Comandos se corren desde `backend/` salvo que se diga otra cosa.
- PHP ≥ 8.2 (Hostinger ofrece 8.3). Sin dependencias que necesiten procesos permanentes, colas ni Redis: Hostinger Premium es hosting compartido. `QUEUE_CONNECTION=sync`, `CACHE_STORE=database`, `SESSION_DRIVER` irrelevante (solo tokens).
- Todas las rutas bajo `/api`. Respuestas JSON. Mensajes de error visibles al usuario en **español**.
- Errores de negocio devuelven `{"code": "<snake_case>", "message": "<texto en español>"}` con el status indicado en cada tarea.
- Correos se normalizan con `strtolower(trim())` al registrar, iniciar sesión y recuperar contraseña.
- Moneda: guaraníes enteros (`price_gs` int). Formato visible: `Gs 20.000` (punto de miles).
- Planes iniciales: Semanal Gs 5.000 / 7 días; Mensual Gs 20.000 / 30 días; Anual Gs 240.000 / 365 días.
- Un solo dispositivo con sesión activa por cuenta (sin contar el admin).
- Zona horaria `America/Asuncion`.

## Review Focus

1. Correo con mayúsculas/espacios (`" Juan@Mail.com "`) — se registra y luego inicia sesión como `juan@mail.com`; no se crea duplicado. → Task 3 `test_email_is_normalized`.
2. Doble clic en "Aprobar" en el panel — la segunda aprobación responde 409 `already_reviewed` y no suma días dos veces. → Task 6 `test_approving_twice_does_not_extend_twice`.
3. Usuario que venció mientras tenía la app abierta — `/api/events/{id}/play` responde 403 `subscription_inactive` aunque su token siga válido. → Task 7 `test_expired_user_cannot_play`.
4. Mismo usuario entra en un segundo celular — el primero recibe 401 en su siguiente `/api/me` (la app lo saca en <1 min). → Task 3 `test_force_login_revokes_previous_device`.
5. Manifiesto con URIs anidadas que apuntan a IP privada o `localhost` — el proxy responde 403 y nunca hace la petición. → Task 8 `test_proxy_refuses_private_hosts`.
6. Enlace con proxy copiado y abierto después de que el usuario cerró sesión o entró en otro dispositivo — el proxy responde 403 `session_ended`. → Task 8 `test_proxy_url_dies_with_session`.

---

### Task 1: Repositorio y proyecto Laravel

**Files:**
- Create: `/home/user/.gitignore`, `backend/` (vía composer), `backend/routes/api.php`
- Modify: `backend/phpunit.xml`, `backend/.env.example`, `backend/config/app.php` (timezone)
- Test: `backend/tests/Feature/HealthTest.php`

**Interfaces:**
- Produces: `GET /api/health` → `200 {"ok": true}`.

- [ ] **Step 1:** `cd /home/user && git init && git checkout -b main`; `.gitignore` con `node_modules/`, `backend/vendor/`, `backend/.env`, `*.log`, `app/dist/`.
- [ ] **Step 2:** `composer create-project laravel/laravel backend "^12.0"`; luego `cd backend && php artisan install:api` (instala Sanctum y `routes/api.php`).
- [ ] **Step 3:** `phpunit.xml`: `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`, `MAIL_MAILER=array`. `config/app.php` timezone `America/Asuncion`, locale `es`. `.env.example` con `DB_CONNECTION=mysql`, `QUEUE_CONNECTION=sync`, `CACHE_STORE=database`, `APP_URL`, `FRONTEND_URL`.
- [ ] **Step 4: Prueba que falla** — `HealthTest::test_health_returns_ok`: `getJson('/api/health')->assertOk()->assertExactJson(['ok'=>true])`. Correr `php artisan test --filter=HealthTest` → FAIL (404).
- [ ] **Step 5:** Ruta en `routes/api.php`. Correr → PASS. Correr suite completa `php artisan test` → PASS.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: proyecto Laravel con Sanctum y ruta health"` (incluye `docs/` y `assets/` ya existentes).

---

### Task 2: Esquema y modelos

**Files:**
- Create: migraciones para `plans`, `plan_requests`, `events`, `event_links`, `settings`, `tv_login_codes`; modificar la migración de `users`.
- Create: `app/Models/{Plan,PlanRequest,Event,EventLink,Setting,TvLoginCode}.php`, factories para `User`, `Plan`, `Event`, `EventLink`, `PlanRequest`; `database/seeders/PlanSeeder.php`.
- Modify: `app/Models/User.php`, `database/seeders/DatabaseSeeder.php`
- Test: `tests/Feature/SchemaTest.php`

**Interfaces (columnas exactas):**
- `users`: `id, name, email (unique), phone, password, role enum('user','admin') default 'user', status enum('pending','active','suspended') default 'pending', plan_id nullable FK, expires_at datetime nullable, admin_notes text nullable, timestamps`.
- `plans`: `id, name, price_gs unsigned int, duration_days unsigned int, is_active bool default true, sort_order int default 0, timestamps`.
- `plan_requests`: `id, user_id FK cascade, plan_id FK, amount_gs unsigned int, status enum('pending','approved','rejected','cancelled') default 'pending', resulting_expires_at datetime nullable, reviewed_at datetime nullable, note string nullable, timestamps`.
- `events`: `id, title, description text nullable, image_path nullable, category string, starts_at datetime, ends_at datetime nullable, is_visible bool default true, is_featured bool default false, timestamps`.
- `event_links`: `id, event_id FK cascade, type enum('hls','dash','web'), url text, label string, sort_order int default 0, drm_type enum('none','clearkey','widevine') default 'none', drm_clearkeys json nullable (mapa kid→key), drm_license_url text nullable, headers json nullable (Referer/User-Agent), use_proxy bool default false, timestamps`.
- `settings`: `key string primary, value text nullable`. Claves: `bank_info`, `support_whatsapp` (solo dígitos, con código país, ej. `595981123456`), `help_text`, `apk_url`.
- `tv_login_codes`: `id, code string(6) unique, user_id nullable FK, token text nullable, expires_at datetime, timestamps`.
- `User`: `$hidden = ['password','remember_token','admin_notes']`, casts `expires_at` datetime, relación `plan()`, `planRequests()`; `isAdmin(): bool`.
- `Setting::get(string $key, ?string $default = null): ?string`, `Setting::put(string $key, ?string $value): void`.
- `PlanSeeder` crea los 3 planes de Global Constraints (sort_order 1,2,3) con `updateOrCreate` por nombre.

- [ ] **Step 1: Prueba que falla** — `SchemaTest::test_plan_seeder_creates_three_plans`: tras `seed(PlanSeeder::class)`, `Plan::orderBy('sort_order')->pluck('price_gs')` es `[5000, 20000, 240000]` y `pluck('duration_days')` es `[7, 30, 365]`; `test_new_user_is_pending`: `User::factory()->create()->status === 'pending'`; `test_setting_roundtrip`: `Setting::put('apk_url','x'); Setting::get('apk_url') === 'x'`.
- [ ] **Step 2:** Correr `php artisan test --filter=SchemaTest` → FAIL.
- [ ] **Step 3:** Migraciones, modelos, factories y seeder.
- [ ] **Step 4:** Correr → PASS; `php artisan migrate:fresh --seed` en SQLite local sin errores.
- [ ] **Step 5: Commit** — `feat: esquema de usuarios, planes, solicitudes, eventos y ajustes`.

---

### Task 3: Registro, login de un solo dispositivo, logout, /me

**Files:**
- Create: `app/Http/Controllers/AuthController.php`, `app/Http/Controllers/MeController.php`, `app/Http/Requests/{RegisterRequest,LoginRequest}.php`, `app/Http/Resources/MeResource.php`, `app/Services/SubscriptionService.php` (solo `status()` en esta tarea)
- Modify: `routes/api.php`
- Test: `tests/Feature/AuthTest.php`, `tests/Unit/SubscriptionStatusTest.php`

**Interfaces:**
- `POST /api/auth/register {name, email, phone, password, password_confirmation, device_name}` → `201 {token, user: MeResource}`. Validación: email único (tras normalizar), password min 8.
- `POST /api/auth/login {email, password, device_name, force?: bool}` →
  - `200 {token, user}` si no hay otro token, o si `force=true` (borra todos los demás tokens del usuario antes de emitir).
  - `409 {code:"other_device_active", message:"Tu cuenta está abierta en otro dispositivo (<device>). ¿Cerrar esa sesión y entrar aquí?", device:"<name>"}` si existe otro token y no hay `force`.
  - `422 {code:"invalid_credentials", message:"Correo o contraseña incorrectos."}`.
  - Admin (`role=admin`) no tiene límite de dispositivos.
- `POST /api/auth/logout` (auth) → `204`, borra el token actual.
- `GET /api/me` (auth) → `200 MeResource`. La app lo consulta cada 45 s; 401 = sesión cerrada en otro dispositivo.
- `PUT /api/me/password {current_password, password, password_confirmation}` → `204`.
- Login, register, `/me` y TV-confirm devuelven además `session_key` (ver Task 7) solo en la respuesta que emite el token (login/register/tv-code approved).
- `MeResource`: `{id, name, email, phone, role, subscription: {status, plan: {id,name,price_gs,duration_days}|null, expires_at: ISO8601|null, days_left: int|null}, pending_request: {id, plan_id, amount_gs, created_at}|null}`.
- `SubscriptionService::status(User $u, ?Carbon $now = null): string` → `'pending'|'active'|'expired'|'suspended'`: `suspended` si status suspended; `pending` si status pending; si active: `active` cuando `expires_at > now`, si no `expired`.
- `days_left` = `ceil` de días hasta `expires_at` si activo, si no `null`.

- [ ] **Step 1: Pruebas que fallan**
  - `SubscriptionStatusTest`: los 4 estados, incluido `expires_at == now` → `expired`.
  - `AuthTest::test_register_returns_token_and_pending_user` (status `pending`, `subscription.status` `pending`).
  - `test_email_is_normalized`: registro con `" Juan@Mail.com "`, login con `juan@mail.com` → 200; segundo registro con `JUAN@mail.com` → 422.
  - `test_login_on_second_device_returns_409` (assertJson `code` `other_device_active`, `device` = primer device_name).
  - `test_force_login_revokes_previous_device`: login A, login B con `force=true`, `withToken(A)->getJson('/api/me')` → 401, `withToken(B)` → 200.
  - `test_wrong_password_returns_invalid_credentials`.
  - `test_admin_can_have_multiple_devices`.
  - `test_logout_revokes_token`; `test_change_password_requires_current`.
- [ ] **Step 2:** `php artisan test --filter='AuthTest|SubscriptionStatusTest'` → FAIL.
- [ ] **Step 3:** Implementar. Limitar login a 5 intentos/min por email+IP con `throttle` (respuesta 429).
- [ ] **Step 4:** Correr → PASS.
- [ ] **Step 5: Commit** — `feat: registro, login de un dispositivo y perfil`.

---

### Task 4: Recuperar contraseña por correo

**Files:**
- Create: `app/Http/Controllers/PasswordResetController.php`, `app/Notifications/ResetPasswordNotification.php`
- Modify: `routes/api.php`, `.env.example` (SMTP de Hostinger: `MAIL_HOST=smtp.hostinger.com`, `MAIL_PORT=465`, `MAIL_SCHEME=smtps`)
- Test: `tests/Feature/PasswordResetTest.php`

**Interfaces:**
- `POST /api/auth/forgot-password {email}` → siempre `200 {message:"Si el correo está registrado, te enviamos un enlace."}`. Usa el broker de Laravel (`Password::sendResetLink`), token de 60 min.
- Enlace del correo: `{FRONTEND_URL}/restablecer?token=<t>&email=<e>`. Asunto: `PARAGUAY PLAY TV — Restablecer contraseña`.
- `POST /api/auth/reset-password {email, token, password, password_confirmation}` → `200` y borra todos los tokens del usuario; token inválido/usado → `422 {code:"invalid_reset_token"}`.

- [ ] **Step 1: Pruebas que fallan** — `test_forgot_password_sends_notification` (`Notification::fake`, `assertSentTo`, y la URL contiene `/restablecer?token=`); `test_unknown_email_returns_same_200`; `test_reset_changes_password_and_revokes_tokens`; `test_reset_token_cannot_be_reused` (segundo uso → 422).
- [ ] **Step 2:** Correr → FAIL. **Step 3:** Implementar. **Step 4:** Correr → PASS.
- [ ] **Step 5: Commit** — `feat: recuperación de contraseña por correo`.

---

### Task 5: Planes, solicitudes del usuario y ajustes públicos

**Files:**
- Create: `app/Http/Controllers/PlanController.php`, `app/Http/Controllers/PlanRequestController.php`, `app/Http/Controllers/PublicSettingsController.php`, `app/Support/Money.php`
- Modify: `app/Services/SubscriptionService.php`, `routes/api.php`
- Test: `tests/Unit/SubscriptionExpiryTest.php`, `tests/Unit/MoneyTest.php`, `tests/Feature/PlanRequestTest.php`

**Interfaces:**
- `SubscriptionService::computeExpiry(?Carbon $currentExpiry, int $days, Carbon $now): Carbon` = `max($currentExpiry, $now) + $days días` (renovar con cuenta activa suma a la fecha actual; vencida o nueva cuenta desde ahora).
- `Money::gs(int $amount): string` → `"Gs 240.000"`.
- `GET /api/plans` (público) → `[{id, name, price_gs, price_label, duration_days}]`, solo activos, por `sort_order`.
- `POST /api/plan-requests {plan_id}` (auth, cualquier estado salvo `suspended` → 403 `account_suspended`) → `201 {request:{id, plan, amount_gs, status, created_at}, whatsapp_url}`. Si ya hay una pendiente, se marca `cancelled` y se crea la nueva. `amount_gs` = precio del plan en ese momento.
- `whatsapp_url` = `https://wa.me/<support_whatsapp>?text=<urlencode(msg)>` con `msg` exacto:
  ```
  Hola, envío el comprobante de pago de PARAGUAY PLAY TV.
  Nombre: {name}
  Correo: {email}
  Plan: {plan} ({Gs monto})
  Solicitud N.º {id}
  ```
- `GET /api/plan-requests` (auth) → historial propio, más reciente primero.
- `GET /api/settings/public` → `{bank_info, support_whatsapp, help_text, apk_url}`.

- [ ] **Step 1: Pruebas que fallan**
  - `SubscriptionExpiryTest`: nueva (`null`) + 7 → `now+7d`; vencida hace 3 días + 30 → `now+30d`; activa hasta `now+5d` + 30 → `now+35d`.
  - `MoneyTest`: `5000→"Gs 5.000"`, `240000→"Gs 240.000"`, `0→"Gs 0"`.
  - `PlanRequestTest::test_pending_user_can_request_plan` (201, `amount_gs` 20000, `whatsapp_url` empieza con `https://wa.me/595` y contiene `Solicitud%20N.%C2%BA%20{id}` urlencoded).
  - `test_new_request_cancels_previous_pending`; `test_suspended_user_cannot_request`; `test_inactive_plan_cannot_be_requested` (422); `test_me_shows_pending_request`.
- [ ] **Step 2:** Correr → FAIL. **Step 3:** Implementar. **Step 4:** Correr → PASS.
- [ ] **Step 5: Commit** — `feat: planes y solicitudes de pago por WhatsApp`.

---

### Task 6: Administración de usuarios, solicitudes, planes y ajustes

**Files:**
- Create: `app/Http/Middleware/EnsureAdmin.php`, `app/Console/Commands/CreateAdmin.php`, `app/Http/Controllers/Admin/{UserController,PlanRequestController,PlanController,SettingsController}.php`, `app/Http/Resources/AdminUserResource.php`
- Modify: `bootstrap/app.php` (alias `admin`), `routes/api.php` (grupo `prefix('admin')->middleware(['auth:sanctum','admin'])`)
- Test: `tests/Feature/Admin/{UsersTest,PlanRequestsTest,PlansTest,SettingsTest}.php`

**Interfaces:**
- `php artisan ppt:create-admin {email} {name}` → pide contraseña (oculta), crea o actualiza con `role=admin`, `status=active`.
- No admin → `403 {code:"forbidden"}`.
- `GET /api/admin/users?status=pending|active|expired|suspended&q=&expiring_days=3&page=` → paginado 25; `q` busca en nombre/correo/teléfono; `status` usa `SubscriptionService::status`; `expiring_days=N` = activos que vencen en ≤N días. Orden: `created_at desc`.
- `AdminUserResource` = `MeResource` + `{status, admin_notes, created_at, active_device: string|null}`.
- `PATCH /api/admin/users/{id} {status?, expires_at?, plan_id?, admin_notes?}` — "aceptar y poner fecha" = `{status:"active", expires_at:"2026-12-22T23:59"}`. `status=active` sin `expires_at` ni uno ya guardado → 422 `expires_at_required`.
- `DELETE /api/admin/users/{id}/sessions` → 204, borra sus tokens.
- `GET /api/admin/plan-requests?status=pending` → paginado, con `user` y `plan`; `GET /api/admin/plan-requests/pending-count` → `{count}`.
- `POST /api/admin/plan-requests/{id}/approve {expires_at?}` → en transacción con `lockForUpdate`: si la solicitud no es `pending` → `409 {code:"already_reviewed"}`. Si no, `expires_at` = el enviado o `computeExpiry(user.expires_at, plan.duration_days, now)`; usuario → `status=active`, `plan_id`, `expires_at`; solicitud → `approved`, `resulting_expires_at`, `reviewed_at`. Devuelve `200 AdminUserResource`.
- `GET /api/admin/plan-requests/{id}/preview` → `{suggested_expires_at}` (para mostrar la fecha editable antes de aprobar).
- `POST /api/admin/plan-requests/{id}/reject {note}` → `rejected`; mismas reglas 409.
- `apiResource('/api/admin/plans')` sin `show`; `DELETE` de un plan con solicitudes → 409 `plan_in_use` (se desactiva en su lugar con `is_active=false`).
- `GET|PUT /api/admin/settings` → las 4 claves; `support_whatsapp` se valida como solo dígitos 8–15.

- [ ] **Step 1: Pruebas que fallan**
  - `UsersTest`: `test_non_admin_gets_403`; `test_filter_pending`; `test_filter_expiring_in_3_days`; `test_admin_accepts_user_with_date` (luego `/api/me` del usuario muestra `active` y esa fecha); `test_activate_without_date_fails`; `test_kick_sessions`.
  - `PlanRequestsTest`: `test_approve_new_user_sets_expiry_from_now`; `test_approve_renewal_adds_to_current_expiry`; `test_approve_with_custom_date`; `test_approving_twice_does_not_extend_twice` (segunda → 409, `expires_at` igual tras ambas); `test_reject_with_note`; `test_pending_count`.
  - `PlansTest`: crear/editar precio; borrar plan usado → 409.
  - `SettingsTest`: guardar y leer; whatsapp con letras → 422; `/api/settings/public` refleja el cambio.
  - `CreateAdmin`: `artisan('ppt:create-admin', ...)->expectsQuestion(...)` crea admin.
- [ ] **Step 2:** Correr → FAIL. **Step 3:** Implementar. **Step 4:** Correr → PASS.
- [ ] **Step 5: Commit** — `feat: panel admin de usuarios, solicitudes, planes y ajustes (API)`.

---

### Task 7: Eventos — CRUD admin, catálogo y reproducción

**Files:**
- Create: `app/Http/Middleware/EnsureActiveSubscription.php`, `app/Http/Controllers/Admin/{EventController,EventLinkController,UploadController}.php`, `app/Http/Controllers/{CatalogController,PlayController}.php`, `app/Http/Resources/{CatalogEventResource,PlayLinkResource}.php`, `app/Services/ProxyUrlSigner.php`
- Modify: `routes/api.php`, `bootstrap/app.php` (alias `subscribed`)
- Test: `tests/Feature/Admin/EventsTest.php`, `tests/Feature/CatalogTest.php`, `tests/Feature/PlayTest.php`, `tests/Unit/ProxyUrlSignerTest.php`

**Interfaces:**
- `subscribed`: si `status() !== 'active'` (y no es admin) → `403 {code:"subscription_inactive", message:"Tu suscripción no está activa. Elige un plan para seguir viendo."}`.
- Admin: `apiResource('/api/admin/events')` (incluye links en `show`/`index`); `PUT /api/admin/events/{id}/links` reemplaza la lista ordenada completa `[{type,url,label,drm_type,drm_clearkeys,drm_license_url,headers,use_proxy}]`; `POST /api/admin/uploads/image` (jpg/png/webp ≤ 3 MB) → guarda en `storage/app/public/events` convertido a WebP de 800 px de ancho con GD → `{path, url}`.
- `GET /api/catalog` (auth+subscribed) → `{live:[...], upcoming:[...], categories:[{name, events:[...]}]}` con `CatalogEventResource {id,title,description,image_url,category,starts_at,ends_at,is_featured,is_live,link_count}` — **sin URLs**. Solo `is_visible`. `is_live` = `starts_at <= now` y (`ends_at` nulo o `> now`). `live` ordena destacados primero; `upcoming` = `starts_at > now`, ascendente, máx. 20; eventos con `ends_at` pasado no aparecen.
- `GET /api/events/{id}/play` (auth+subscribed) → `{event:{id,title}, links:[PlayLinkResource]}`; `PlayLinkResource {label, type, url, drm:{type, clearkeys|null, license_url|null}, headers|null}`. Si `use_proxy`, `url` = `ProxyUrlSigner::sign(url, ttlSeconds: 14400)`. Evento oculto → 404.
- `ProxyUrlSigner::sign(string $url, int $ttlSeconds, int $userId, int $tokenId): string` → `{APP_URL}/api/proxy/manifest?u=<base64url(url)>&e=<expiry>&k=<tokenId>&s=<hmac_sha256(u.e.userId.tokenId, APP_KEY)>`; `ProxyUrlSigner::verify(array $query): ?array` → `['url'=>..., 'user_id'=>..., 'token_id'=>...]` o `null` si firma inválida o vencida.
- **Respuesta cifrada:** `/play` devuelve `{event:{id,title}, payload, iv}` donde `payload` = AES-256-GCM (base64) del JSON `{links:[...]}` con clave `hash_hmac('sha256', 'play:'.$tokenId, APP_KEY)` entregada al cliente **una vez** en el login/`/me` como `session_key` (base64). Helper `PlayPayloadCipher::encrypt(array $data, string $key): array{payload:string, iv:string}` y `decrypt(...)` para pruebas.
- **Registro:** cada `/play` crea un `play_logs {user_id, event_id, token_id, ip, user_agent, created_at}` (migración nueva en esta tarea).

- [ ] **Step 1: Pruebas que fallan**
  - `EventsTest`: crear evento con 2 enlaces; reordenar; subir imagen (`UploadedFile::fake()->image('a.jpg')`) devuelve ruta `.webp`.
  - `CatalogTest`: `test_catalog_hides_urls` (`assertJsonMissingPath` de `url` y el JSON crudo no contiene la URL del enlace); `test_live_upcoming_and_finished_split`; `test_hidden_events_excluded`; `test_pending_user_gets_403`.
  - `PlayTest`: `test_play_response_is_encrypted` (el JSON crudo no contiene la URL; `PlayPayloadCipher::decrypt` con la `session_key` del login la recupera); `test_play_is_logged` (1 fila en `play_logs` con la IP); `test_active_user_gets_links_in_order` (tras descifrar); `test_expired_user_cannot_play` (usuario con token válido y `expires_at` ayer → 403 `subscription_inactive`); `test_proxy_link_returns_signed_url`.
  - `ProxyUrlSignerTest`: firma válida → URL; alterada → null; vencida → null.
- [ ] **Step 2:** Correr → FAIL. **Step 3:** Implementar; `php artisan storage:link`. **Step 4:** Correr → PASS.
- [ ] **Step 5: Commit** — `feat: eventos, catálogo y entrega protegida de enlaces`.

---

### Task 8: Proxy de manifiestos (solo listas, no video)

**Files:**
- Create: `app/Http/Controllers/ManifestProxyController.php`, `app/Services/ManifestRewriter.php`, `app/Services/SafeHost.php`
- Modify: `routes/api.php`
- Test: `tests/Unit/ManifestRewriterTest.php`, `tests/Feature/ManifestProxyTest.php`

**Interfaces:**
- `GET /api/proxy/manifest?u&e&k&s` (sin cabecera auth; la firma es la autorización) → verifica con `ProxyUrlSigner::verify` (inválida → 403 `invalid_signature`); el token `k` debe seguir existiendo y el usuario seguir `active` (si no → 403 `session_ended`); las listas anidadas se firman con el mismo usuario/token; `SafeHost::isPublic(string $url): bool` (resuelve DNS; rechaza `localhost`, loopback, privadas, link-local, esquemas ≠ http/https) → si no, 403 `forbidden_host`; descarga con `Http::timeout(8)` (máx. 2 MB), y responde con `Access-Control-Allow-Origin: *`, `Cache-Control: no-store` y el content-type de origen.
- `ManifestRewriter::rewriteHls(string $body, string $baseUrl, callable $signNested): string` — líneas URI y atributos `URI="..."`: se vuelven absolutas respecto a `$baseUrl`; si apuntan a otra lista (`.m3u8`, o líneas tras `#EXT-X-STREAM-INF`) se pasan por `$signNested` (proxy); segmentos y claves quedan absolutos **directos al origen**.
- `ManifestRewriter::rewriteDash(string $body, string $baseUrl): string` — inserta/ajusta `<BaseURL>` absoluto al origen en el `MPD` si no hay uno absoluto.

- [ ] **Step 1: Pruebas que fallan**
  - `ManifestRewriterTest`: master con variante relativa `720p/index.m3u8` → se reemplaza por la URL firmada que devuelve el callable; media con `seg1.ts` → `https://origen.com/live/seg1.ts`; `#EXT-X-KEY:...URI="key.bin"` → absoluto; URIs ya absolutas se mantienen; DASH sin BaseURL → se agrega `<BaseURL>https://origen.com/live/</BaseURL>`.
  - `ManifestProxyTest` (`Http::fake`): firma válida → 200 con CORS y cuerpo reescrito; `test_proxy_refuses_private_hosts` (`http://127.0.0.1/x.m3u8` y `http://192.168.1.5/x.m3u8` firmados → 403 y `Http::assertNothingSent()`); firma alterada → 403; `test_proxy_url_dies_with_session` (URL firmada válida, luego login forzado en otro dispositivo → 403 `session_ended`); usuario vencido → 403.
- [ ] **Step 2:** Correr → FAIL. **Step 3:** Implementar. **Step 4:** Correr → PASS.
- [ ] **Step 5: Commit** — `feat: proxy liviano de manifiestos HLS/DASH`.

---

### Task 8b: Cuentas sospechosas (panel)

**Files:**
- Create: `app/Http/Controllers/Admin/SecurityController.php`
- Test: `tests/Feature/Admin/SuspiciousTest.php`

**Interfaces:**
- `GET /api/admin/security/suspicious?hours=24&min_ips=3` → `[{user: AdminUserResource, distinct_ips, plays, last_play_at}]` ordenado por `distinct_ips desc`.
- `GET /api/admin/users/{id}/plays` → últimas 100 reproducciones `{event_title, ip, user_agent, created_at}`.

- [ ] **Step 1: Pruebas que fallan** — usuario con plays desde 4 IPs en 24 h aparece; con 2 IPs no aparece; plays de hace 30 h no cuentan; no admin → 403.
- [ ] **Step 2:** Correr → FAIL. **Step 3:** Implementar. **Step 4:** Correr → PASS.
- [ ] **Step 5: Commit** — `feat: detección de cuentas sospechosas`.

---

### Task 9: Inicio de sesión en TV con código / QR

**Files:**
- Create: `app/Http/Controllers/TvLoginController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/TvLoginTest.php`

**Interfaces:**
- `POST /api/auth/tv-code {device_name}` → `201 {code, qr_url, expires_at}`; `code` = 6 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; vence en 10 min; `qr_url` = `{FRONTEND_URL}/vincular?code=<code>`. Límite 10/min por IP.
- `GET /api/auth/tv-code/{code}` (el TV consulta cada 3 s) → `{status:"waiting"}` | `{status:"approved", token, user}` (el token se entrega **una sola vez**: luego se borra del registro) | `410 {code:"code_expired"}`.
- `POST /api/auth/tv-code/{code}/confirm` (auth, desde el celular) → aplica la regla de un dispositivo: borra **todos** los tokens del usuario (incluido el del celular), crea el token para el TV con el `device_name` guardado y lo deja en el código → `200 {message:"Listo. Tu TV ya está conectado. Esta sesión del celular se cerró."}`. Código vencido o ya usado → 410.

- [ ] **Step 1: Pruebas que fallan** — flujo completo (crear → waiting → confirmar → approved con token → segunda consulta ya no trae token); `test_confirm_logs_out_phone` (token del celular → 401); `test_expired_code_returns_410` (con `travel(11)->minutes()`); alfabeto del código sin `0 O 1 I`.
- [ ] **Step 2:** Correr → FAIL. **Step 3:** Implementar. **Step 4:** Correr → PASS.
- [ ] **Step 5: Commit** — `feat: vincular TV con código y QR`.

---

### Task 10: Preparación para Hostinger

**Files:**
- Create: `backend/deploy/README-hostinger.md`, `backend/deploy/public_html/api/index.php`, `backend/deploy/public_html/api/.htaccess`, `backend/config/cors.php` (publicado)
- Test: `tests/Feature/CorsTest.php`

**Interfaces:**
- Estructura en el servidor: Laravel en `~/domains/<dominio>/laravel/`; `public_html/api/index.php` carga `../../laravel/vendor/autoload.php` y `../../laravel/bootstrap/app.php` (igual que `public/index.php` con rutas ajustadas); el `.htaccess` reescribe todo `/api/*` a ese `index.php`. `public_html/storage` → symlink a `laravel/storage/app/public`.
- CORS: `allowed_origins` = `[FRONTEND_URL]` + `capacitor://localhost`, `http://localhost`, `https://localhost` (APK); rutas `api/*`.
- README en español, paso a paso: crear BD MySQL en hPanel, PHP 8.3, subir por Git/SSH, `composer install --no-dev -o`, `.env`, `php artisan migrate --force --seed`, `php artisan ppt:create-admin`, configurar correo SMTP del dominio, SSL, y verificar `https://<dominio>/api/health`.

- [ ] **Step 1: Prueba que falla** — `CorsTest`: `OPTIONS /api/health` con `Origin: capacitor://localhost` devuelve `Access-Control-Allow-Origin: capacitor://localhost`; con `Origin: https://evil.example` no lo devuelve.
- [ ] **Step 2:** Correr → FAIL. **Step 3:** Implementar config y archivos de despliegue. **Step 4:** Correr → PASS; `php artisan test` completo → PASS; `php artisan route:list --path=api` muestra todas las rutas de las tareas 1–9.
- [ ] **Step 5: Commit** — `chore: archivos y guía de despliegue en Hostinger`.
