import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AI_GRADING_QUEUE } from 'src/config/config';

@Processor(AI_GRADING_QUEUE)
export class RunWorker extends WorkerHost {
  async process(job: Job) {
    console.log('Processing job:', job.id, job.data);
  }
}
