import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDuration, getErrorMessage, timeAgo } from './utils';

describe('formatDuration', () => {
  it('formats zero as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats 61 seconds', () => {
    expect(formatDuration(61_000)).toBe('1:01');
  });

  it('pads seconds below 10', () => {
    expect(formatDuration(65_000)).toBe('1:05');
  });

  it('handles large values', () => {
    expect(formatDuration(3_661_000)).toBe('61:01');
  });
});

describe('getErrorMessage', () => {
  it('returns the mapped message for known codes', () => {
    expect(getErrorMessage('INVALID_MOVE_CONFLICT')).toContain('conflicts');
    expect(getErrorMessage('FAILED_TO_SOLVE')).toContain('auto-solve');
  });

  it('returns a fallback for unknown codes', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe('An error occurred. Please try again.');
  });

  it('returns fallback for null', () => {
    expect(getErrorMessage(null)).toBe('An error occurred. Please try again.');
  });
});

describe('timeAgo', () => {
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "just now" for recent timestamps', () => {
    expect(timeAgo(NOW - 30_000)).toBe('just now');
  });

  it('returns minutes ago', () => {
    expect(timeAgo(NOW - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    expect(timeAgo(NOW - 3 * 3_600_000)).toBe('3h ago');
  });

  it('returns days ago', () => {
    expect(timeAgo(NOW - 2 * 86_400_000)).toBe('2d ago');
  });
});
