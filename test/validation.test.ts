import test from "node:test";
import assert from "node:assert/strict";
import { validateLogo } from "../src/lib/utils.ts";

// Only the checks that run before any browser API is touched can be tested
// here. The dimension and aspect ratio checks need FileReader and Image, so
// they are not covered in this suite.

function makeFile(size: number, type: string, name = "logo.png"): File {
  return new File([new Uint8Array(size)], name, { type });
}

test("a gif is turned away, only png, jpeg and svg are allowed", async () => {
  const result = await validateLogo(makeFile(1000, "image/gif", "logo.gif"));
  assert.equal(result.valid, false);
  assert.equal(result.error, "Invalid file type. Only PNG, JPEG, and SVG are allowed.");
});

test("a text file is not a logo", async () => {
  const result = await validateLogo(makeFile(1000, "text/plain", "notes.txt"));
  assert.equal(result.valid, false);
  assert.equal(result.error, "Invalid file type. Only PNG, JPEG, and SVG are allowed.");
});

test("a file with no type at all is rejected too", async () => {
  const result = await validateLogo(makeFile(1000, "", "logo"));
  assert.equal(result.valid, false);
  assert.equal(result.error, "Invalid file type. Only PNG, JPEG, and SVG are allowed.");
});

test("a logo over 1MB is too big", async () => {
  const result = await validateLogo(makeFile(1024 * 1024 + 1, "image/png"));
  assert.equal(result.valid, false);
  assert.equal(result.error, "File too large. Maximum size is 1MB.");
});

test("the type check runs before the size check", async () => {
  const result = await validateLogo(makeFile(2 * 1024 * 1024, "image/gif", "big.gif"));
  assert.equal(result.valid, false);
  assert.equal(result.error, "Invalid file type. Only PNG, JPEG, and SVG are allowed.");
});
