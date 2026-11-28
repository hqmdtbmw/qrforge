// The maths behind the analytics dashboard, kept here so it can be tested
// without rendering the page. A scan is whatever Firestore hands back: the
// timestamp is usually a Timestamp with a toDate method, but a plain Date
// works too, and a scan with no usable date is kept in the list and just
// skipped by the counters that need a date.

import { eachDayOfInterval, endOfDay, format, isSameDay, startOfDay } from "date-fns";

export interface ScanLike {
  timestamp?: { toDate: () => Date } | Date | null;
  device?: { type?: string; browser?: string; os?: string } | null;
  location?: { country?: string; city?: string } | null;
}

// Pull a real date out of a scan, or null when there is not one to pull.
export function scanDate(scan: ScanLike): Date | null {
  const stamp = scan.timestamp;
  if (!stamp) return null;
  if (stamp instanceof Date) {
    return Number.isNaN(stamp.getTime()) ? null : stamp;
  }
  if (typeof stamp.toDate === "function") {
    const date = stamp.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  return null;
}

// Keep the scans inside a date range. The end date counts in full, right
// up to midnight, because the date picker hands us a plain yyyy-MM-dd
// string and parsing it gives midnight at the start of that day. Before
// this, every scan after midnight on the last day was dropped, so the
// dashboard never showed today's scans at all. Scans with no date are
// kept, the same as the dashboard always did.
export function filterScansByDateRange<T extends ScanLike>(scans: T[], start: Date, end: Date): T[] {
  const from = startOfDay(start);
  const to = endOfDay(end);
  return scans.filter((scan) => {
    const date = scanDate(scan);
    if (!date) return true;
    return date >= from && date <= to;
  });
}

// One count per day across the range, days with no scans included as zero.
export function trendByDay(
  scans: ScanLike[],
  start: Date,
  end: Date
): { date: string; scans: number }[] {
  const days = eachDayOfInterval({ start: startOfDay(start), end: endOfDay(end) });
  return days.map((day) => {
    const count = scans.filter((scan) => {
      const date = scanDate(scan);
      return date !== null && isSameDay(date, day);
    }).length;
    return { date: format(day, "MMM dd"), scans: count };
  });
}

// How many scans came from each kind of device. A scan with no device
// info counts as desktop, the same as the server records it when the
// browser gives no device type.
export function countByDevice(scans: ScanLike[]): { name: string; value: number }[] {
  const devices: Record<string, number> = {};
  scans.forEach((scan) => {
    const type = scan.device?.type || "desktop";
    devices[type] = (devices[type] || 0) + 1;
  });
  return Object.entries(devices).map(([name, value]) => ({ name, value }));
}

// The countries with the most scans, most first, capped at five.
export function topLocations(scans: ScanLike[], limit = 5): { name: string; value: number }[] {
  const locations: Record<string, number> = {};
  scans.forEach((scan) => {
    const country = scan.location?.country || "Unknown";
    locations[country] = (locations[country] || 0) + 1;
  });
  return Object.entries(locations)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

// The browsers with the most scans, most first, capped at five.
export function topBrowsers(scans: ScanLike[], limit = 5): { name: string; value: number }[] {
  const browsers: Record<string, number> = {};
  scans.forEach((scan) => {
    const browser = scan.device?.browser || "Unknown";
    browsers[browser] = (browsers[browser] || 0) + 1;
  });
  return Object.entries(browsers)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

// Scans per hour of the day, all 24 hours present even when empty.
export function hourlyCounts(scans: ScanLike[]): { hour: string; scans: number }[] {
  const hours: Record<number, number> = {};
  for (let i = 0; i < 24; i++) hours[i] = 0;
  scans.forEach((scan) => {
    const date = scanDate(scan);
    if (date) {
      const hour = date.getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    }
  });
  return Object.entries(hours).map(([hour, count]) => ({
    hour: `${hour}:00`,
    scans: count,
  }));
}

// How many scans came from each operating system.
export function countByOs(scans: ScanLike[]): { name: string; value: number }[] {
  const os: Record<string, number> = {};
  scans.forEach((scan) => {
    const name = scan.device?.os || "Unknown";
    os[name] = (os[name] || 0) + 1;
  });
  return Object.entries(os).map(([name, value]) => ({ name, value }));
}
