import test from "node:test";
import assert from "node:assert/strict";
import { buildStandaloneSvg, svgDownloadFilename } from "../src/lib/svgDownload.ts";

const smallQr =
  '<svg width="256" height="256" viewBox="0 0 25 25">' +
  '<rect width="25" height="25" fill="#ffffff"/>' +
  '<rect x="0" y="0" width="1" height="1" fill="#000000"/>' +
  '<rect x="2" y="0" width="1" height="1" fill="#000000"/>' +
  "</svg>";

test("a plain svg gets the xml declaration and the xmlns it needs", () => {
  const out = buildStandaloneSvg(smallQr);
  assert.ok(out.startsWith('<?xml version="1.0" standalone="no"?>\r\n'));
  assert.ok(out.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(out.includes('<rect x="0" y="0" width="1" height="1" fill="#000000"/>'));
  assert.ok(out.includes('<rect x="2" y="0" width="1" height="1" fill="#000000"/>'));
});

test("the rects come out exactly as they went in, nothing redrawn", () => {
  const out = buildStandaloneSvg(smallQr);
  assert.equal((out.match(/<rect/g) || []).length, 3);
  assert.ok(out.endsWith("</svg>"));
});

test("a declaration and xmlns that are already there are left alone", () => {
  const already =
    '<?xml version="1.0" standalone="no"?>\r\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">' +
    '<rect width="25" height="25" fill="#ffffff"/>' +
    "</svg>";
  assert.equal(buildStandaloneSvg(already), already);
});

test("an svg with no shapes in it is refused, not saved as a blank file", () => {
  assert.throws(
    () => buildStandaloneSvg('<svg width="256" height="256"></svg>'),
    /no shapes in it/
  );
  assert.throws(
    () => buildStandaloneSvg('<svg width="256" height="256" />'),
    /no shapes in it/
  );
  assert.throws(
    () => buildStandaloneSvg('<svg width="256" height="256">\n  \n</svg>'),
    /no shapes in it/
  );
});

test("empty text and non-svg text are refused", () => {
  assert.throws(() => buildStandaloneSvg(""), /no svg to download/);
  assert.throws(() => buildStandaloneSvg("   \n  "), /no svg to download/);
  assert.throws(() => buildStandaloneSvg("<div>not a qr code</div>"), /not an svg/);
});

test("the filename is a plain qr-code name with a timestamp", () => {
  const name = svgDownloadFilename();
  assert.match(name, /^qr-code-\d+\.svg$/);
});
