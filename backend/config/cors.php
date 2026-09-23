<?php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [],
    'allowed_origins_patterns' => [
        '#^https://auto-correction-v0-1-i6yy.*\.vercel\.app$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    // Required for session cookies to be sent/received cross-origin.
    // 'allowed_origins' must stay a specific pattern (never '*') when this
    // is true -- browsers reject wildcard origins combined with credentials.
    'supports_credentials' => true,
];
