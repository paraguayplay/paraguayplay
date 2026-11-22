<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SecurityController extends Controller
{
    public function suspicious(Request $request)
    {
        $data = $request->validate([
            'hours' => ['nullable', 'integer', 'min:1', 'max:720'],
            'min_ips' => ['nullable', 'integer', 'min:2', 'max:100'],
        ]);
        $hours = (int) ($data['hours'] ?? 24);
        $minIps = (int) ($data['min_ips'] ?? 3);

        $rows = DB::table('play_logs')
            ->where('created_at', '>=', now()->subHours($hours))
            ->groupBy('user_id')
            ->havingRaw('count(distinct ip) >= ?', [$minIps])
            ->selectRaw('user_id, count(distinct ip) as distinct_ips, count(*) as plays, max(created_at) as last_play_at')
            ->orderByDesc('distinct_ips')
            ->limit(100)
            ->get();

        $users = User::with('plan')->whereIn('id', $rows->pluck('user_id'))->get()->keyBy('id');

        return response()->json($rows->map(fn ($r) => [
            'user' => new AdminUserResource($users[$r->user_id]),
            'distinct_ips' => (int) $r->distinct_ips,
            'plays' => (int) $r->plays,
            'last_play_at' => Carbon::parse($r->last_play_at)->toIso8601String(),
        ])->values());
    }

    public function plays(User $user)
    {
        return response()->json(DB::table('play_logs')
            ->join('events', 'events.id', '=', 'play_logs.event_id')
            ->where('play_logs.user_id', $user->id)
            ->orderByDesc('play_logs.id')
            ->limit(100)
            ->get(['events.title as event_title', 'play_logs.ip', 'play_logs.user_agent', 'play_logs.created_at'])
            ->map(fn ($r) => [
                'event_title' => $r->event_title,
                'ip' => $r->ip,
                'user_agent' => $r->user_agent,
                'created_at' => Carbon::parse($r->created_at)->toIso8601String(),
            ]));
    }
}
