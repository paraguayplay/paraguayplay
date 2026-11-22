<?php

namespace App\Http\Controllers;

use App\Http\Resources\PlanResource;
use App\Models\Plan;

class PlanController extends Controller
{
    public function index()
    {
        return PlanResource::collection(Plan::where('is_active', true)->orderBy('sort_order')->orderBy('id')->get());
    }
}
