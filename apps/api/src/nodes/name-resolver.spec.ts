import { nextAvailableName, splitName, stripCopySuffix } from './name-resolver';

describe('splitName', () => {
  it('separates the extension from the base name', () => {
    expect(splitName('report.pdf')).toEqual({ base: 'report', extension: '.pdf' });
  });

  it('keeps dotfiles intact', () => {
    expect(splitName('.gitignore')).toEqual({ base: '.gitignore', extension: '' });
  });

  it('treats a trailing dot as part of the name', () => {
    expect(splitName('report.')).toEqual({ base: 'report.', extension: '' });
  });

  it('uses only the last dot', () => {
    expect(splitName('q1.final.pdf')).toEqual({ base: 'q1.final', extension: '.pdf' });
  });
});

describe('stripCopySuffix', () => {
  it('removes a trailing copy marker', () => {
    expect(stripCopySuffix('report (3)')).toBe('report');
  });

  it('leaves unrelated parentheses alone', () => {
    expect(stripCopySuffix('report (final)')).toBe('report (final)');
  });
});

describe('nextAvailableName', () => {
  it('returns the desired name when nothing conflicts', () => {
    expect(nextAvailableName('report.pdf', ['other.pdf'])).toBe('report.pdf');
  });

  it('appends a counter on the first conflict', () => {
    expect(nextAvailableName('report.pdf', ['report.pdf'])).toBe('report (1).pdf');
  });

  it('skips counters that are already taken', () => {
    expect(nextAvailableName('report.pdf', ['report.pdf', 'report (1).pdf'])).toBe(
      'report (2).pdf',
    );
  });

  it('compares names case-insensitively', () => {
    expect(nextAvailableName('Report.PDF', ['report.pdf'])).toBe('Report (1).PDF');
  });

  it('does not stack copy markers', () => {
    expect(nextAvailableName('report (1).pdf', ['report (1).pdf'])).toBe('report (2).pdf');
  });

  it('works for folders without an extension', () => {
    expect(nextAvailableName('Legal', ['legal'])).toBe('Legal (1)');
  });
});
