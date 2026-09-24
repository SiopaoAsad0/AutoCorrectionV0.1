<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });

        // This backend is API-only -- there is no 'login' route to redirect
        // to. By default, Laravel's unauthenticated() handler tries to
        // redirect()->route('login') for requests that don't explicitly
        // send Accept: application/json (e.g. a URL pasted directly into
        // a browser), which crashes with "Route [login] not defined."
        // Always return a clean JSON 401 instead, regardless of how the
        // request was made.
        $this->renderable(function (AuthenticationException $e, $request) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        });
    }
}
