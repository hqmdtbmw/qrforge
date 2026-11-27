import test from "node:test";
import assert from "node:assert/strict";
import { validateLogo, svgDimensions } from "../src/lib/utils.ts";

// Only the checks that run before any browser API is touched can be tested
// here. The dimension and aspect ratio checks for raster logos need
// FileReader and Image, so they are not covered in this suite. SVG logos
// are different: their size is read from the file text, so those checks
// run fine in plain Node.

// The 1MB size check is already covered above, by "a logo over 1MB is
// too big".

function makeFile(size: number, type: string, name = "logo.png"): File {
  return new File([new Uint8Array(size)], name, { type });
}

function makeSvg(content: string): File {
  return new File([content], "logo.svg", { type: "image/svg+xml" });
}

const svgWithSize = (width: string, height: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="red"/></svg>`;

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

test("an svg with width and height attributes is read from the file", async () => {
  const result = await validateLogo(makeSvg(svgWithSize("512", "512")));
  assert.deepEqual(result, { valid: true, width: 512, height: 512 });
});

test("an svg with px on the size attributes is read the same way", async () => {
  const result = await validateLogo(makeSvg(svgWithSize("300px", "300px")));
  assert.deepEqual(result, { valid: true, width: 300, height: 300 });
  assert.deepEqual(svgDimensions(svgWithSize("640px", "320px")), { width: 640, height: 320 });
});

test("an svg with only a viewBox uses the viewBox size", async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="100%" height="100%" fill="red"/></svg>`;
  const result = await validateLogo(makeSvg(svg));
  assert.deepEqual(result, { valid: true, width: 400, height: 400 });
});

test("an svg with a viewBox and a percentage size still uses the viewBox", async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 256 256"><rect width="100%" height="100%" fill="red"/></svg>`;
  assert.deepEqual(svgDimensions(svg), { width: 256, height: 256 });
  const result = await validateLogo(makeSvg(svg));
  assert.deepEqual(result, { valid: true, width: 256, height: 256 });
});

test("an svg with no size at all falls back instead of crashing", async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="red"/></svg>`;
  assert.equal(svgDimensions(svg), null);
  // In this Node run there is no Image to fall back to, so it comes back
  // as a failed load. In the browser the same file goes through the
  // normal Image path instead. Either way it does not throw.
  const result = await validateLogo(makeSvg(svg));
  assert.equal(result.valid, false);
  assert.equal(result.error, "Failed to load image.");
});

test("an oversized svg is now turned away", async () => {
  const result = await validateLogo(makeSvg(svgWithSize("3000", "3000")));
  assert.equal(result.valid, false);
  assert.equal(result.error, "Dimensions too large. Maximum is 2048x2048px.");
  assert.equal(result.width, 3000);
  assert.equal(result.height, 3000);
});

test("an oversized svg hiding behind a viewBox is turned away too", async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3000 1000"><rect width="100%" height="100%" fill="red"/></svg>`;
  const result = await validateLogo(makeSvg(svg));
  assert.equal(result.valid, false);
  assert.equal(result.error, "Dimensions too large. Maximum is 2048x2048px.");
});

test("an svg with the wrong shape is turned away", async () => {
  const result = await validateLogo(makeSvg(svgWithSize("1200", "500")));
  assert.equal(result.valid, false);
  assert.equal(result.error, "Invalid aspect ratio. Logo should be approximately square.");
});

test("svgDimensions returns null when there is no svg tag", () => {
  assert.equal(svgDimensions("just some text"), null);
  assert.equal(svgDimensions(""), null);
});
