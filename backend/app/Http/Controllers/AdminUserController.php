<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $q = User::query()
            ->select(['id', 'name', 'email', 'is_admin', 'created_at'])
            ->orderByDesc('id');

        if ($request->filled('q')) {
            $term = '%'.$request->string('q').'%';
            $q->where(function ($inner) use ($term) {
                $inner->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term);
            });
        }

        $perPage = (int) $request->input('per_page', 25);

        return response()->json($q->paginate($perPage));
    }
}
