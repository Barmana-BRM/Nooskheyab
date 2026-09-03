import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { diskStorage } from 'multer';
import type { AppEnvironment } from '@pharmacy-mvp/config';
import { AuthModule } from '../auth/auth.module';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';

@Module({
  imports: [
    AuthModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppEnvironment, true>) => ({
        storage: diskStorage({
          destination: tmpdir(),
          filename: (_request, file, callback) =>
            callback(null, `${randomUUID()}-${file.fieldname}`),
        }),
        limits: {
          fileSize: config.get('UPLOAD_MAX_BYTES'),
          files: 1,
          fields: 4,
          fieldSize: 16 * 1024,
        },
      }),
    }),
  ],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
