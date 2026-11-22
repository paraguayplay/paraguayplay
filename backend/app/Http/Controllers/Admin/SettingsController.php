<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show()
    {
        return response()->json(collect(Setting::PUBLIC_KEYS)->mapWithKeys(fn ($k) => [$k => Setting::get($k)]));
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'bank_info' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'support_whatsapp' => ['sometimes', 'nullable', 'regex:/^\d{8,15}$/'],
            'help_text' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'apk_url' => ['sometimes', 'nullable', 'url', 'max:500'],
        ]);

        foreach ($data as $key => $value) {
            Setting::put($key, $value);
        }

        return $this->show();
    }
}
