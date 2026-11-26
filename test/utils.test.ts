import test from "node:test";
import assert from "node:assert/strict";
import { cn, crc16, formatDate } from "../src/lib/utils.ts";

test("crc16 matches the standard check value", () => {
  // CRC-16/CCITT-FALSE: the check value for "123456789" is 0x29B1.
  assert.equal(crc16("123456789"), "29B1");
  assert.equal(crc16(""), "FFFF");
  assert.equal(crc16("hello"), "D26E");
});

test("crc16 always returns four uppercase hex digits", () => {
  for (const input of ["a", "QRForge", "WIFI:T:WPA;S:home;;", "100.00"]) {
    const out = crc16(input);
    assert.match(out, /^[0-9A-F]{4}$/);
  }
});

test("crc16 changes when the payload changes by one character", () => {
  assert.notEqual(crc16("amount=100"), crc16("amount=101"));
  assert.notEqual(crc16("amount=100"), crc16("amount=100 "));
});

test("formatDate reads like a person wrote it", () => {
  assert.equal(formatDate(new Date(2026, 0, 5)), "Jan 5, 2026");
  assert.equal(formatDate(new Date(2026, 10, 26)), "Nov 26, 2026");
  assert.equal(formatDate("2026-11-26"), "Nov 26, 2026");
});

test("cn merges classes and lets the later one win", () => {
  assert.equal(cn("px-2", "px-4"), "px-4");
  assert.equal(cn("text-red-500", false && "hidden", "font-bold"), "text-red-500 font-bold");
  assert.equal(cn("a", undefined, "b"), "a b");
});
