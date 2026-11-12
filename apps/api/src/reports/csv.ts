// Builds a CSV file by hand. The format is simple, but two details matter:
//
// 1. Escaping. A value containing a comma, a quote or a line break must be wrapped
//    in quotes, and any quote inside it doubled. Otherwise one cell spills into the next.
//
// 2. Formula injection. Spreadsheets treat a cell starting with = + - or @ as a
//    formula. A requester could title a request `=HYPERLINK("http://evil","Click")`
//    and it would run when an admin opens the export. Prefixing such cells with an
//    apostrophe makes the spreadsheet show them as plain text.

export type CsvValue = string | number | Date | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  if (value instanceof Date) return value.toISOString();

  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(','));
  // \r\n line endings are what the CSV standard (RFC 4180) and Excel expect.
  // The leading BOM tells Excel the file is UTF-8, so accented names display correctly.
  return `﻿${lines.join('\r\n')}\r\n`;
}
