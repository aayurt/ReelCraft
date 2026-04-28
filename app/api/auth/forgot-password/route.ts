import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, redirectTo } = await req.json();
    // Use Better Auth API to trigger password reset email.
    const res = await auth.api.requestPasswordReset({
      body: { email, redirectTo },
    } as any);
    if (!res || (res as any).ok === false) {
      return NextResponse.json({ error: "Reset failed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
