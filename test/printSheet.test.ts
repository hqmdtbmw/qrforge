import test from "node:test";
import assert from "node:assert/strict";
import {
  fitSheetLabel,
  paginatePrintSheet,
  printSheetGrid,
  printSheetPlan,
  repeatSheetItems,
  sheetLabelMaxChars,
  type PrintSheetItem,
} from "../src/lib/printSheet.ts";

function items(count: number): PrintSheetItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `qr-${i + 1}`,
    name: `Code ${i + 1}`,
    content: `https://example.com/${i + 1}`,
  }));
}

test("an A4 large sheet holds 4 codes in a 2 by 2 grid", () => {
  const grid = printSheetGrid("a4", "large");
  assert.equal(grid.cols, 2);
  assert.equal(grid.rows, 2);
  assert.equal(grid.perPage, 4);
  assert.equal(grid.cellWidthMm, 95);
  assert.equal(grid.cellHeightMm, 138.5);
});

test("the medium and small layouts hold 9 and 16 codes a page", () => {
  assert.equal(printSheetGrid("a4", "medium").perPage, 9);
  assert.equal(printSheetGrid("a4", "small").perPage, 16);
  assert.equal(printSheetGrid("letter", "medium").perPage, 9);
});

test("a letter page is wider and shorter than A4, so its cells differ", () => {
  const a4 = printSheetGrid("a4", "medium");
  const letter = printSheetGrid("letter", "medium");
  assert.ok(letter.cellWidthMm > a4.cellWidthMm);
  assert.ok(letter.cellHeightMm < a4.cellHeightMm);
});

test("the code fits inside its cell with room for the label", () => {
  for (const layout of ["large", "medium", "small"] as const) {
    const grid = printSheetGrid("a4", layout);
    assert.ok(grid.codeSizeMm > 10);
    assert.ok(grid.codeSizeMm <= grid.cellWidthMm - 6);
    assert.ok(grid.codeSizeMm <= grid.cellHeightMm - 10);
  }
});

test("an unknown page size or layout is refused instead of guessing", () => {
  assert.throws(() => printSheetGrid("a3" as never, "medium"), /unknown page size/);
  assert.throws(() => printSheetGrid("a4", "huge" as never), /unknown sheet layout/);
});

test("a narrow cell still allows at least 8 label characters", () => {
  assert.equal(sheetLabelMaxChars(10), 8);
  assert.ok(sheetLabelMaxChars(95) > sheetLabelMaxChars(47.5));
});

test("a short label passes through untouched", () => {
  assert.equal(fitSheetLabel("Menu", 20), "Menu");
  assert.equal(fitSheetLabel("  Menu  ", 20), "Menu");
});

test("a long label is cut with an ellipsis and stays within the limit", () => {
  const fitted = fitSheetLabel("The Corner Bakery Summer Menu", 12);
  assert.equal(fitted, "The Corne...");
  assert.ok(fitted.length <= 12);
});

test("a label exactly at the limit is not cut", () => {
  assert.equal(fitSheetLabel("12345678", 8), "12345678");
});

test("a blank name shows as Untitled instead of leaving the code bare", () => {
  assert.equal(fitSheetLabel("", 20), "Untitled");
  assert.equal(fitSheetLabel("   ", 20), "Untitled");
});

test("pages split a list in order, with the last page holding the remainder", () => {
  const pages = paginatePrintSheet(items(10), 9);
  assert.equal(pages.length, 2);
  assert.equal(pages[0].length, 9);
  assert.equal(pages[1].length, 1);
  assert.equal(pages[1][0].id, "qr-10");
});

test("an exact multiple of the page size leaves no short last page", () => {
  assert.equal(paginatePrintSheet(items(18), 9).length, 2);
  assert.deepEqual(paginatePrintSheet(items(18), 9).map((p) => p.length), [9, 9]);
});

test("an empty list gives no pages", () => {
  assert.deepEqual(paginatePrintSheet([], 9), []);
});

test("a page that holds zero codes is refused", () => {
  assert.throws(() => paginatePrintSheet(items(3), 0), /at least one code/);
});

test("repeating one code fills the page with that code", () => {
  const one = items(1);
  const filled = repeatSheetItems(one, 4);
  assert.equal(filled.length, 4);
  assert.ok(filled.every((item) => item.id === "qr-1"));
});

test("repeating a short list cycles back to the start", () => {
  const filled = repeatSheetItems(items(2), 5);
  assert.deepEqual(
    filled.map((item) => item.id),
    ["qr-1", "qr-2", "qr-1", "qr-2", "qr-1"]
  );
});

test("repeating an empty list gives nothing back", () => {
  assert.deepEqual(repeatSheetItems([], 4), []);
  assert.deepEqual(repeatSheetItems(items(2), 0), []);
});

test("the plan counts pages and codes for a full sheet", () => {
  const plan = printSheetPlan(items(10), "a4", "medium");
  assert.equal(plan.pageCount, 2);
  assert.equal(plan.totalCodes, 10);
  assert.equal(plan.grid.perPage, 9);
  assert.equal(plan.pages[0].length, 9);
});

test("the plan has no pages when there are no codes", () => {
  const plan = printSheetPlan([], "a4", "medium");
  assert.equal(plan.pageCount, 0);
  assert.equal(plan.totalCodes, 0);
});

test("repeating a single code fills one page in the plan", () => {
  const plan = printSheetPlan(items(1), "a4", "medium", true);
  assert.equal(plan.pageCount, 1);
  assert.equal(plan.totalCodes, 9);
  assert.ok(plan.pages[0].every((item) => item.id === "qr-1"));
});

test("repeating is ignored when there is more than one code", () => {
  const plan = printSheetPlan(items(2), "a4", "medium", true);
  assert.equal(plan.pageCount, 1);
  assert.equal(plan.totalCodes, 2);
});
