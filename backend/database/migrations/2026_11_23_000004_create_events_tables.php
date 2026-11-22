<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->string('category');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();
            $table->boolean('is_visible')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->timestamps();
            $table->index(['is_visible', 'starts_at']);
        });

        Schema::create('event_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['hls', 'dash', 'web']);
            $table->text('url');
            $table->string('label');
            $table->integer('sort_order')->default(0);
            $table->enum('drm_type', ['none', 'clearkey', 'widevine'])->default('none');
            $table->json('drm_clearkeys')->nullable();
            $table->text('drm_license_url')->nullable();
            $table->json('headers')->nullable();
            $table->boolean('use_proxy')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_links');
        Schema::dropIfExists('events');
    }
};
