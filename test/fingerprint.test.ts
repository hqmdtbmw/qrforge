import test from "node:test";
import assert from "node:assert/strict";
import { hashFingerprint } from "../src/lib/fingerprint.ts";

test("hashFingerprint turns a short string into a short base36 id", () => {
  assert.equal(hashFingerprint("abc"), "22ci");
  assert.equal(hashFingerprint("hello world"), "to5x38");
});

test("hashFingerprint of an empty string is zero", () => {
  assert.equal(hashFingerprint(""), "0");
});

test("hashFingerprint gives the same answer every time", () => {
  const signals =
    "Chrome|120|Windows|10|Pixel|mobile|Google|en-US|1920|1080|24|-60|true|true|true";
  assert.equal(hashFingerprint(signals), "njaitc");
  assert.equal(hashFingerprint(signals), hashFingerprint(signals));
});

test("hashFingerprint changes when one signal changes", () => {
  const a = hashFingerprint("Chrome|120|Windows|10");
  const b = hashFingerprint("Chrome|121|Windows|10");
  assert.notEqual(a, b);
});
