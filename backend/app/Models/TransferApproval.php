<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferApproval extends Model
{
    use HasFactory;

   
    protected $fillable = [
        'transaction_id',
        'required_approvals',
        'current_approvals',
        'status',
    ];

   
    protected function casts(): array
    {
        return [
            'required_approvals' => 'integer',
            'current_approvals' => 'integer',
        ];
    }

   
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
