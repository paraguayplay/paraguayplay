<?php

namespace App\Http\Controllers;

use App\Models\Setting;

class PublicSettingsController extends Controller
{
    public function show()
    {
        return response()->json(collect(Setting::PUBLIC_KEYS)->mapWithKeys(fn ($k) => [$k => Setting::get($k)]));
    }
}
