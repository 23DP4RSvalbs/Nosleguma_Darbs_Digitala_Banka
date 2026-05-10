<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner_user_id',
        'iban',
        'name',
        'currency',
        'balance',
        'type',
        'company_name',
        'registration_number',
        'vat_number',
        'first_name',
        'last_name',
        'personal_code',
        'status',
    ];

   
    protected function casts(): array
    {
        return [
            'balance' => 'decimal:2',
        ];
    }

    
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

   
    public function memberships(): HasMany
    {
        return $this->hasMany(AccountMember::class);
    }

   
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'account_members')
            ->withPivot(['member_role', 'daily_limit'])
            ->withTimestamps();
    }

    
    public function outgoingTransactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'from_account_id');
    }

  
    public function incomingTransactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'to_account_id');
    }
}
