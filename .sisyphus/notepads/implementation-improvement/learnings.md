## Learnings: Implementation Improvement
- Port plan artifacts to separate plan file when canonical plan is read-only to avoid blocking progress.
- Create minimal, scoping plans with clear Milestones, Owners, Risks, and Acceptance Criteria.
- Reuse existing RBAC patterns and design system components to minimize risk.
- Ensure QA coverage is baked into the planning phase (unit/integration/e2e, CI gating).
-
- Implemented centralized RBAC policy engine with backend and frontend guards, including backend/rbac.ts, backend/middlewares/rbacGuard.ts, frontend/RbacGuard.tsx, and RoleBadge.tsx. Extended tests (rbac.test.ts) and docs (rbac-policy.md). Validated via targeted unit tests and Playwright gating scenarios; build passes. Documented design rationale and ensured alignment with moderator role from auth improvements. Next gains: expand e2e coverage and consider middleware-level route gating for broader protection.
- NotAuthorized flow added: NotAuthorized page and logout/not-authorized API scaffold to support unauthorized user experiences. Gate /dashboard to NotAuthorized when authenticated but lacking permission. Added /api/moderation/* gating as example. Updated docs and tests to reflect gating pattern and UX guidance.
