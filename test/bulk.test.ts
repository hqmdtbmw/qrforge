import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_BULK_ROWS,
  classifyBulkContent,
  namesByContent,
  parseBulkCsv,
  parseBulkText,
} from "../src/lib/bulk.ts";

test("classifyBulkContent calls http and https links", () => {
  assert.equal(classifyBulkContent("https://google.com"), "link");
  assert.equal(classifyBulkContent("http://example.com/page"), "link");
  assert.equal(classifyBulkContent("HTTPS://EXAMPLE.COM"), "link");
});

test("classifyBulkContent calls bare domains links", () => {
  assert.equal(classifyBulkContent("example.com"), "link");
  assert.equal(classifyBulkContent("www.example.com"), "link");
  assert.equal(classifyBulkContent("shop.example.co.uk/sale?x=1"), "link");
});

test("classifyBulkContent does not call near misses links", () => {
  // "httpfoo" was a link under the old startsWith check, it is not a URL.
  assert.equal(classifyBulkContent("httpfoo"), "text");
  assert.equal(classifyBulkContent("my site.com"), "text");
  assert.equal(classifyBulkContent("hello world"), "text");
  assert.equal(classifyBulkContent(""), "text");
  assert.equal(classifyBulkContent("   "), "text");
});

test("parseBulkText keeps one row per line in order", () => {
  const out = parseBulkText("https://google.com\nhello\nwww.apple.com");
  assert.equal(out.rows.length, 3);
  assert.deepEqual(out.rows[0], { content: "https://google.com", qrType: "link" });
  assert.deepEqual(out.rows[1], { content: "hello", qrType: "text" });
  assert.deepEqual(out.rows[2], { content: "www.apple.com", qrType: "link" });
  assert.equal(out.duplicates, 0);
  assert.equal(out.truncated, false);
});

test("parseBulkText drops blank lines and trims the rest", () => {
  const out = parseBulkText("  https://a.com  \n\n   \nhello\n");
  assert.deepEqual(out.rows.map((r) => r.content), ["https://a.com", "hello"]);
});

test("parseBulkText handles Windows line endings", () => {
  const out = parseBulkText("https://a.com\r\nhttps://b.com\r\n");
  assert.deepEqual(out.rows.map((r) => r.content), ["https://a.com", "https://b.com"]);
});

test("parseBulkText forges a repeated line only once and says so", () => {
  const out = parseBulkText("hello\nhttps://a.com\nhello\n  hello  \nhttps://a.com");
  assert.deepEqual(out.rows.map((r) => r.content), ["hello", "https://a.com"]);
  assert.equal(out.duplicates, 3);
});

test("parseBulkText stops at the cap and says it cut the rest", () => {
  const input = Array.from({ length: MAX_BULK_ROWS + 5 }, (_, i) => `item ${i}`).join("\n");
  const out = parseBulkText(input);
  assert.equal(out.rows.length, MAX_BULK_ROWS);
  assert.equal(out.truncated, true);
  assert.equal(out.duplicates, 0);
});

test("parseBulkText with nothing in it gives back nothing", () => {
  const out = parseBulkText("");
  assert.deepEqual(out.rows, []);
  assert.equal(out.duplicates, 0);
  assert.equal(out.truncated, false);
  assert.deepEqual(parseBulkText(" \n \n ").rows, []);
});

test("parseBulkCsv takes the first column as the content", () => {
  const out = parseBulkCsv("https://a.com\nhttps://b.com\nhello");
  assert.deepEqual(out.rows.map((r) => r.content), ["https://a.com", "https://b.com", "hello"]);
  assert.equal(out.rows[0].qrType, "link");
  assert.equal(out.rows[2].qrType, "text");
});

test("parseBulkCsv takes a second column as the name", () => {
  const out = parseBulkCsv("https://a.com,My shop\nhttps://b.com,");
  assert.equal(out.rows[0].name, "My shop");
  assert.equal(out.rows[1].name, undefined);
});

test("parseBulkCsv keeps commas inside quoted fields", () => {
  const out = parseBulkCsv('"hello, world"\n"one, two, three",Named');
  assert.equal(out.rows[0].content, "hello, world");
  assert.equal(out.rows[1].content, "one, two, three");
  assert.equal(out.rows[1].name, "Named");
});

test("parseBulkCsv reads a doubled quote as one literal quote", () => {
  const out = parseBulkCsv('"say ""hi"" now"');
  assert.equal(out.rows[0].content, 'say "hi" now');
});

test("parseBulkCsv skips a header row and blank first columns", () => {
  const out = parseBulkCsv("content,name\nhttps://a.com,Shop\n,No content here\nhello,");
  assert.deepEqual(out.rows.map((r) => r.content), ["https://a.com", "hello"]);
});

test("parseBulkCsv handles Windows endings and repeats like the text list", () => {
  const out = parseBulkCsv("https://a.com\r\nhttps://a.com\r\nhttps://b.com\r\n");
  assert.deepEqual(out.rows.map((r) => r.content), ["https://a.com", "https://b.com"]);
  assert.equal(out.duplicates, 1);
});

test("a pasted link line can carry its name after a comma", () => {
  const out = parseBulkText("https://example.com, My Site\nhttps://a.com\nhello");
  assert.equal(out.rows[0].name, "My Site");
  assert.equal(out.rows[0].content, "https://example.com");
  assert.equal(out.rows[1].name, undefined);
  assert.equal(out.rows[2].name, undefined);
});

test("a plain text line with a comma is not chopped into content and name", () => {
  const out = parseBulkText("hello, world\nbuy milk, eggs and bread");
  assert.deepEqual(out.rows.map((r) => r.content), ["hello, world", "buy milk, eggs and bread"]);
  assert.equal(out.rows[0].name, undefined);
  assert.equal(out.rows[1].name, undefined);
});

test("names remembered from a CSV survive an edit to the list", () => {
  const uploaded = parseBulkCsv("https://a.com,Shop A\nhttps://b.com,Shop B");
  const known = namesByContent(uploaded.rows);
  // The user edits the list: adds a line at the top and a blank line.
  const out = parseBulkText("https://new.com\n\nhttps://a.com\nhttps://b.com", known);
  assert.deepEqual(out.rows.map((r) => r.content), ["https://new.com", "https://a.com", "https://b.com"]);
  assert.equal(out.rows[0].name, undefined);
  assert.equal(out.rows[1].name, "Shop A");
  assert.equal(out.rows[2].name, "Shop B");
});

test("a remembered name follows its line when the list is reordered", () => {
  const known = new Map([
    ["https://a.com", "Shop A"],
    ["https://b.com", "Shop B"],
  ]);
  const out = parseBulkText("https://b.com\nhttps://a.com", known);
  assert.equal(out.rows[0].name, "Shop B");
  assert.equal(out.rows[1].name, "Shop A");
});

test("deleting a line drops its remembered name, it does not move to the next row", () => {
  const known = new Map([
    ["https://a.com", "Shop A"],
    ["https://b.com", "Shop B"],
  ]);
  const out = parseBulkText("https://b.com", known);
  assert.equal(out.rows.length, 1);
  assert.equal(out.rows[0].name, "Shop B");
});

test("a name typed on the line wins over a remembered one", () => {
  const known = new Map([["https://a.com", "Old name"]]);
  const out = parseBulkText("https://a.com, New name", known);
  assert.equal(out.rows[0].name, "New name");
});

test("namesByContent only keeps rows that have a name", () => {
  const parsed = parseBulkCsv("https://a.com,Shop A\nhttps://b.com,\nhello");
  const known = namesByContent(parsed.rows);
  assert.equal(known.size, 1);
  assert.equal(known.get("https://a.com"), "Shop A");
});

test("a repeated line with a name is still forged once, under the first name", () => {
  const out = parseBulkText("https://a.com, Shop A\nhttps://a.com\nhttps://b.com, Shop B");
  assert.deepEqual(out.rows.map((r) => r.content), ["https://a.com", "https://b.com"]);
  assert.equal(out.rows[0].name, "Shop A");
  assert.equal(out.rows[1].name, "Shop B");
  assert.equal(out.duplicates, 1);
});

test("the cap still holds when lines carry names", () => {
  const input = Array.from({ length: MAX_BULK_ROWS + 5 }, (_, i) => `https://x.com/${i}, Site ${i}`).join("\n");
  const out = parseBulkText(input);
  assert.equal(out.rows.length, MAX_BULK_ROWS);
  assert.equal(out.truncated, true);
  assert.equal(out.rows[0].name, "Site 0");
});
