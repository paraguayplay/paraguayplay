<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public function __construct(public string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim(config('app.frontend_url'), '/').'/restablecer?'.http_build_query([
            'token' => $this->token,
            'email' => $notifiable->email,
        ]);

        return (new MailMessage)
            ->subject('PARAGUAY PLAY TV — Restablecer contraseña')
            ->greeting('Hola '.$notifiable->name.',')
            ->line('Recibimos un pedido para restablecer la contraseña de tu cuenta.')
            ->action('Crear nueva contraseña', $url)
            ->line('El enlace vence en 60 minutos. Si no lo pediste, ignora este correo.')
            ->salutation('PARAGUAY PLAY TV');
    }
}
