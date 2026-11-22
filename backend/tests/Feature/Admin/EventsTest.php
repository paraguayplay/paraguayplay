<?php

namespace Tests\Feature\Admin;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EventsTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
    }

    private function links(): array
    {
        return [
            ['type' => 'hls', 'url' => 'https://a.example/live.m3u8', 'label' => 'Servidor 1 HD'],
            ['type' => 'dash', 'url' => 'https://b.example/live.mpd', 'label' => 'Servidor 2', 'drm_type' => 'clearkey',
                'drm_clearkeys' => ['abcd' => '1234'], 'headers' => ['Referer' => 'https://b.example/'], 'use_proxy' => true],
        ];
    }

    public function test_create_event_with_links(): void
    {
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/events', [
            'title' => 'Final de la Copa', 'category' => 'Deportes', 'starts_at' => '2026-12-20T20:00:00',
            'is_featured' => true, 'links' => $this->links(),
        ])->assertCreated()
            ->assertJsonPath('title', 'Final de la Copa')
            ->assertJsonCount(2, 'links')
            ->assertJsonPath('links.1.drm_clearkeys.abcd', '1234')
            ->assertJsonPath('links.1.use_proxy', true);

        $this->assertSame(2, Event::find($res->json('id'))->links()->count());
    }

    public function test_replace_and_reorder_links(): void
    {
        $event = Event::factory()->create();
        $links = $this->links();
        $this->actingAs($this->admin, 'sanctum')->putJson("/api/admin/events/{$event->id}/links", ['links' => $links])->assertOk();
        $this->actingAs($this->admin, 'sanctum')->putJson("/api/admin/events/{$event->id}/links", ['links' => array_reverse($links)])
            ->assertOk()->assertJsonPath('links.0.label', 'Servidor 2')->assertJsonPath('links.1.label', 'Servidor 1 HD');
        $this->assertSame(2, $event->links()->count());
    }

    public function test_invalid_link_type_rejected(): void
    {
        $event = Event::factory()->create();
        $this->actingAs($this->admin, 'sanctum')->putJson("/api/admin/events/{$event->id}/links", [
            'links' => [['type' => 'rtmp', 'url' => 'rtmp://x', 'label' => 'x']],
        ])->assertStatus(422);
    }

    public function test_update_list_and_delete_event(): void
    {
        $event = Event::factory()->create();
        $this->actingAs($this->admin, 'sanctum')->putJson("/api/admin/events/{$event->id}", ['is_visible' => false, 'title' => 'Nuevo'])
            ->assertOk()->assertJsonPath('is_visible', false)->assertJsonPath('title', 'Nuevo');
        $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/events')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/admin/events/{$event->id}")->assertNoContent();
        $this->assertSame(0, Event::count());
    }

    public function test_upload_image_converts_to_webp(): void
    {
        Storage::fake('public');
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/uploads/image', [
            'image' => UploadedFile::fake()->image('a.jpg', 1600, 900),
        ])->assertCreated();

        $path = $res->json('path');
        $this->assertStringEndsWith('.webp', $path);
        Storage::disk('public')->assertExists($path);
        [$w] = getimagesizefromstring(Storage::disk('public')->get($path));
        $this->assertSame(800, $w);
    }
}
