import test from "node:test";
import assert from "node:assert/strict";
import { computeImageSize } from "../src/lib/image.ts";

test("a wide photo scales down to the max width, keeping its shape", () => {
  assert.deepEqual(computeImageSize(1600, 900, 800, 800), { width: 800, height: 450 });
  assert.deepEqual(computeImageSize(1200, 800, 800, 800), { width: 800, height: 533.3333333333333 });
});

test("a tall photo scales down to the max height, keeping its shape", () => {
  assert.deepEqual(computeImageSize(600, 1200, 800, 800), { width: 400, height: 800 });
  assert.deepEqual(computeImageSize(700, 900, 800, 800), { width: 622.2222222222222, height: 800 });
});

test("a square photo scales both sides to the limit", () => {
  assert.deepEqual(computeImageSize(2000, 2000, 800, 800), { width: 800, height: 800 });
});

test("a photo that already fits is left alone", () => {
  assert.deepEqual(computeImageSize(400, 300, 800, 800), { width: 400, height: 300 });
  assert.deepEqual(computeImageSize(800, 600, 800, 800), { width: 800, height: 600 });
  assert.deepEqual(computeImageSize(600, 800, 800, 800), { width: 600, height: 800 });
});

test("custom limits are respected", () => {
  assert.deepEqual(computeImageSize(1600, 900, 400, 400), { width: 400, height: 225 });
  assert.deepEqual(computeImageSize(300, 900, 400, 400), { width: 133.33333333333331, height: 400 });
});

test("the defaults are 800 by 800", () => {
  assert.deepEqual(computeImageSize(1600, 900), { width: 800, height: 450 });
});
