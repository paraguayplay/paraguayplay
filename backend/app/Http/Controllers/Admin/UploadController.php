<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function image(Request $request)
    {
        $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072']]);

        $src = imagecreatefromstring(file_get_contents($request->file('image')->getRealPath()));
        $scaled = imagescale($src, min(800, imagesx($src)));
        ob_start();
        imagewebp($scaled, null, 80);
        $bytes = ob_get_clean();
        imagedestroy($src);
        imagedestroy($scaled);

        $path = 'events/'.Str::uuid().'.webp';
        Storage::disk('public')->put($path, $bytes);

        return response()->json(['path' => $path, 'url' => Storage::disk('public')->url($path)], 201);
    }
}
