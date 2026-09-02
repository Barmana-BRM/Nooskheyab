import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import type { AppEnvironment } from '@pharmacy-mvp/config';

export interface SafeUpload {
  stream: Readable;
  originalName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlTtlSeconds: number;

  constructor(config: ConfigService<AppEnvironment, true>) {
    this.bucket = config.get('S3_BUCKET');
    this.signedUrlTtlSeconds = config.get('S3_SIGNED_URL_TTL_SECONDS');
    this.client = new S3Client({
      region: config.get('S3_REGION'),
      endpoint: config.get('S3_ENDPOINT'),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE'),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY'),
        secretAccessKey: config.get('S3_SECRET_KEY'),
      },
    });
  }

  buildObjectKey(pharmacyId: string, documentId: string): string {
    return `pharmacies/${pharmacyId}/documents/${documentId}-${randomUUID()}`;
  }

  async upload(key: string, upload: SafeUpload): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: upload.stream,
        ContentType: upload.mimeType,
        ContentLength: upload.fileSize,
        Metadata: {
          sha256: upload.sha256,
          originalname: upload.originalName.slice(0, 180),
        },
        ContentDisposition: 'attachment',
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async createSignedReadUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: 'attachment',
      }),
      { expiresIn: this.signedUrlTtlSeconds },
    );
  }

  static sha256(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
