<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'role_id',
        'name',
        'email',
        'preferred_currency',
        'locale',
        'timezone',
        'date_format',
        'amount_format',
        'address',
        'phone',
        'region',
        'country',
        'postal_code',
        'phone_country',
        'theme_mode',
        'email_notifications',
        'push_notifications',
        'marketing_notifications',
        'compact_mode',
        'default_dashboard_view',
        'mask_balances',
        'require_payment_confirmation',
        'profile_picture',
        'two_factor_secret',
        'two_factor_enabled',
        'two_factor_confirmed_at',
        'revision_requested_at',
        'password',
        'status',
    ];

  
    protected $hidden = [
        'password',
        'remember_token',
    ];

  
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_enabled' => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
            'revision_requested_at' => 'datetime',
            'password' => 'hashed',
            'email_notifications' => 'boolean',
            'push_notifications' => 'boolean',
            'marketing_notifications' => 'boolean',
            'compact_mode' => 'boolean',
            'mask_balances' => 'boolean',
            'require_payment_confirmation' => 'boolean',
        ];
    }

  
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

 
    public function ownedAccounts(): HasMany
    {
        return $this->hasMany(Account::class, 'owner_user_id');
    }

   
    public function accountMemberships(): HasMany
    {
        return $this->hasMany(AccountMember::class);
    }

   
    public function accounts(): BelongsToMany
    {
        return $this->belongsToMany(Account::class, 'account_members')
            ->withPivot(['member_role', 'daily_limit'])
            ->withTimestamps();
    }


    public function initiatedTransactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'initiator_user_id');
    }

 
    public function bankNotifications(): HasMany
    {
        return $this->hasMany(BankNotification::class);
    }


    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

 
    public function isAdmin(): bool
    {
        return $this->role?->code === 'admin';
    }

    public function hasCompleteProfile(): bool
    {
        foreach (['address', 'phone', 'region', 'country', 'postal_code'] as $field) {
            $value = $this->getAttribute($field);

            if (! is_string($value) || trim($value) === '') {
                return false;
            }
        }

        return true;
    }
}
