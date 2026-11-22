<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('email');
            $table->enum('role', ['user', 'admin'])->default('user')->after('password');
            $table->enum('status', ['pending', 'active', 'suspended'])->default('pending')->after('role');
            $table->foreignId('plan_id')->nullable()->after('status')->constrained('plans')->nullOnDelete();
            $table->dateTime('expires_at')->nullable()->after('plan_id');
            $table->text('admin_notes')->nullable()->after('expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plan_id');
            $table->dropColumn(['phone', 'role', 'status', 'expires_at', 'admin_notes']);
        });
    }
};
