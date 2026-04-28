// Lightweight backend RBAC policy engine shared with frontend/global policy
export type Role = "user" | "moderator" | "admin" | "owner";
export type Action = string;

const RBAC_POLICIES: Record<Action, Role[]> = {
  VIEW_MODERATOR_DASHBOARD: ["moderator", "admin", "owner"],
  VIEW_DASHBOARD: ["user", "moderator", "admin", "owner"],
  READ_PROJECTS: ["user", "moderator", "admin", "owner"],
  WRITE_PROJECTS: ["moderator", "admin", "owner"],
  MANAGE_USERS: ["admin", "owner"],
};

export const getUserRole = (user: { role?: string; admin?: boolean; isAdmin?: boolean; permissions?: string[] } | null | undefined): Role => {
  // Explicit role first
  const explicit = user?.role;
  if (explicit && ["user", "moderator", "admin", "owner"].includes(explicit)) {
    return explicit as Role;
  }
  // Admin flags/permissions override
  if (user?.admin === true || user?.isAdmin === true) return "admin";
  if (Array.isArray(user?.permissions) && user.permissions.includes("admin")) return "admin";
  return "user";
};

export const canAccess = (user: { role?: string; admin?: boolean; isAdmin?: boolean; permissions?: string[] } | null | undefined, action: Action): boolean => {
  // Admin override via flags/permissions before anything else
  if (user?.admin === true || user?.isAdmin === true || (Array.isArray(user?.permissions) && user.permissions.includes("admin"))) {
    return true;
  }
  const role = getUserRole(user ?? null);
  const allowed = RBAC_POLICIES[action];
  if (!allowed) return false;
  return allowed.includes(role);
};

export const ensureAccess = (
  user: { role?: string } | null | undefined,
  action: Action
): boolean => {
  return canAccess(user, action);
};
