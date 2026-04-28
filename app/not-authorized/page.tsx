"use client";

import React from "react";
import Link from "next/link";

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' , credentials: 'include'});
  } catch {
    // ignore logout errors
  }
  // Redirect to login after logout
  if (typeof window !== 'undefined') window.location.assign('/login');
}

export default function NotAuthorizedPage() {
  return (
    <main aria-label="Not Authorized" style={{ padding: '2rem', maxWidth: '720px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Not Authorized</h1>
      <p>
        You are authenticated but do not have permission to access this resource. If you believe you should have access,
        please request access from an administrator.
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link href="/request-access" style={{ padding: '0.6rem 1rem', background: '#0b5fff', color: 'white', borderRadius: '6px', textDecoration: 'none' }}>
          Request Access
        </Link>
        <button aria-label="Logout" onClick={logout} style={{ padding: '0.6rem 1rem', borderRadius: '6px' }}>
          Logout
        </button>
      </div>
    </main>
  );
}
