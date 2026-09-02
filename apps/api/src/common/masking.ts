export const maskMobile = (value: string): string =>
  value.length >= 11 ? `${value.slice(0, 4)}***${value.slice(-4)}` : '***';

export const maskNationalId = (value: string): string =>
  value.length >= 10 ? `${value.slice(0, 3)}***${value.slice(-4)}` : '***';

export const redactAuditMetadata = (metadata: Record<string, unknown>): Record<string, unknown> => {
  const forbidden = new Set([
    'nationalId',
    'mobile',
    'prescriptionTrackingCode',
    'accessToken',
    'password',
    'refreshToken',
  ]);
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => !forbidden.has(key)));
};
