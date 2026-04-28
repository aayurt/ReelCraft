RBAC Policy and Guidelines

Overview
- This document describes the central RBAC policy used by the application and how it gates access to protected routes and UI elements.

Policy Model
- Roles: user, moderator, admin, owner
- Actions (examples): VIEW_MODERATOR_DASHBOARD, VIEW_DASHBOARD, READ_PROJECTS, WRITE_PROJECTS, MANAGE_USERS
- Backend and frontend share a consistent policy surface via canAccess(user, action).
- Policy binding: which roles are allowed to perform an action. Unknown actions are denied by default.

Key Rules
- VIEW_MODERATOR_DASHBOARD: moderator, admin, owner
- VIEW_DASHBOARD: all authenticated users (user, moderator, admin, owner)
- READ_PROJECTS: all authenticated users
- WRITE_PROJECTS: moderator, admin, owner
- MANAGE_USERS: admin, owner

Usage in Code
- Backend/API: Use canAccess(user, action) from lib/rbac.ts to gate server-side logic.
- Frontend: Use RbacGuard component (frontend/src/components/RbacGuard.tsx) to gate client-side rendering.
- UI: Use RoleBadge component (frontend/src/ui/RoleBadge.tsx) to present user roles consistently.

Migration Notes
- If you introduce new routes or actions, extend RBAC_POLICIES in lib/rbac.ts and add tests in tests/rbac.test.ts.
