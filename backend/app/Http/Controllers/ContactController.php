<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $items = ContactMessage::query()
            ->where('email', $data['email'])
            ->orderBy('created_at')
            ->get([
                'id',
                'name',
                'email',
                'message',
                'admin_reply',
                'replied_at',
                'created_at',
                'updated_at',
            ]);

        return response()->json([
            'data' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'message' => ['required', 'string', 'max:5000'],
        ]);

        $msg = ContactMessage::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'message' => $data['message'],
        ]);

        return response()->json([
            'id' => $msg->id,
            'message' => 'Thanks — we received your message.',
        ], 201);
    }
}
