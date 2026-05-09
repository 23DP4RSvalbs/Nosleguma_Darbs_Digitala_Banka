<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountMember extends Model
{
    use HasFactory;

    
    protected $fillable = [
        'account_id',
        'user_id',
        'member_role',
        'daily_limit',
    ];

  
    protected function casts(): array
    {
        return [
            'daily_limit' => 'decimal:2',
        ];
    }

    
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }


    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
