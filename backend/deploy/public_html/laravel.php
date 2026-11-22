<?php

/*
 * PARAGUAY PLAY TV — punto de entrada de la API en Hostinger.
 * Este archivo va en public_html/. El proyecto Laravel vive en ../laravel/ (fuera de public_html).
 * El .htaccess envía todas las rutas /api/* a este archivo.
 */

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$laravel = __DIR__.'/../laravel';

if (file_exists($maintenance = $laravel.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $laravel.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once $laravel.'/bootstrap/app.php';

$app->usePublicPath(__DIR__);

$app->handleRequest(Request::capture());
