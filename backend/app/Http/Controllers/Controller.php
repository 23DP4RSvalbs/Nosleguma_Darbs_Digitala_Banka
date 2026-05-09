<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

abstract class Controller
{
  
    protected function writeAudit(
        Request $request,
        string $eventType,
        ?string $resourceType = null,
        int|string|null $resourceId = null,
        ?array $meta = null
    ): void {
        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'event_type' => $eventType,
            'resource_type' => $resourceType,
            'resource_id' => is_numeric($resourceId) ? (int) $resourceId : null,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 255),
            'meta_json' => $meta,
        ]);
    }
}
