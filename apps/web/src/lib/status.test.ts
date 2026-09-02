import { describe, expect, it } from 'vitest';
import { statusClass, statusLabel } from './status';

describe('status presentation', () => {
  it('uses explicit Persian labels and semantic classes', () => {
    expect(statusLabel('FULL_AVAILABLE')).toBe('موجودی کامل');
    expect(statusClass('PARTIAL')).toBe('status-warning');
    expect(statusClass('NOT_AVAILABLE')).toBe('status-error');
  });
});
