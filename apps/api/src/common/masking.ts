export const maskMobile = (value: string): string =>
  value.length >= 11 ? `${value.slice(0, 4)}***${value.slice(-4)}` : '***';

export const maskNationalId = (value: string): string =>
  value.length >= 10 ? `${value.slice(0, 3)}***${value.slice(-4)}` : '***';

const forbiddenAuditKeys = new Set([
  'nationalid',
  'mobile',
  'prescriptiontrackingcode',
  'accesstoken',
  'password',
  'refreshtoken',
  'token',
  'csrftoken',
  'authorization',
  'cookie',
  'secret',
]);

const redactAuditValue = (value: unknown, depth: number): unknown => {
  if (depth > 5) return '[truncated]';
  if (Array.isArray(value)) return value.map((item) => redactAuditValue(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(
        ([key]) =>
          !forbiddenAuditKeys.has(key.toLowerCase().replaceAll('_', '').replaceAll('-', '')),
      )
      .map(([key, nestedValue]) => [key, redactAuditValue(nestedValue, depth + 1)]),
  );
};

export const redactAuditMetadata = (metadata: Record<string, unknown>): Record<string, unknown> =>
  redactAuditValue(metadata, 0) as Record<string, unknown>;
