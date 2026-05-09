<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankNotification extends Model
{
    use HasFactory;

   
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'is_read',
        'sent_at',
    ];

   
    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'sent_at' => 'datetime',
        ];
    }

   
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
