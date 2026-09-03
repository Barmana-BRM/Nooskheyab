import { shiftTehranDays, startOfTehranDay, tehranDateKey } from '../../src/common/tehran-time';

describe('Tehran date boundaries', () => {
  it('uses the Iran local day boundary while storing UTC instants', () => {
    const date = new Date('2026-09-02T10:00:00.000Z');
    const start = startOfTehranDay(date);

    expect(start.toISOString()).toBe('2026-09-01T20:30:00.000Z');
    expect(tehranDateKey(start)).toBe('2026-09-02');
    expect(tehranDateKey(new Date(start.getTime() - 1))).toBe('2026-09-01');
  });

  it('shifts calendar days instead of fixed UTC durations', () => {
    const start = startOfTehranDay(new Date('2026-09-02T10:00:00.000Z'));

    expect(shiftTehranDays(start, -1).toISOString()).toBe('2026-08-31T20:30:00.000Z');
  });
});
