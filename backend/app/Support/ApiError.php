<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

class ApiError
{
    public static function make(string $code, string $message, int $status, array $extra = []): JsonResponse
    {
        return response()->json(array_merge(['code' => $code, 'message' => $message], $extra), $status);
    }
}
