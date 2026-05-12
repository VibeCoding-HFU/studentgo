import assert from "node:assert/strict";
import test from "node:test";
import { configuredCorsOrigin } from "../src/shared/security";
import { requiredPassword, requiredString, numericId } from "../src/shared/validation";
import { HttpError } from "../src/shared/http/http-error";
import { normalizePublicKeyJson } from "../src/shared/public-key";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

test("uses local CORS origins by default outside production", () => {
  const previousOrigin = process.env.CORS_ORIGIN;
  const previousNodeEnv = process.env.NODE_ENV;

  delete process.env.CORS_ORIGIN;
  Object.assign(process.env, { NODE_ENV: "test" });

  assert.deepEqual(configuredCorsOrigin(), [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
  ]);

  restoreEnv("CORS_ORIGIN", previousOrigin);
  restoreEnv("NODE_ENV", previousNodeEnv);
});

test("allows explicit comma-separated CORS origins", () => {
  const previousOrigin = process.env.CORS_ORIGIN;
  process.env.CORS_ORIGIN = "https://app.example.test, https://admin.example.test ";

  assert.deepEqual(configuredCorsOrigin(), ["https://app.example.test", "https://admin.example.test"]);

  restoreEnv("CORS_ORIGIN", previousOrigin);
});

test("rejects missing required fields with HttpError", () => {
  assert.equal(requiredString("  title  ", "title"), "title");
  assert.equal(requiredPassword("12345678"), "12345678");
  assert.equal(numericId("42"), 42);

  assert.throws(() => requiredString(" ", "title"), HttpError);
  assert.throws(() => requiredPassword("short"), HttpError);
  assert.throws(() => numericId("abc"), HttpError);
});

test("accepts only RSA public JWK strings for account public keys", () => {
  const publicKeyJson = JSON.stringify({ e: "AQAB", kty: "RSA", n: "sample" });

  assert.equal(normalizePublicKeyJson(publicKeyJson), publicKeyJson);
  assert.equal(normalizePublicKeyJson(JSON.stringify({ kty: "oct", k: "secret" })), null);
  assert.equal(normalizePublicKeyJson("not-json"), null);
  assert.equal(normalizePublicKeyJson(""), null);
});
