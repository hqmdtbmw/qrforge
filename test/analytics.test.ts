import test from "node:test";
import assert from "node:assert/strict";
import {
  scanDate,
  filterScansByDateRange,
  trendByDay,
  countByDevice,
  topLocations,
  topBrowsers,
  hourlyCounts,
  countByOs,
  type ScanLike,
} from "../src/lib/analytics.ts";

// A Firestore Timestamp stand-in, the shape the dashboard really gets.
const stamp = (iso: string) => ({ toDate: () => new Date(iso) });
const scan = (iso: string, extra: Partial<ScanLike> = {}): ScanLike => ({
  timestamp: stamp(iso),
  ...extra,
});

test("scanDate reads a Firestore timestamp", () => {
  assert.deepEqual(scanDate(scan("2026-11-28T10:00:00")), new Date("2026-11-28T10:00:00"));
});

test("scanDate reads a plain Date too", () => {
  assert.deepEqual(scanDate({ timestamp: new Date("2026-11-28T10:00:00") }), new Date("2026-11-28T10:00:00"));
});

test("scanDate gives back null when there is no date to read", () => {
  assert.equal(scanDate({}), null);
  assert.equal(scanDate({ timestamp: null }), null);
  assert.equal(scanDate({ timestamp: new Date("not a date") }), null);
  assert.equal(scanDate({ timestamp: { toDate: () => new Date("not a date") } }), null);
});

test("a scan in the morning of the last day is kept", () => {
  const scans = [scan("2026-11-28T10:00:00")];
  const kept = filterScansByDateRange(scans, new Date("2026-11-26"), new Date("2026-11-28"));
  assert.equal(kept.length, 1);
});

test("a scan at the end of the last day is kept too", () => {
  const scans = [scan("2026-11-28T23:59:00")];
  const kept = filterScansByDateRange(scans, new Date("2026-11-26"), new Date("2026-11-28"));
  assert.equal(kept.length, 1);
});

test("a scan just past midnight after the last day is dropped", () => {
  const scans = [scan("2026-11-29T00:00:30")];
  const kept = filterScansByDateRange(scans, new Date("2026-11-26"), new Date("2026-11-28"));
  assert.equal(kept.length, 0);
});

test("a scan before the first day is dropped", () => {
  const scans = [scan("2026-11-25T23:59:00")];
  const kept = filterScansByDateRange(scans, new Date("2026-11-26"), new Date("2026-11-28"));
  assert.equal(kept.length, 0);
});

test("a scan at midnight on the first day is kept", () => {
  const scans = [scan("2026-11-26T00:00:00")];
  const kept = filterScansByDateRange(scans, new Date("2026-11-26"), new Date("2026-11-28"));
  assert.equal(kept.length, 1);
});

test("a scan with no date is kept, like the dashboard always did", () => {
  const scans = [{}];
  const kept = filterScansByDateRange(scans, new Date("2026-11-26"), new Date("2026-11-28"));
  assert.equal(kept.length, 1);
});

test("the trend counts each day and shows empty days as zero", () => {
  const scans = [
    scan("2026-11-26T09:00:00"),
    scan("2026-11-26T18:00:00"),
    scan("2026-11-28T12:00:00"),
  ];
  assert.deepEqual(trendByDay(scans, new Date("2026-11-26"), new Date("2026-11-28")), [
    { date: "Nov 26", scans: 2 },
    { date: "Nov 27", scans: 0 },
    { date: "Nov 28", scans: 1 },
  ]);
});

test("the trend does not count a scan outside the range", () => {
  const scans = [scan("2026-11-25T12:00:00"), scan("2026-11-29T12:00:00")];
  assert.deepEqual(trendByDay(scans, new Date("2026-11-26"), new Date("2026-11-28")), [
    { date: "Nov 26", scans: 0 },
    { date: "Nov 27", scans: 0 },
    { date: "Nov 28", scans: 0 },
  ]);
});

test("devices are counted by type", () => {
  const scans = [
    scan("2026-11-28T10:00:00", { device: { type: "mobile" } }),
    scan("2026-11-28T11:00:00", { device: { type: "mobile" } }),
    scan("2026-11-28T12:00:00", { device: { type: "desktop" } }),
  ];
  assert.deepEqual(countByDevice(scans), [
    { name: "mobile", value: 2 },
    { name: "desktop", value: 1 },
  ]);
});

test("a scan with no device info counts as desktop", () => {
  assert.deepEqual(countByDevice([scan("2026-11-28T10:00:00")]), [{ name: "desktop", value: 1 }]);
  assert.deepEqual(countByDevice([scan("2026-11-28T10:00:00", { device: {} })]), [
    { name: "desktop", value: 1 },
  ]);
});

test("locations are most first and capped at five", () => {
  const scans = [
    scan("2026-11-28T10:00:00", { location: { country: "Nigeria" } }),
    scan("2026-11-28T10:00:00", { location: { country: "Nigeria" } }),
    scan("2026-11-28T10:00:00", { location: { country: "Ghana" } }),
    scan("2026-11-28T10:00:00", { location: { country: "Kenya" } }),
    scan("2026-11-28T10:00:00", { location: { country: "Egypt" } }),
    scan("2026-11-28T10:00:00", { location: { country: "India" } }),
    scan("2026-11-28T10:00:00", { location: { country: "Brazil" } }),
  ];
  const top = topLocations(scans);
  assert.equal(top.length, 5);
  assert.deepEqual(top[0], { name: "Nigeria", value: 2 });
});

test("a scan with no country counts as Unknown", () => {
  assert.deepEqual(topLocations([scan("2026-11-28T10:00:00")]), [{ name: "Unknown", value: 1 }]);
});

test("browsers are most first and capped at five", () => {
  const scans = [
    scan("2026-11-28T10:00:00", { device: { browser: "Chrome" } }),
    scan("2026-11-28T10:00:00", { device: { browser: "Chrome" } }),
    scan("2026-11-28T10:00:00", { device: { browser: "Firefox" } }),
  ];
  assert.deepEqual(topBrowsers(scans), [
    { name: "Chrome", value: 2 },
    { name: "Firefox", value: 1 },
  ]);
});

test("a scan with no browser counts as Unknown", () => {
  assert.deepEqual(topBrowsers([scan("2026-11-28T10:00:00")]), [{ name: "Unknown", value: 1 }]);
});

test("hourly counts cover all 24 hours and land on the right hour", () => {
  const scans = [
    scan("2026-11-28T00:15:00"),
    scan("2026-11-28T09:00:00"),
    scan("2026-11-28T09:30:00"),
    scan("2026-11-28T23:45:00"),
  ];
  const hours = hourlyCounts(scans);
  assert.equal(hours.length, 24);
  assert.deepEqual(hours[0], { hour: "0:00", scans: 1 });
  assert.deepEqual(hours[9], { hour: "9:00", scans: 2 });
  assert.deepEqual(hours[23], { hour: "23:00", scans: 1 });
  assert.deepEqual(hours[12], { hour: "12:00", scans: 0 });
});

test("hourly counts skip a scan with no date", () => {
  const hours = hourlyCounts([{}]);
  assert.equal(hours.length, 24);
  assert.ok(hours.every((h) => h.scans === 0));
});

test("operating systems are counted, missing ones are Unknown", () => {
  const scans = [
    scan("2026-11-28T10:00:00", { device: { os: "Android" } }),
    scan("2026-11-28T10:00:00", { device: { os: "Android" } }),
    scan("2026-11-28T10:00:00", { device: { os: "iOS" } }),
    scan("2026-11-28T10:00:00"),
  ];
  assert.deepEqual(countByOs(scans), [
    { name: "Android", value: 2 },
    { name: "iOS", value: 1 },
    { name: "Unknown", value: 1 },
  ]);
});
