<?php

namespace Tests\Unit;

use App\Services\SubscriptionService;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class SubscriptionExpiryTest extends TestCase
{
    public function test_compute_expiry(): void
    {
        $now = Carbon::parse('2026-12-01 10:00:00');
        $s = new SubscriptionService;

        $this->assertEquals($now->copy()->addDays(7), $s->computeExpiry(null, 7, $now));
        $this->assertEquals($now->copy()->addDays(30), $s->computeExpiry($now->copy()->subDays(3), 30, $now));
        $this->assertEquals($now->copy()->addDays(35), $s->computeExpiry($now->copy()->addDays(5), 30, $now));
    }
}
