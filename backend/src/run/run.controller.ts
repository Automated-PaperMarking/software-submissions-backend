import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { JobMessage } from 'src/types';
import { InjectQueue } from '@nestjs/bullmq';
import { AI_GRADING_QUEUE } from 'src/config/config';
import { Queue } from 'bullmq';

@Controller('run')
export class RunController {
  constructor(
    @InjectQueue(AI_GRADING_QUEUE) private readonly aiGradingQueue: Queue,
  ) {}

  @Post('run')
  async runCode(@Body() body: JobMessage) {
    await this.aiGradingQueue.add('grade-code', body);
    return { status: 'Code submitted' };
  }

  @Get()
  async getStatus() {
    return { status: 'Service is running' };
  }
}
