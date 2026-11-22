<?php

namespace Tests\Unit;

use App\Support\Money;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_formats_guaranies(): void
    {
        $this->assertSame('Gs 5.000', Money::gs(5000));
        $this->assertSame('Gs 240.000', Money::gs(240000));
        $this->assertSame('Gs 0', Money::gs(0));
    }
}
