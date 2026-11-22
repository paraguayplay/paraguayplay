<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
        });

        Schema::create('tv_login_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 6)->unique();
            $table->string('device_name');
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->text('token')->nullable();
            $table->text('session_key')->nullable();
            $table->boolean('consumed')->default(false);
            $table->dateTime('expires_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tv_login_codes');
        Schema::dropIfExists('settings');
    }
};
