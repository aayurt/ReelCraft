import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { canAccess } from '@/backend/src/rbac';

export async function GET(req: NextRequest) {
  // Extract session and enforce RBAC for moderation endpoints
  const headersList = Object.fromEntries(req.headers.entries()) as any;
  // BetterAuth cookies/session extraction compatible path
  const session = await (async () => {
    try {
      const res = await auth.api.getSession({ headers: headersList });
      return res?.data?.session ?? res?.session ?? null;
    } catch {
      return null;
    }
  })();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Gate based on moderator/admin ownership
  const allowed = canAccess(session.user, 'VIEW_MODERATOR_DASHBOARD');
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Sample payload for moderation endpoint
  return NextResponse.json({ ok: true, modTools: ['banUser','viewReports'] });
}
