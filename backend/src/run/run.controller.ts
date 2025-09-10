import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { JobMessage } from 'src/types';
import { InjectQueue } from '@nestjs/bullmq';
import { AI_GRADING_QUEUE } from 'src/config/config';
import { Queue } from 'bullmq';
import { GeminiService } from 'src/gemini/gemini.service';

@Controller('run')
export class RunController {
  constructor(
    @InjectQueue(AI_GRADING_QUEUE) private readonly aiGradingQueue: Queue,
    private readonly geminiService: GeminiService,
  ) {}

  @Post()
  async runCode(@Body() body: JobMessage) {
    await this.aiGradingQueue.add('grade-code', body);
    const response = await this.geminiService.evaluateCode(
      body.source_code,
      'python',
    );
    return { status: 'Code submitted', evaluation: response };
  }

  @Get()
  async getStatus() {
    return { status: 'Service is running' };
  }
}
