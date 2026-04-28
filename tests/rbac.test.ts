import { test, expect } from '@playwright/test';
import { canAccess } from "../lib/rbac";

test('RBAC canAccess basic moderator access for moderator dashboard', async () => {
  expect(canAccess({ role: 'moderator' }, 'VIEW_MODERATOR_DASHBOARD')).toBe(true);
  expect(canAccess({ role: 'admin' }, 'VIEW_MODERATOR_DASHBOARD')).toBe(true);
  expect(canAccess({ role: 'user' }, 'VIEW_MODERATOR_DASHBOARD')).toBe(false);
});

test('RBAC permissions for projects write access', async () => {
  expect(canAccess({ role: 'user' }, 'WRITE_PROJECTS')).toBe(false);
  expect(canAccess({ role: 'moderator' }, 'WRITE_PROJECTS')).toBe(true);
  expect(canAccess({ role: 'admin' }, 'WRITE_PROJECTS')).toBe(true);
});
