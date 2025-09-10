import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RunController } from './run/run.controller';
import { RunWorker } from './run/run.worker';
import { BullModule } from '@nestjs/bullmq';
import { AI_GRADING_QUEUE } from './config/config';
import { GeminiService } from './gemini/gemini.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 2,
        removeOnFail: 2,
      }, //retry a job 3 times if it fails
    }),
    BullModule.registerQueue({
      name: AI_GRADING_QUEUE,
    }), //register the queue
  ],
  controllers: [RunController],
  providers: [RunWorker, GeminiService],
})
export class AppModule {}
