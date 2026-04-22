<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminContactController extends Controller
{
    public function index(): JsonResponse
    {
        $items = ContactMessage::query()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ContactMessage $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'email' => $m->email,
                'message' => $m->message,
                'admin_reply' => $m->admin_reply,
                'replied_at' => $m->replied_at?->toIso8601String(),
                'created_at' => $m->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $items]);
    }

    public function reply(Request $request, ContactMessage $contactMessage): JsonResponse
    {
        $data = $request->validate([
            'admin_reply' => ['required', 'string', 'max:10000'],
        ]);

        $contactMessage->update([
            'admin_reply' => $data['admin_reply'],
            'replied_at' => now(),
        ]);

        return response()->json([
            'id' => $contactMessage->id,
            'admin_reply' => $contactMessage->admin_reply,
            'replied_at' => $contactMessage->replied_at?->toIso8601String(),
        ]);
    }
}
