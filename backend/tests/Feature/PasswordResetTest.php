<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_password_sends_notification(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'ana@mail.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => ' ANA@mail.com '])->assertOk()
            ->assertJsonPath('message', 'Si el correo está registrado, te enviamos un enlace.');

        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($n) use ($user) {
            $mail = $n->toMail($user);

            return str_contains($mail->actionUrl, config('app.frontend_url').'/restablecer?token=')
                && str_contains($mail->actionUrl, 'email=ana%40mail.com')
                && $mail->subject === 'PARAGUAY PLAY TV — Restablecer contraseña';
        });
    }

    public function test_unknown_email_returns_same_200(): void
    {
        Notification::fake();
        $this->postJson('/api/auth/forgot-password', ['email' => 'nadie@mail.com'])->assertOk()
            ->assertJsonPath('message', 'Si el correo está registrado, te enviamos un enlace.');
        Notification::assertNothingSent();
    }

    private function requestToken(User $user): string
    {
        $token = null;
        Notification::fake();
        $this->postJson('/api/auth/forgot-password', ['email' => $user->email]);
        Notification::assertSentTo($user, ResetPasswordNotification::class, function ($n) use (&$token) {
            $token = $n->token;

            return true;
        });

        return $token;
    }

    public function test_reset_changes_password_and_revokes_tokens(): void
    {
        $user = User::factory()->create(['email' => 'ana@mail.com']);
        $user->createToken('celu');
        $token = $this->requestToken($user);

        $this->postJson('/api/auth/reset-password', [
            'email' => 'ana@mail.com', 'token' => $token, 'password' => 'nuevaClave1', 'password_confirmation' => 'nuevaClave1',
        ])->assertOk();

        $this->assertTrue(Hash::check('nuevaClave1', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_reset_token_cannot_be_reused(): void
    {
        $user = User::factory()->create(['email' => 'ana@mail.com']);
        $token = $this->requestToken($user);
        $body = ['email' => 'ana@mail.com', 'token' => $token, 'password' => 'nuevaClave1', 'password_confirmation' => 'nuevaClave1'];

        $this->postJson('/api/auth/reset-password', $body)->assertOk();
        $this->postJson('/api/auth/reset-password', $body)->assertStatus(422)->assertJsonPath('code', 'invalid_reset_token');
    }
}
