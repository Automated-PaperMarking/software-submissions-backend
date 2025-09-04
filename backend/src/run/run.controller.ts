import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { JobMessage } from 'src/type';
import { v4 as uuidv4 } from 'uuid';
import { RunService } from './run.service';

@Controller('run')
export class RunController {
  constructor(private readonly runService: RunService) {}

  @Post('sample')
  async runSample(@Body() body: any) {
    const jobId = uuidv4();
    await this.runService.enqueueJob({ jobId, ...body, type: 'sample' });
    return { jobId, status: 'queued' };
  }

  @Post('submit')
  async runSubmit(@Body() body: any) {
    const jobId = uuidv4();
    await this.runService.enqueueJob({ jobId, ...body, type: 'submit' });
  }

  @Get('statis/:jobId')
  async getStatus(@Param('jobId') jobId:string){
    const res= await this.runService.getJobStatus(jobId)
    return res;
  }
}
