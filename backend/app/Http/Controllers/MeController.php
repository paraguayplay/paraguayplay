<?php

namespace App\Http\Controllers;

use App\Http\Resources\MeResource;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MeController extends Controller
{
    public function show(Request $request): MeResource
    {
        return new MeResource($request->user());
    }

    public function updatePassword(Request $request): Response
    {
        $request->validate([
            'current_password' => ['required', 'current_password:sanctum'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $request->user()->update(['password' => $request->input('password')]);

        return response()->noContent();
    }
}
