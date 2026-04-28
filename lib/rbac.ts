// Centralized RBAC helper for the application
// Provides a tiny, testable policy engine to gate server-side routes and UI.

export type Role = "user" | "moderator" | "admin" | "owner";
export type Action = string;

// Simple, explicit policy map: which roles are allowed to perform a given action
// on a given resource. The actions are semicolon-separated keys to keep it lightweight.
// Example actions: "VIEW_MODERATOR_DASHBOARD", "READ_PROJECTS", "WRITE_PROJECTS".
const RBAC_POLICIES: Record<Action, Role[]> = {
  // Moderator/admin dashboard access
  VIEW_MODERATOR_DASHBOARD: ["moderator", "admin", "owner"],

  // Basic access for all authenticated users
  VIEW_DASHBOARD: ["user", "moderator", "admin", "owner"],
  READ_PROJECTS: ["user", "moderator", "admin", "owner"],
  // Only moderators/admins can create or modify projects
  WRITE_PROJECTS: ["moderator", "admin", "owner"],
  // Admin-only operations
  MANAGE_USERS: ["admin", "owner"],
  // Extend as needed in the future
};

export type RBACPolicy = {
  action: Action;
  allowedRoles: Role[];
};

/**
 * Return the role for a user object, defaulting to "user" if missing.
 */
export const getUserRole = (user: { role?: string } | null | undefined): Role => {
  const role = user?.role ?? "user";
  // Enforce known role shapes; fallback to user if unknown
  if (role === "moderator" || role === "admin" || role === "owner" || role === "user") {
    return role as Role;
  }
  return "user";
};

/**
 * Check if a given user is allowed to perform an action.
 * If the action is unknown, by default deny.
 */
export const canAccess = (user: { role?: string } | null | undefined, action: Action): boolean => {
  const role = getUserRole(user ?? null);
  const policy = RBAC_POLICIES[action];
  if (!policy) return false; // Unknown action
  return policy.includes(role);
};

/**
 * Lightweight helper to throw or redirect in Next.js route handlers/pages.
 * Returns true if access is allowed, false otherwise.
 */
export const ensureAccess = (
  user: { role?: string } | null | undefined,
  action: Action
): boolean => {
  return canAccess(user, action);
};
