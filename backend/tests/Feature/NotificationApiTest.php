<?php

namespace Tests\Feature;

use App\Models\BankNotification;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_and_mark_notifications_as_read(): void
    {
        $user = $this->createUser('notify-user@example.com');
        $other = $this->createUser('notify-other@example.com');

        $unreadOne = BankNotification::query()->create([
            'user_id' => $user->id,
            'type' => 'transaction',
            'title' => 'Maksajums sanemts',
            'message' => 'Ienakoss maksajums 50 EUR',
            'is_read' => false,
            'sent_at' => now(),
        ]);

        BankNotification::query()->create([
            'user_id' => $user->id,
            'type' => 'system',
            'title' => 'Konta atjauninajums',
            'message' => 'Ludzu parbaudiet datus',
            'is_read' => false,
            'sent_at' => now(),
        ]);

        BankNotification::query()->create([
            'user_id' => $user->id,
            'type' => 'system',
            'title' => 'Izlasits pazinojums',
            'message' => 'Jau izlasits',
            'is_read' => true,
            'sent_at' => now(),
        ]);

        $foreignNotification = BankNotification::query()->create([
            'user_id' => $other->id,
            'type' => 'security',
            'title' => 'Cits lietotajs',
            'message' => 'Nepieder aktivajam lietotajam',
            'is_read' => false,
            'sent_at' => now(),
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/notifications?is_read=0&per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.unread_count', 2)
            ->assertJsonCount(2, 'notifications.data');

        $this->patchJson('/api/notifications/'.$unreadOne->id.'/read')
            ->assertOk()
            ->assertJsonPath('message', 'Notification marked as read')
            ->assertJsonPath('notification.is_read', true);

        $this->postJson('/api/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('message', 'Notifications marked as read')
            ->assertJsonPath('updated_count', 1);

        $this->getJson('/api/notifications?per_page=10')
            ->assertOk()
            ->assertJsonPath('meta.unread_count', 0);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event_type' => 'notification.read',
            'resource_id' => $unreadOne->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event_type' => 'notification.read_all',
        ]);

        $this->getJson('/api/notifications/'.$foreignNotification->id)
            ->assertForbidden();
    }

    private function createUser(string $email): User
    {
        $role = Role::query()->firstOrCreate(
            ['code' => 'user'],
            ['name_lv' => 'Lietotajs']
        );

        return User::query()->create([
            'role_id' => $role->id,
            'name' => explode('@', $email)[0],
            'email' => $email,
            'password' => 'Password123!',
            'status' => 'active',
        ]);
    }
}
