import { NextResponse } from 'next/server';

export async function GET() {
  // Clear common session cookies; adjust names to match your environment if needed
  const headers: Record<string, string | string[]> = {
    'Set-Cookie': [
      'session=; Max-Age=0; Path=/; HttpOnly',
      'better_auth_session=; Max-Age=0; Path=/; HttpOnly',
    ],
  };
  return new NextResponse(JSON.stringify({ ok: true }), { status: 200, headers });
}
