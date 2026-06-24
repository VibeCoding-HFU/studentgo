import assert from "node:assert/strict";
import test, { before } from "node:test";

process.env.DATABASE_URL ??= `file:/tmp/studentgo-auth-service-${process.pid}.db`;
let authService: typeof import("../src/modules/auth/auth.service");

before(async () => {
  authService = await import("../src/modules/auth/auth.service");
});

test("normalizes auth input", () => {
  assert.equal(authService.normalizeEmail("  User@Example.COM "), "user@example.com");
  assert.equal(authService.normalizeName("  Alex Test  "), "Alex Test");
  assert.equal(authService.normalizeRole("ADMIN"), "ADMIN");
  assert.equal(authService.normalizeRole("MANAGER"), "MANAGER");
  assert.equal(authService.normalizeRole("unexpected"), "USER");
});

test("checks role escalation rules", () => {
  assert.equal(authService.canUseRole("ADMIN", "MANAGER"), true);
  assert.equal(authService.canUseRole("MANAGER", "ADMIN"), false);
  assert.equal(authService.canUseRole("MANAGER", "USER"), true);
  assert.equal(authService.canUseRole("USER", "MANAGER"), false);
});

test("hashes and verifies passwords", async () => {
  const first = await authService.hashPassword("correct horse battery staple");
  const second = await authService.hashPassword("correct horse battery staple");

  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(await authService.verifyPassword("correct horse battery staple", first.hash, first.salt), true);
  assert.equal(await authService.verifyPassword("wrong password", first.hash, first.salt), false);
});

test("hashes session tokens deterministically without storing the token", () => {
  const token = "sample-session-token";

  assert.equal(authService.hashSessionToken(token), authService.hashSessionToken(token));
  assert.notEqual(authService.hashSessionToken(token), token);
});

test("creates short numeric confirmation codes that expire after one hour", () => {
  const before = Date.now();
  const code = authService.createConfirmationCode();
  const expiresAt = authService.createConfirmationExpiry();
  const after = Date.now();

  assert.match(code, /^[1-9]\d{7}$/);
  assert.ok(expiresAt.getTime() >= before + 60 * 60 * 1000);
  assert.ok(expiresAt.getTime() <= after + 60 * 60 * 1000);
});
