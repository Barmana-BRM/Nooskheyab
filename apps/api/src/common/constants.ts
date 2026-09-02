export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_COOKIE_NAME = 'pharmacy_refresh';
export const PUBLIC_TOKEN_HEADER = 'x-prescription-token';
export const MAX_PAGE_LIMIT = 100;
export const SAFE_USER_AGENT_MAX_LENGTH = 300;

export const isProduction = (nodeEnv: string): boolean => nodeEnv === 'production';
