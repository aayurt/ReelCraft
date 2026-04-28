"use client";
import ModeratorLogin from "@/frontend/src/auth/ModeratorLogin";

export default function ModeratorLoginPage() {
  // Renders moderator login UI; actual RBAC enforcement happens on protected routes
  return <ModeratorLogin />;
}
