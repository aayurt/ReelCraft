import { canAccess } from "../rbac";

// Lightweight backend RBAC guard for protected routes (Express-like signature)
export const rbacGuard = (action: string) => {
  return (req: any, res: any, next: any) => {
    // Try to read user from typical session/auth properties
    const user = (req?.user) ?? (req?.session?.user) ?? null;
    if (canAccess(user, action)) {
      return next();
    }
    res.status?.(403).json({ error: "Forbidden" });
  };
};
