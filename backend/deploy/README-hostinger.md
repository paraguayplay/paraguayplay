# Publicar el servidor de PARAGUAY PLAY TV en Hostinger (plan Premium)

Esta guía instala la API (cuentas, planes, eventos y panel) en tu hosting. La app y el panel visual se suben a la misma carpeta en los planes siguientes.

En los ejemplos se usa `paraguayplaytv.com`; cámbialo por tu dominio.

## 0. Lo que necesitas

- Plan Premium de Hostinger con el dominio conectado.
- Acceso SSH activado: en hPanel, **Avanzado → Acceso SSH**.

## 1. Preparar el hosting (hPanel)

1. **PHP 8.3:** en **Avanzado → Configuración de PHP**, elige la versión 8.3.
2. **Base de datos:** en **Bases de datos → Administración**, crea una base de datos MySQL. Anota el nombre de la base, el usuario y la contraseña.
3. **SSL:** en **Seguridad → SSL**, activa el certificado gratuito para el dominio.
4. **Correo:** en **Correos**, crea `soporte@paraguayplaytv.com`. Se usa para enviar los correos de "olvidé mi contraseña".

## 2. Subir el código por SSH

Conéctate por SSH (los datos están en hPanel → Acceso SSH):

```bash
cd ~/domains/paraguayplaytv.com
git clone <URL-de-tu-repositorio> repo
cp -r repo/backend laravel
cd laravel
composer install --no-dev --optimize-autoloader
```

La carpeta queda así. `laravel/` está **fuera** de `public_html`, así nadie puede ver el código desde el navegador:

```
domains/paraguayplaytv.com/
├── laravel/          ← servidor (privado)
└── public_html/      ← lo que se ve en la web
```

## 3. Configurar `.env`

```bash
cp .env.example .env
php artisan key:generate
nano .env
```

Completa estas líneas:

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://paraguayplaytv.com
FRONTEND_URL=https://paraguayplaytv.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_DATABASE=<nombre de la base>
DB_USERNAME=<usuario>
DB_PASSWORD=<contraseña>

MAIL_USERNAME=soporte@paraguayplaytv.com
MAIL_PASSWORD=<contraseña del correo>
MAIL_FROM_ADDRESS="soporte@paraguayplaytv.com"
```

> **Importante:** guarda una copia de `APP_KEY`. Si cambia, todas las sesiones se cierran y los enlaces firmados dejan de valer.

## 4. Crear las tablas y tu cuenta de administrador

```bash
php artisan migrate --force --seed
php artisan ppt:create-admin tu-correo@gmail.com "Tu Nombre"
php artisan config:cache
php artisan route:cache
```

- `migrate --seed` crea las tablas y los 3 planes (Semanal Gs 5.000, Mensual Gs 20.000, Anual Gs 240.000).
- `ppt:create-admin` te pide una contraseña de al menos 8 caracteres.

## 5. Conectar con `public_html`

```bash
cd ~/domains/paraguayplaytv.com
cp laravel/deploy/public_html/laravel.php public_html/
cp laravel/deploy/public_html/.htaccess public_html/
ln -s ../laravel/storage/app/public public_html/storage
```

## 6. Comprobar

Abre en el navegador `https://paraguayplaytv.com/api/health`. Debe mostrar:

```
{"ok":true}
```

Y `https://paraguayplaytv.com/api/plans` debe mostrar los 3 planes.

## Actualizar más adelante

```bash
cd ~/domains/paraguayplaytv.com/repo && git pull
rsync -a --exclude .env --exclude storage --exclude vendor backend/ ../laravel/
cd ../laravel
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
```

## Notas

- **Sin procesos en segundo plano:** todo funciona sin colas ni cron, lo que encaja con el hosting compartido.
- **Datos de pago y WhatsApp:** los datos bancarios, el número de WhatsApp de soporte y el enlace del APK se cargan desde el panel de administración.
- **Proxy de enlaces:** apágalo en los enlaces que no lo necesiten. Cada usuario mirando un enlace con proxy hace una petición liviana cada pocos segundos a tu hosting.
