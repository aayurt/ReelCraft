import { test, expect } from '@playwright/test';
import { canAccess } from "../lib/rbac";

test('RBAC admin bypass for all actions', async () => {
  const admin = { role: 'admin' };
  const actions = ['VIEW_DASHBOARD','VIEW_MODERATOR_DASHBOARD','READ_PROJECTS','WRITE_PROJECTS','MANAGE_USERS'];
  for (const a of actions) {
    expect(canAccess(admin, a as any)).toBe(true);
  }
});

test('RBAC admin bypass with admin flag (no role field)', async () => {
  const adminFlag = { admin: true };
  const actions = ['VIEW_DASHBOARD','VIEW_MODERATOR_DASHBOARD','READ_PROJECTS','WRITE_PROJECTS','MANAGE_USERS'];
  for (const a of actions) {
    expect(canAccess(adminFlag as any, a as any)).toBe(true);
  }
});

test('RBAC admin bypass with permissions admin', async () => {
  const adminPerm = { permissions: ['admin'] };
  const actions = ['VIEW_DASHBOARD','VIEW_MODERATOR_DASHBOARD','READ_PROJECTS','WRITE_PROJECTS','MANAGE_USERS'];
  for (const a of actions) {
    expect(canAccess(adminPerm as any, a as any)).toBe(true);
  }
});
