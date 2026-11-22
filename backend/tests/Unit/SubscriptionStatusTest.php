<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class SubscriptionStatusTest extends TestCase
{
    private function user(string $status, ?string $expires): User
    {
        $u = new User;
        $u->status = $status;
        $u->expires_at = $expires ? Carbon::parse($expires) : null;

        return $u;
    }

    public function test_statuses(): void
    {
        $now = Carbon::parse('2026-12-01 10:00:00');
        $s = new SubscriptionService;

        $this->assertSame('pending', $s->status($this->user('pending', null), $now));
        $this->assertSame('suspended', $s->status($this->user('suspended', '2027-01-01'), $now));
        $this->assertSame('active', $s->status($this->user('active', '2026-12-01 10:00:01'), $now));
        $this->assertSame('expired', $s->status($this->user('active', '2026-12-01 10:00:00'), $now));
        $this->assertSame('expired', $s->status($this->user('active', null), $now));
    }

    public function test_days_left(): void
    {
        $now = Carbon::parse('2026-12-01 10:00:00');
        $s = new SubscriptionService;

        $this->assertSame(1, $s->daysLeft($this->user('active', '2026-12-01 12:00:00'), $now));
        $this->assertSame(7, $s->daysLeft($this->user('active', '2026-12-08 10:00:00'), $now));
        $this->assertNull($s->daysLeft($this->user('active', '2026-11-30'), $now));
        $this->assertNull($s->daysLeft($this->user('pending', null), $now));
    }
}
