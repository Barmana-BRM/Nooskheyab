import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import type { RequestWithContext } from '../common/request-context';

@Injectable()
export class ApprovedPharmacyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const pharmacyId = request.user?.pharmacyId;
    if (!pharmacyId) throw new ForbiddenException('حساب داروخانه معتبر نیست.');
    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: {
        id: pharmacyId,
        registrationStatus: 'APPROVED',
        isActive: true,
        deletedAt: null,
        licenseExpirationDate: { gt: new Date() },
      },
    });
    if (!pharmacy)
      throw new ForbiddenException('دسترسی عملیاتی تا تأیید و فعال‌شدن داروخانه ممکن نیست.');
    return true;
  }
}
