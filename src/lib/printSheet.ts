// The maths behind the print sheet: how many codes fit on a page, how big
// each cell is, and how a label is shortened to fit under its code. I keep
// this free of any browser code so the tests can check it on its own. The
// old print path needed the Python label service, which is optional and
// often not running, so this sheet prints straight from the browser.

export type PrintPageSizeId = "a4" | "letter";
export type PrintSheetLayoutId = "large" | "medium" | "small";

export interface PrintPageSize {
  id: PrintPageSizeId;
  label: string;
  widthMm: number;
  heightMm: number;
}

export interface PrintSheetLayout {
  id: PrintSheetLayoutId;
  label: string;
  description: string;
  cols: number;
  rows: number;
}

export interface PrintSheetGrid {
  pageSizeId: PrintPageSizeId;
  layoutId: PrintSheetLayoutId;
  cols: number;
  rows: number;
  perPage: number;
  cellWidthMm: number;
  cellHeightMm: number;
  codeSizeMm: number;
  labelLines: number;
  labelMaxChars: number;
}

export interface PrintSheetItem {
  id: string;
  name: string;
  content: string;
}

export interface PrintSheetPlan {
  grid: PrintSheetGrid;
  pages: PrintSheetItem[][];
  totalCodes: number;
  pageCount: number;
}

export const PRINT_PAGE_SIZES: Record<PrintPageSizeId, PrintPageSize> = {
  a4: { id: "a4", label: "A4", widthMm: 210, heightMm: 297 },
  letter: { id: "letter", label: "US Letter", widthMm: 215.9, heightMm: 279.4 },
};

export const PRINT_SHEET_LAYOUTS: Record<PrintSheetLayoutId, PrintSheetLayout> = {
  large: {
    id: "large",
    label: "Large",
    description: "4 big codes, for a counter or a menu table",
    cols: 2,
    rows: 2,
  },
  medium: {
    id: "medium",
    label: "Medium",
    description: "9 codes, for a noticeboard",
    cols: 3,
    rows: 3,
  },
  small: {
    id: "small",
    label: "Small",
    description: "16 codes, for a shelf or a handout",
    cols: 4,
    rows: 4,
  },
};

// The margin I leave around the edge of the page, and the gap I leave
// inside each cell, so the code never touches the cell edge or its label.
export const PRINT_SHEET_MARGIN_MM = 10;
export const PRINT_SHEET_CELL_GAP_MM = 3;
// Two lines of label text under each code, at about 5mm a line.
export const PRINT_SHEET_LABEL_LINES = 2;
export const PRINT_SHEET_LABEL_LINE_MM = 5;

export function printSheetGrid(
  pageSizeId: PrintPageSizeId,
  layoutId: PrintSheetLayoutId
): PrintSheetGrid {
  const page = PRINT_PAGE_SIZES[pageSizeId];
  const layout = PRINT_SHEET_LAYOUTS[layoutId];
  if (!page) {
    throw new Error(`unknown page size: ${pageSizeId}`);
  }
  if (!layout) {
    throw new Error(`unknown sheet layout: ${layoutId}`);
  }

  const usableWidthMm = page.widthMm - PRINT_SHEET_MARGIN_MM * 2;
  const usableHeightMm = page.heightMm - PRINT_SHEET_MARGIN_MM * 2;
  const cellWidthMm = usableWidthMm / layout.cols;
  const cellHeightMm = usableHeightMm / layout.rows;
  const labelSpaceMm =
    PRINT_SHEET_LABEL_LINES * PRINT_SHEET_LABEL_LINE_MM + PRINT_SHEET_CELL_GAP_MM;
  const codeSizeMm = Math.max(
    10,
    Math.min(
      cellWidthMm - PRINT_SHEET_CELL_GAP_MM * 2,
      cellHeightMm - labelSpaceMm - PRINT_SHEET_CELL_GAP_MM
    )
  );

  return {
    pageSizeId,
    layoutId,
    cols: layout.cols,
    rows: layout.rows,
    perPage: layout.cols * layout.rows,
    cellWidthMm,
    cellHeightMm,
    codeSizeMm,
    labelLines: PRINT_SHEET_LABEL_LINES,
    labelMaxChars: sheetLabelMaxChars(cellWidthMm),
  };
}

// Roughly how many characters fit on one line of a label in a cell this
// wide, at the size the sheet prints labels. I keep at least 8 so a short
// name never gets cut for no reason.
export function sheetLabelMaxChars(cellWidthMm: number): number {
  return Math.max(8, Math.floor(cellWidthMm / 2.4));
}

// Shorten a name so it fits under its code. Short names pass through
// untouched, long ones get cut with an ellipsis, and a blank name shows
// as Untitled so the sheet never has a bare code with nothing under it.
export function fitSheetLabel(name: string, maxChars: number): string {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    return "Untitled";
  }
  if (maxChars < 4 || trimmed.length <= maxChars) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxChars - 3)}...`;
}

// Split a list of codes into one page each, in order. An empty list gives
// no pages, and a page that holds at least one code is a hard rule.
export function paginatePrintSheet<T>(items: T[], perPage: number): T[][] {
  if (perPage < 1) {
    throw new Error("a page has to hold at least one code");
  }
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) {
    pages.push(items.slice(i, i + perPage));
  }
  return pages;
}

// Repeat a list of codes until it holds count entries, cycling back to the
// start. This is how one code fills a whole page when you print a sheet
// of the same code for every table.
export function repeatSheetItems<T>(items: T[], count: number): T[] {
  if (items.length === 0 || count <= 0) {
    return [];
  }
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(items[i % items.length]);
  }
  return out;
}

// Put the grid and the pages together for one sheet. When repeatSingle is
// on and there is only one code, that code fills a single page instead of
// sitting alone in the corner.
export function printSheetPlan(
  items: PrintSheetItem[],
  pageSizeId: PrintPageSizeId,
  layoutId: PrintSheetLayoutId,
  repeatSingle = false
): PrintSheetPlan {
  const grid = printSheetGrid(pageSizeId, layoutId);
  const filled =
    repeatSingle && items.length === 1
      ? repeatSheetItems(items, grid.perPage)
      : items;
  const pages = paginatePrintSheet(filled, grid.perPage);
  return {
    grid,
    pages,
    totalCodes: filled.length,
    pageCount: pages.length,
  };
}
