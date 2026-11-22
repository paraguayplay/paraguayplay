<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_hides_urls(): void
    {
        $link = EventLink::factory()->create();
        $res = $this->actingAs(User::factory()->active()->create(), 'sanctum')->getJson('/api/catalog')->assertOk();
        $this->assertStringNotContainsString($link->url, $res->getContent());
        $res->assertJsonPath('live.0.link_count', 1)->assertJsonMissingPath('live.0.links');
    }

    public function test_live_upcoming_and_finished_split(): void
    {
        Event::factory()->create(['title' => 'En vivo', 'category' => 'Deportes']);
        Event::factory()->create(['title' => 'En vivo destacado', 'category' => 'Música', 'is_featured' => true]);
        Event::factory()->upcoming(48)->create(['title' => 'Pasado mañana']);
        Event::factory()->upcoming(2)->create(['title' => 'Pronto']);
        Event::factory()->finished()->create(['title' => 'Terminado']);
        Event::factory()->create(['title' => 'Sin fin', 'ends_at' => null, 'starts_at' => now()->subHours(1)]);

        $res = $this->actingAs(User::factory()->active()->create(), 'sanctum')->getJson('/api/catalog')->assertOk();

        $this->assertSame('En vivo destacado', $res->json('live.0.title'));
        $this->assertEqualsCanonicalizing(['En vivo', 'En vivo destacado', 'Sin fin'], array_column($res->json('live'), 'title'));
        $this->assertSame(['Pronto', 'Pasado mañana'], array_column($res->json('upcoming'), 'title'));
        $this->assertTrue($res->json('live.0.is_live'));
        $this->assertStringNotContainsString('Terminado', $res->getContent());
        $names = array_column($res->json('categories'), 'name');
        $this->assertContains('Deportes', $names);
        $this->assertContains('Música', $names);
    }

    public function test_hidden_events_excluded(): void
    {
        Event::factory()->create(['title' => 'Oculto', 'is_visible' => false]);
        Event::factory()->create(['title' => 'Visible']);
        $res = $this->actingAs(User::factory()->active()->create(), 'sanctum')->getJson('/api/catalog')->assertOk();
        $this->assertStringContainsString('Visible', $res->getContent());
        $this->assertStringNotContainsString('Oculto', $res->getContent());
    }

    public function test_pending_user_gets_403(): void
    {
        $this->actingAs(User::factory()->create(), 'sanctum')->getJson('/api/catalog')
            ->assertForbidden()->assertJsonPath('code', 'subscription_inactive');
    }
}
