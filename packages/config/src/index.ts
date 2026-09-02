import { z } from 'zod';

const optionalBoolean = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_APP_URL: z.string().url().default('http://localhost:5173'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PRESCRIPTION_EXPIRATION_HOURS: z.coerce.number().positive().default(6),
  PRESCRIPTION_CREATE_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  PRESCRIPTION_CREATE_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  LOGIN_RATE_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: optionalBoolean,
  S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(300),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5242880),
  PHARMACY_DOCUMENT_TECHNICAL_MANAGER_REQUIRED: optionalBoolean,
  ADMIN_INITIAL_USERNAME: z.string().optional().default(''),
  ADMIN_INITIAL_PASSWORD: z.string().optional().default(''),
  ADMIN_INITIAL_MOBILE: z.string().optional().default(''),
  SWAGGER_ENABLED: optionalBoolean,
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

export const parseEnvironment = (source: NodeJS.ProcessEnv): AppEnvironment => {
  const result = environmentSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
};
