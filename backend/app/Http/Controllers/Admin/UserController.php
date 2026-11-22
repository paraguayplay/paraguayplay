<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Support\ApiError;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'status' => ['nullable', 'in:pending,active,expired,suspended'],
            'expiring_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'q' => ['nullable', 'string', 'max:100'],
        ]);
        $now = now();

        $query = User::query()->where('role', 'user')->with('plan')
            ->when($request->input('q'), function (Builder $q, string $term) {
                $like = '%'.strtolower($term).'%';
                $q->where(fn ($w) => $w->whereRaw('lower(name) like ?', [$like])
                    ->orWhere('email', 'like', $like)
                    ->orWhere('phone', 'like', '%'.$term.'%'));
            })
            ->when($request->input('status'), fn (Builder $q, string $status) => match ($status) {
                'pending', 'suspended' => $q->where('status', $status),
                'active' => $q->where('status', 'active')->where('expires_at', '>', $now),
                'expired' => $q->where('status', 'active')->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '<=', $now)),
            })
            ->when($request->filled('expiring_days'), fn (Builder $q) => $q->where('status', 'active')
                ->where('expires_at', '>', $now)
                ->where('expires_at', '<=', $now->copy()->addDays((int) $request->input('expiring_days'))))
            ->orderByDesc('created_at')->orderByDesc('id');

        return AdminUserResource::collection($query->paginate(25));
    }

    public function show(User $user): AdminUserResource
    {
        return new AdminUserResource($user->load('plan'));
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'status' => ['sometimes', 'in:pending,active,suspended'],
            'expires_at' => ['sometimes', 'nullable', 'date'],
            'plan_id' => ['sometimes', 'nullable', 'exists:plans,id'],
            'admin_notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'name' => ['sometimes', 'string', 'max:100'],
            'phone' => ['sometimes', 'string', 'max:30'],
        ]);

        $newStatus = $data['status'] ?? $user->status;
        $newExpiry = array_key_exists('expires_at', $data) ? $data['expires_at'] : $user->expires_at;
        if ($newStatus === 'active' && ! $newExpiry) {
            return ApiError::make('expires_at_required', 'Para activar la cuenta indica la fecha de vencimiento.', 422);
        }

        $user->update($data);

        return new AdminUserResource($user->fresh()->load('plan'));
    }

    public function destroySessions(User $user): Response
    {
        $user->tokens()->delete();

        return response()->noContent();
    }
}
