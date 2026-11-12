import { csvCell, toCsv } from './csv.js';

describe('csv', () => {
  it('leaves simple values alone', () => {
    expect(csvCell('Leaking tap')).toBe('Leaking tap');
    expect(csvCell(42)).toBe('42');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(new Date('2026-11-12T10:00:00.000Z'))).toBe('2026-11-12T10:00:00.000Z');
  });

  it('quotes values containing commas, quotes or line breaks', () => {
    expect(csvCell('Block A, Room 2')).toBe('"Block A, Room 2"');
    expect(csvCell('The "big" lab')).toBe('"The ""big"" lab"');
    expect(csvCell('line one\nline two')).toBe('"line one\nline two"');
  });

  it('neutralises cells a spreadsheet would run as a formula', () => {
    expect(csvCell('=SUM(A1:A9)')).toBe("'=SUM(A1:A9)");
    expect(csvCell('+234 800 000 0000')).toBe("'+234 800 000 0000");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@admin')).toBe("'@admin");
    expect(csvCell('=HYPERLINK("http://evil","Click")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""Click"")"',
    );
    // A real number is not text, so it is not a formula risk.
    expect(csvCell(-1)).toBe('-1');
  });

  it('builds a file with a BOM, a header row and CRLF line endings', () => {
    const csv = toCsv(['Reference', 'Title'], [['NA-000001', 'Tap, leaking']]);
    expect(csv).toBe('﻿Reference,Title\r\nNA-000001,"Tap, leaking"\r\n');
  });
});
