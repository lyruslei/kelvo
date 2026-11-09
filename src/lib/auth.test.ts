import { test } from "node:test";
import assert from "node:assert/strict";
import { createToken, verifyToken, checkPassword, authConfigured, TOKEN_TTL_MS } from "./auth.ts";

const SECRET = "test-secret-0123456789";
const NOW = 1_700_000_000_000;

test("a fresh token verifies", () => {
  assert.equal(verifyToken(createToken(SECRET, NOW), SECRET, NOW + 1000), true);
});

test("a token expires after the TTL", () => {
  assert.equal(verifyToken(createToken(SECRET, NOW), SECRET, NOW + TOKEN_TTL_MS + 1), false);
});

test("a token signed with another secret is rejected", () => {
  assert.equal(verifyToken(createToken("other-secret", NOW), SECRET, NOW), false);
});

test("a tampered payload is rejected", () => {
  const [, sig] = createToken(SECRET, NOW).split(".");
  const forged = Buffer.from(JSON.stringify({ exp: NOW * 2 })).toString("base64url");
  assert.equal(verifyToken(`${forged}.${sig}`, SECRET, NOW), false);
});

test("junk and missing values are rejected", () => {
  for (const t of [undefined, null, "", "abc", "a.b.c", 42]) assert.equal(verifyToken(t, SECRET, NOW), false);
  assert.equal(verifyToken(createToken(SECRET, NOW), undefined, NOW), false);
});

test("password check", () => {
  assert.equal(checkPassword("correct horse battery", "correct horse battery"), true);
  assert.equal(checkPassword("wrong", "correct horse battery"), false);
  assert.equal(checkPassword("", ""), false);
  assert.equal(checkPassword(undefined, "x"), false);
});

test("login is off until configured with a 12+ character password", () => {
  assert.equal(authConfigured({ APP_PASSWORD: "short", TOKEN_SECRET: "s" }), false);
  assert.equal(authConfigured({ APP_PASSWORD: "long-enough-pw", TOKEN_SECRET: undefined }), false);
  assert.equal(authConfigured({ APP_PASSWORD: "long-enough-pw", TOKEN_SECRET: "s" }), true);
});
