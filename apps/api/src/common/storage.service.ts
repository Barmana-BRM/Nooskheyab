import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import type { AppEnvironment } from '@pharmacy-mvp/config';

export interface SafeUpload {
  stream: Readable;
  mimeType: string;
  fileSize: number;
  sha256: string;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly signingClient: S3Client;
  private readonly bucket: string;
  private readonly signedUrlTtlSeconds: number;

  constructor(config: ConfigService<AppEnvironment, true>) {
    this.bucket = config.get('S3_BUCKET');
    this.signedUrlTtlSeconds = config.get('S3_SIGNED_URL_TTL_SECONDS');
    const clientOptions = {
      region: config.get('S3_REGION'),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE'),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY'),
        secretAccessKey: config.get('S3_SECRET_KEY'),
      },
    };
    const internalEndpoint = config.get('S3_ENDPOINT');
    const publicEndpoint = config.get('S3_PUBLIC_ENDPOINT') ?? internalEndpoint;
    this.client = new S3Client({ ...clientOptions, endpoint: internalEndpoint });
    this.signingClient =
      publicEndpoint === internalEndpoint
        ? this.client
        : new S3Client({ ...clientOptions, endpoint: publicEndpoint });
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
        },
        ContentDisposition: 'attachment',
      }),
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async healthcheck(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  async createSignedReadUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.signingClient,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: 'attachment',
      }),
      { expiresIn: this.signedUrlTtlSeconds },
    );
  }
}
