import type { Request } from 'express';
import type { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  pharmacyId: string | null;
  username: string;
}

export interface RequestWithContext extends Request {
  requestId: string;
  user?: AuthenticatedUser;
}
