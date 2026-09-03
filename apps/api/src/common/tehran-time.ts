const TEHRAN_TIME_ZONE = 'Asia/Tehran';

interface DateParts {
  year: number;
  month: number;
  day: number;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TEHRAN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TEHRAN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getParts = (date: Date, formatter: Intl.DateTimeFormat): Record<string, number> => {
  return Object.fromEntries(
    formatter.formatToParts(date).flatMap((part) => {
      if (part.type === 'literal') return [];
      const value = Number(part.value);
      return Number.isFinite(value) ? [[part.type, value]] : [];
    }),
  );
};

const requiredPart = (parts: Record<string, number>, name: string): number => {
  const value = parts[name];
  if (value === undefined) throw new Error(`Unable to resolve Tehran date part: ${name}`);
  return value;
};

const getTehranDateParts = (date: Date): DateParts => {
  const parts = getParts(date, dateFormatter);
  return {
    year: requiredPart(parts, 'year'),
    month: requiredPart(parts, 'month'),
    day: requiredPart(parts, 'day'),
  };
};

const getTehranOffsetMilliseconds = (date: Date): number => {
  const parts = getParts(date, dateTimeFormatter);
  const renderedAsUtc = Date.UTC(
    requiredPart(parts, 'year'),
    requiredPart(parts, 'month') - 1,
    requiredPart(parts, 'day'),
    requiredPart(parts, 'hour'),
    requiredPart(parts, 'minute'),
    requiredPart(parts, 'second'),
  );
  return renderedAsUtc - date.getTime();
};

export const startOfTehranDay = (date: Date): Date => {
  const parts = getTehranDateParts(date);
  const utcMidnightGuess = Date.UTC(parts.year, parts.month - 1, parts.day);
  const offset = getTehranOffsetMilliseconds(new Date(utcMidnightGuess + 12 * 3_600_000));
  return new Date(utcMidnightGuess - offset);
};

export const shiftTehranDays = (date: Date, days: number): Date => {
  const parts = getTehranDateParts(date);
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return startOfTehranDay(shifted);
};

export const tehranDateKey = (date: Date): string => {
  const parts = getTehranDateParts(date);
  return `${parts.year.toString().padStart(4, '0')}-${parts.month
    .toString()
    .padStart(2, '0')}-${parts.day.toString().padStart(2, '0')}`;
};
