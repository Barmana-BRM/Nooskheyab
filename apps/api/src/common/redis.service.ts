import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import type { AppEnvironment } from '@pharmacy-mvp/config';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  readonly client: Redis;

  constructor(private readonly environment: AppEnvironment) {
    this.client = new Redis(this.environment.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1500,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
    } catch {
      this.client.disconnect();
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  async getJson<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // Redis is an optimization; the database remains authoritative.
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch {
      // Best effort cache invalidation.
    }
  }

  async consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    try {
      const count = await this.client.incr(key);
      if (count === 1) await this.client.expire(key, windowSeconds);
      return count <= limit;
    } catch {
      return true;
    }
  }

  async setIfNotExists(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch {
      return false;
    }
  }
}
