import { Injectable } from '@nestjs/common';
import { RabbitService } from 'src/rabbit/rabbit.service';
import { RedisService } from 'src/redis/redis.service';
import { JobMessage } from 'src/type';


@Injectable()
export class RunService {
  private exchange = process.env.RABBITMQ_EXCHANGE || 'code_jobs';
  private queue = process.env.RABBITMQ_QUEUE || 'code_job_queue';

  constructor(private rabbit: RabbitService, private redis: RedisService) {}

  async enqueueJob(job: JobMessage) {
    // Initialize job state in Redis (durable)
    const initial = {
      jobId: job.jobId,
      status: 'queued',
      createdAt: Date.now(),
      progress: 0,
      type: job.type,
      meta: job.meta ?? null
    };
    await this.redis.setJob(job.jobId, initial);

    // ensure exchange & queue
    await this.rabbit.assertExchange(this.exchange);
    await this.rabbit.assertQueue(this.queue, this.exchange);

    // publish message
    await this.rabbit.publish(this.exchange, this.queue, Buffer.from(JSON.stringify(job)));
  }

  async setJobResult(jobId: string, result: any) {
    const cur = (await this.redis.getJob(jobId)) || {};
    const merged = { ...cur, ...result };
    await this.redis.setJob(jobId, merged);
  }

  async getJobStatus(jobId: string) {
    const job = await this.redis.getJob(jobId);
    if (!job) return { jobId, status: 'not_found' };
    return job;
  }
}
