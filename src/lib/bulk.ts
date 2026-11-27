// The bulk forge list: one QR per line of pasted text, or the first
// column of an uploaded CSV. I keep the parsing here, away from the
// modal, so I can test it in a plain Node run without a browser.

export type BulkQrType = 'link' | 'text';

export interface BulkRow {
  content: string;
  qrType: BulkQrType;
  // A name for the QR, when one is known. It comes from a CSV second
  // column, from a name typed after a comma on the line itself, or
  // from a name remembered for that content from an earlier upload.
  // Rows with no name get "Bulk QR N" from the modal instead.
  name?: string;
}

export interface BulkParseResult {
  rows: BulkRow[];
  // Lines dropped because the same content already appeared earlier.
  duplicates: number;
  // True when the input had more rows than the cap, so the rest were cut.
  truncated: boolean;
}

// Forging is one Firestore write per row, done one after another, so
// a huge paste would sit there for a long time. 500 is plenty.
export const MAX_BULK_ROWS = 500;

// A line is a link when it is a real URL. The old check was just
// startsWith('http'), which called "httpfoo" a link, missed
// "HTTPS://..." in capitals, and missed a bare "example.com".
// Anything I cannot tell is a link stays plain text, which is the
// safe side: a text QR still shows the words, a wrong link QR does not.
export function classifyBulkContent(content: string): BulkQrType {
  const value = content.trim();
  if (!value || value.includes(' ')) return 'text';
  if (/^https?:\/\//i.test(value)) return 'link';
  if (/^www\./i.test(value)) return 'link';
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(value)) return 'link';
  return 'text';
}

// Shared tail for both parsers: drop empties, drop repeats, keep the
// first copy, and stop at the cap. Rows keep their input order.
function collectRows(
  items: { content: string; name?: string }[],
): BulkParseResult {
  const rows: BulkRow[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  let truncated = false;

  for (const item of items) {
    const content = item.content.trim();
    if (!content) continue;
    if (seen.has(content)) {
      duplicates += 1;
      continue;
    }
    if (rows.length >= MAX_BULK_ROWS) {
      truncated = true;
      continue;
    }
    seen.add(content);
    rows.push({
      content,
      qrType: classifyBulkContent(content),
      ...(item.name ? { name: item.name.trim() } : {}),
    });
  }

  return { rows, duplicates, truncated };
}

// The text list: one QR per line, blank lines ignored, Windows line
// endings handled, repeats forged only once.
//
// A line can carry its own name after a comma, the same way a CSV row
// does: "https://example.com, My Site". I only split on the comma when
// the part before it is a link, so a plain text line like
// "hello, world" stays one piece of text and is not chopped in half.
//
// knownNames remembers names by content, usually from a CSV upload.
// The modal keeps that map and hands it back here on every edit, so a
// name stays with its line when the list is reordered, and a deleted
// line takes its name with it. A name typed on the line itself wins
// over a remembered one.
export function parseBulkText(
  input: string,
  knownNames?: ReadonlyMap<string, string>,
): BulkParseResult {
  const lines = input.split(/\r?\n/);
  return collectRows(
    lines.map((line) => {
      const split = splitInlineName(line);
      const content = split.content.trim();
      return {
        content,
        name: split.name ?? knownNames?.get(content),
      };
    }),
  );
}

// Split "content, name" on the first comma, but only when the content
// part is a link. Anything else keeps the whole line as its content,
// including a trailing comma after a link with no name on it.
function splitInlineName(line: string): { content: string; name?: string } {
  const comma = line.indexOf(',');
  if (comma === -1) return { content: line };
  const before = line.slice(0, comma).trim();
  if (!before || classifyBulkContent(before) !== 'link') return { content: line };
  const after = line.slice(comma + 1).trim();
  return { content: before, ...(after ? { name: after } : {}) };
}

// Build the remembered-names map from parsed rows, so the modal can
// keep names from a CSV upload and hand them back when the list is
// edited. Only rows that actually have a name go in.
export function namesByContent(rows: BulkRow[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const row of rows) {
    if (row.name) names.set(row.content, row.name);
  }
  return names;
}

// One CSV record per line, split into fields. A field in double quotes
// can hold a comma or a line break, and two quotes inside it mean one
// literal quote. The first column is the content, a second column, when
// there is one, is the name for that QR. A first row that reads like a
// header, "content" or "url" and friends, is skipped, not forged.
const CSV_HEADERS = new Set(['content', 'url', 'link', 'text', 'qr', 'name', 'data']);

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      record.push(field);
      field = '';
      records.push(record);
      record = [];
    } else {
      field += ch;
    }
  }

  // The last line may not end with a newline. A dangling quote just
  // ends the file, the field keeps what it had.
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}

export function parseBulkCsv(text: string): BulkParseResult {
  const records = parseCsvRecords(text);
  const items: { content: string; name?: string }[] = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const first = (record[0] ?? '').trim();
    if (i === 0 && CSV_HEADERS.has(first.toLowerCase())) continue;
    if (!first) continue;
    const name = (record[1] ?? '').trim();
    items.push({ content: first, ...(name ? { name } : {}) });
  }

  return collectRows(items);
}
