<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class CreateAdmin extends Command
{
    protected $signature = 'ppt:create-admin {email} {name}';

    protected $description = 'Crea o actualiza la cuenta de administrador de PARAGUAY PLAY TV';

    public function handle(): int
    {
        $email = strtolower(trim($this->argument('email')));
        $password = (string) $this->secret('Contraseña (mínimo 8 caracteres)');

        if (strlen($password) < 8) {
            $this->error('La contraseña debe tener al menos 8 caracteres.');

            return self::FAILURE;
        }

        User::updateOrCreate(['email' => $email], [
            'name' => $this->argument('name'),
            'password' => $password,
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->info("Administrador listo: {$email}");

        return self::SUCCESS;
    }
}
