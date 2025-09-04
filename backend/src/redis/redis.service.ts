import IORedis from 'ioredis';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

@Injectable()
export class RedisService implements OnModuleInit {
  private redis: IORedis;
  private prefix = process.env.REDIS_JOB_PREFIX || 'codejob:';
  private url = process.env.REDIS_URL || 'redis://localhost:6379/0';
  private logger = new Logger(RedisService.name);

  async onModuleInit() {
    this.redis = new IORedis(this.url);
    this.logger.log('Connected to Redis');
  }

  async setJob(jobId: string, payload: any) {
    await this.redis.set(this.prefix + jobId, JSON.stringify(payload), 'EX', 60 * 60 * 24); // 24h expiry
  }

  async getJob(jobId: string) {
    const raw = await this.redis.get(this.prefix + jobId);
    if (!raw) return null;
    return JSON.parse(raw);
  }

  async delJob(jobId: string) {
    await this.redis.del(this.prefix + jobId);
  }
}
