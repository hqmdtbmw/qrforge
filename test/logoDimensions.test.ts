import test from "node:test";
import assert from "node:assert/strict";
import { checkLogoDimensions } from "../src/lib/utils.ts";

test("a normal square logo passes", () => {
  assert.deepEqual(checkLogoDimensions(512, 512), { valid: true, width: 512, height: 512 });
  assert.deepEqual(checkLogoDimensions(100, 100), { valid: true, width: 100, height: 100 });
});

test("a logo right at the 2048 limit passes", () => {
  assert.deepEqual(checkLogoDimensions(2048, 2048), { valid: true, width: 2048, height: 2048 });
  assert.deepEqual(checkLogoDimensions(2048, 1024), { valid: true, width: 2048, height: 1024 });
});

test("a logo at the edge of the allowed shape passes", () => {
  // 2 to 1 wide and 1 to 2 tall are the widest shapes we accept.
  assert.deepEqual(checkLogoDimensions(1024, 512), { valid: true, width: 1024, height: 512 });
  assert.deepEqual(checkLogoDimensions(512, 1024), { valid: true, width: 512, height: 1024 });
});

test("a logo one pixel over the size limit is turned away", () => {
  const wide = checkLogoDimensions(2049, 1024);
  assert.equal(wide.valid, false);
  assert.equal(wide.error, "Dimensions too large. Maximum is 2048x2048px.");
  assert.equal(wide.width, 2049);

  const tall = checkLogoDimensions(1024, 2049);
  assert.equal(tall.valid, false);
  assert.equal(tall.error, "Dimensions too large. Maximum is 2048x2048px.");
  assert.equal(tall.height, 2049);
});

test("a logo that is too wide for its height is turned away", () => {
  const result = checkLogoDimensions(1200, 500);
  assert.equal(result.valid, false);
  assert.equal(result.error, "Invalid aspect ratio. Logo should be approximately square.");
  assert.equal(result.width, 1200);
  assert.equal(result.height, 500);
});

test("a logo that is too tall for its width is turned away", () => {
  const result = checkLogoDimensions(500, 1200);
  assert.equal(result.valid, false);
  assert.equal(result.error, "Invalid aspect ratio. Logo should be approximately square.");
});

test("being too big beats being the wrong shape", () => {
  // 3000 by 1000 is both too big and too wide. The size error comes first,
  // same as it did before the checks moved into this helper.
  const result = checkLogoDimensions(3000, 1000);
  assert.equal(result.valid, false);
  assert.equal(result.error, "Dimensions too large. Maximum is 2048x2048px.");
});

test("a size of zero or less is treated like a broken image", () => {
  for (const [width, height] of [[0, 512], [512, 0], [0, 0], [-100, 512], [512, -100]] as const) {
    const result = checkLogoDimensions(width, height);
    assert.equal(result.valid, false);
    assert.equal(result.error, "Failed to load image.");
  }
});

test("a size that is not a number is treated like a broken image", () => {
  assert.equal(checkLogoDimensions(NaN, 512).valid, false);
  assert.equal(checkLogoDimensions(512, Infinity).valid, false);
  assert.equal(checkLogoDimensions(NaN, 512).error, "Failed to load image.");
});
