import test from "node:test";
import assert from "node:assert/strict";
import {
  getRestrictedActions,
  getTierLimits,
  hasPermission,
} from "../src/lib/permissions.ts";

test("free users can make codes and see analytics, nothing more", () => {
  assert.equal(hasPermission("free", "create:qr"), true);
  assert.equal(hasPermission("free", "edit:qr"), true);
  assert.equal(hasPermission("free", "delete:qr"), true);
  assert.equal(hasPermission("free", "view:analytics"), true);
  assert.equal(hasPermission("free", "ai:generate"), false);
  assert.equal(hasPermission("free", "bulk:export"), false);
  assert.equal(hasPermission("free", "custom:domain"), false);
  assert.equal(hasPermission("free", "manage:org"), false);
  assert.equal(hasPermission("free", "whitelabel"), false);
  assert.equal(hasPermission("free", "admin:panel"), false);
});

test("pro unlocks AI, tasks and a custom domain", () => {
  assert.equal(hasPermission("pro", "ai:generate"), true);
  assert.equal(hasPermission("pro", "manage:tasks"), true);
  assert.equal(hasPermission("pro", "custom:domain"), true);
  assert.equal(hasPermission("pro", "bulk:export"), false);
  assert.equal(hasPermission("pro", "manage:org"), false);
  assert.equal(hasPermission("pro", "whitelabel"), false);
  assert.equal(hasPermission("pro", "admin:panel"), false);
});

test("business unlocks bulk export, orgs and whitelabel", () => {
  assert.equal(hasPermission("business", "bulk:export"), true);
  assert.equal(hasPermission("business", "manage:org"), true);
  assert.equal(hasPermission("business", "whitelabel"), true);
  assert.equal(hasPermission("business", "admin:panel"), false);
});

test("only admins see the admin panel", () => {
  assert.equal(hasPermission("admin", "admin:panel"), true);
  assert.equal(hasPermission("admin", "whitelabel"), true);
  assert.equal(hasPermission("admin", "bulk:export"), true);
});

test("no role means no permission", () => {
  assert.equal(hasPermission(undefined, "create:qr"), false);
  assert.equal(hasPermission(undefined, "view:analytics"), false);
});

test("trial users get everything except the admin panel", () => {
  assert.equal(hasPermission("free", "ai:generate", "trialing"), true);
  assert.equal(hasPermission("free", "bulk:export", "trialing"), true);
  assert.equal(hasPermission("free", "whitelabel", "trialing"), true);
  assert.equal(hasPermission("free", "admin:panel", "trialing"), false);
  assert.equal(hasPermission("admin", "admin:panel", "trialing"), true);
});

test("tier limits grow with the plan", () => {
  assert.equal(getTierLimits("free").maxQRs, 5);
  assert.equal(getTierLimits("free").maxDomains, 0);
  assert.equal(getTierLimits("pro").maxQRs, 50);
  assert.equal(getTierLimits("pro").maxDomains, 1);
  assert.equal(getTierLimits("business").maxQRs, 500);
  assert.equal(getTierLimits("business").maxDomains, 4);
  assert.equal(getTierLimits("business").canWhitelabel, true);
  assert.equal(getTierLimits("admin").maxQRs, 9999);
});

test("trial users get business limits", () => {
  assert.equal(getTierLimits("free", "trialing").maxQRs, 500);
  assert.equal(getTierLimits("free", "trialing").canWhitelabel, true);
});

test("no role falls back to the free limits", () => {
  assert.equal(getTierLimits(undefined).maxQRs, 5);
  assert.equal(getTierLimits(undefined).canManageOrg, false);
});

test("restricted actions are everything the role cannot do", () => {
  const freeRestricted = getRestrictedActions("free");
  assert.ok(freeRestricted.includes("ai:generate"));
  assert.ok(freeRestricted.includes("bulk:export"));
  assert.ok(freeRestricted.includes("admin:panel"));
  assert.ok(!freeRestricted.includes("create:qr"));

  assert.deepEqual(getRestrictedActions("admin"), []);
  assert.equal(getRestrictedActions(undefined).length, 11);
});
