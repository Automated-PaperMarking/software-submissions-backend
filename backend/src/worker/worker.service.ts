import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import axios from 'axios';
import { RabbitService } from 'src/rabbit/rabbit.service';
import { RedisService } from 'src/redis/redis.service';
import { RunService } from 'src/run/run.service';

const JUDGE0_URL = process.env.JUDGE0_URL || 'http://judge0:2358';
const JUDGE0_HEADERS = {
  'Content-Type': 'application/json',
  'X-Auth-Token': process.env.JUDGE0_TOKEN || '',
};
const POLL_INTERVAL = parseInt(
  process.env.JUDGE0_POLL_INTERVAL_MS || '500',
  10,
);
const POLL_MAX = parseInt(process.env.JUDGE0_POLL_MAX_ATTEMPTS || '120', 10);

@Injectable()
export class WorkerService implements OnModuleInit {
  private queue = process.env.RABBITMQ_QUEUE || 'code_job_queue';
  private logger = new Logger(WorkerService.name);

  constructor(
    private rabbit: RabbitService,
    private runService: RunService,
    private redis: RedisService,
  ) {}

  async onModuleInit() {
    const prefetch = parseInt(process.env.WORKER_PREFETCH || '5', 10);
    this.logger.log(
      `Worker starting; consuming ${this.queue} with prefetch ${prefetch}`,
    );
    await this.rabbit.consume(
      this.queue,
      async (msg) => this.handleMessage(msg),
      prefetch,
    );
  }

  async handleMessage(msg: any) {
    const raw = msg.content.toString();
    const job = JSON.parse(raw);
    this.logger.log(
      `Handling job ${job.jobId} (${job.testCases?.length || 0} tests)`,
    );

    await this.runService.setJobResult(job.jobId, {
      status: 'running',
      startedAt: Date.now(),
      progress: 0,
    });

    try {
      const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
      const testCases = job.testCases ?? [];
      const details: any[] = [];

      for (let i = 0; i < testCases.length; i += concurrency) {
        const batch = testCases.slice(i, i + concurrency);
        const promises = batch.map((t) => this.runSingleTest(job, t));
        const results = await Promise.all(promises);
        details.push(...results);

        // update progress
        const passed = details.filter((d) => d.status === 'Accepted').length;
        await this.runService.setJobResult(job.jobId, {
          progress: Math.round((details.length / testCases.length) * 100),
          partial: { passed, total: testCases.length },
        });
      }

      const passed = details.filter((d) => d.status === 'Accepted').length;
      const final = {
        status: 'completed',
        passed,
        total: details.length,
        details,
        finishedAt: Date.now(),
      };
      await this.runService.setJobResult(job.jobId, final);
      this.logger.log(`Job ${job.jobId} done: ${passed}/${details.length}`);
    } catch (err) {
      this.logger.error('Error processing job', err);
      await this.runService.setJobResult(job.jobId, {
        status: 'failed',
        error: err?.message ?? String(err),
      });
      throw err;
    }
  }

  async runSingleTest(job: any, testCase: any) {
    const payload = {
      source_code: job.source_code,
      language_id: job.language_id,
      stdin: testCase.stdin ?? '',
      expected_output: testCase.expected_output ?? undefined,
      cpu_time_limit: job.limits?.cpu_time_limit ?? 2.0,
      wall_time_limit: job.limits?.wall_time_limit ?? 5.0,
      memory_limit: job.limits?.memory_limit ?? 128000,
      enable_network: false,
    };

    // create submission
    const createRes = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
      payload,
      { headers: JUDGE0_HEADERS },
    );
    const token = createRes.data.token;
    // poll
    const polled = await this.pollSubmission(token);
    return {
      testId: testCase.id ?? null,
      status: polled.status?.description ?? 'Unknown',
      stdout: polled.stdout ?? null,
      stderr: polled.stderr ?? null,
      time: polled.time ?? null,
      memory: polled.memory ?? null,
    };
  }

  async pollSubmission(token: string) {
    const url = `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`;
    for (let attempt = 0; attempt < POLL_MAX; ++attempt) {
      const res = await axios.get(url, { headers: JUDGE0_HEADERS });
      const data = res.data;
      // Judge0 status.id > 2 usually indicates finished states in their model
      if (data.status && data.status.id && data.status.id > 2) {
        return data;
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    }
    throw new Error('Judge0 polling timeout');
  }
}
