<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory;

   
    public $timestamps = false;

    
    protected $fillable = [
        'user_id',
        'event_type',
        'resource_type',
        'resource_id',
        'ip_address',
        'user_agent',
        'meta_json',
    ];

    
    protected function casts(): array
    {
        return [
            'meta_json' => 'array',
            'created_at' => 'datetime',
        ];
    }

    
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
