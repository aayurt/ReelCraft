"use client";

import React, { PropsWithChildren, useEffect, useState } from "react";
import { createAuthClient } from "better-auth/client";
import { canAccess } from "@/lib/rbac";

type RbacGuardProps = {
  action: string; // RBAC action key, e.g. VIEW_MODERATOR_DASHBOARD
  redirectTo?: string;
  fallback?: React.ReactNode;
};

// Lightweight client-side guard for rendering only if user has required permission
export function RbacGuard({ children, action, redirectTo = "/login", fallback = null }: PropsWithChildren<RbacGuardProps>) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const client = createAuthClient({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
    });
    client.getSession().then((res: any) => {
      const session = (res as any)?.data?.session ?? (res as any)?.session;
      const ok = !!session && canAccess(session.user, action);
      if (mounted) setAllowed(ok);
      if (!ok && mounted) {
        // Redirect on client side if not allowed
        window.location.assign(redirectTo);
      }
    }).catch(() => {
      if (mounted) setAllowed(false);
    });
    return () => { mounted = false; };
  }, [action, redirectTo]);

  if (allowed === null) return null; // loading
  if (!allowed) return null;
  return <>{children}</>;
}
