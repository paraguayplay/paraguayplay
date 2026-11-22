<?php

namespace Tests\Feature\Admin;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SuspiciousTest extends TestCase
{
    use RefreshDatabase;

    private function plays(User $user, array $ips, int $hoursAgo = 1): void
    {
        $event = Event::factory()->create(['title' => 'Partido']);
        foreach ($ips as $ip) {
            DB::table('play_logs')->insert([
                'user_id' => $user->id, 'event_id' => $event->id, 'ip' => $ip,
                'user_agent' => 'UA', 'created_at' => now()->subHours($hoursAgo),
            ]);
        }
    }

    public function test_lists_users_with_many_ips(): void
    {
        $admin = User::factory()->admin()->create();
        $sharer = User::factory()->active()->create(['name' => 'Comparte']);
        $normal = User::factory()->active()->create(['name' => 'Normal']);
        $old = User::factory()->active()->create(['name' => 'Viejo']);
        $this->plays($sharer, ['1.1.1.1', '2.2.2.2', '3.3.3.3', '4.4.4.4', '4.4.4.4']);
        $this->plays($normal, ['5.5.5.5', '6.6.6.6']);
        $this->plays($old, ['7.7.7.1', '7.7.7.2', '7.7.7.3', '7.7.7.4'], 30);

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/security/suspicious?hours=24&min_ips=3')
            ->assertOk()->assertJsonCount(1)
            ->assertJsonPath('0.user.name', 'Comparte')
            ->assertJsonPath('0.distinct_ips', 4)
            ->assertJsonPath('0.plays', 5);
    }

    public function test_user_plays_history(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->active()->create();
        $this->plays($user, ['1.1.1.1']);
        $this->actingAs($admin, 'sanctum')->getJson("/api/admin/users/{$user->id}/plays")
            ->assertOk()->assertJsonPath('0.event_title', 'Partido')->assertJsonPath('0.ip', '1.1.1.1');
    }

    public function test_non_admin_forbidden(): void
    {
        $this->actingAs(User::factory()->active()->create(), 'sanctum')
            ->getJson('/api/admin/security/suspicious')->assertForbidden();
    }
}
