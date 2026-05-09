<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Transaction extends Model
{
    use HasFactory;

  
    protected $fillable = [
        'from_account_id',
        'to_account_id',
        'initiator_user_id',
        'amount',
        'fee',
        'currency',
        'category',
        'status',
        'reference',
        'description',
        'executed_at',
    ];

    
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'fee' => 'decimal:2',
            'executed_at' => 'datetime',
        ];
    }

   
    public function fromAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'from_account_id');
    }

   
    public function toAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'to_account_id');
    }

  
    public function initiator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'initiator_user_id');
    }

  
    public function approval(): HasOne
    {
        return $this->hasOne(TransferApproval::class);
    }
}
