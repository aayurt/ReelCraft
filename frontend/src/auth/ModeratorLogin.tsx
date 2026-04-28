"use client";
import Login from "./Login";

export default function ModeratorLogin() {
  // Moderator login path uses same credentials; gating is enforced server-side on protected routes
  return (
    <Login
      title={"Moderator Sign In"}
      redirectPath="/dashboard"
      testPrefill={true}
    />
  );
}
