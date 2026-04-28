"use client";
import Login from "@/frontend/src/auth/Login";

export default function LoginPage() {
  // Use test-prefill for testing convenience
  return <Login title="Welcome Back" redirectPath="/dashboard" testPrefill={true} />;
}
