# Learnings: Auth Improvement

- Implemented moderator RBAC flow via role field on users and route guards on dashboard.
- Reused shared login UI components to support moderator login pathway at /login/moderator.
- Added forgot-password UI and server API endpoint leveraging Better Auth's password reset hook.
- Extended database schema with a role column for users to support RBAC decisions.
- Created Playwright tests for login success/failure, moderator path, and forgot-password flow.
- Aligned UI with existing Tailwind design patterns to maintain design system consistency.
