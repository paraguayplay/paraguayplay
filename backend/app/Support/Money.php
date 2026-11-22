<?php

namespace App\Support;

class Money
{
    public static function gs(int $amount): string
    {
        return 'Gs '.number_format($amount, 0, ',', '.');
    }
}
