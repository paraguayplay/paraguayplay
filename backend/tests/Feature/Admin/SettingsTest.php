<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_save_and_read_settings(): void
    {
        $admin = User::factory()->admin()->create();
        $data = ['bank_info' => 'Banco Itaú - Cta 123', 'support_whatsapp' => '595981123456', 'help_text' => 'Ayuda', 'apk_url' => 'https://x.com/app.apk'];
        $this->actingAs($admin, 'sanctum')->putJson('/api/admin/settings', $data)->assertOk()->assertExactJson($data);
        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/settings')->assertExactJson($data);
        $this->getJson('/api/settings/public')->assertJsonPath('support_whatsapp', '595981123456');
    }

    public function test_whatsapp_must_be_digits(): void
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin, 'sanctum')->putJson('/api/admin/settings', ['support_whatsapp' => '+595 981 abc'])->assertStatus(422);
    }
}
