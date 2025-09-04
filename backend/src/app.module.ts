import { Module } from '@nestjs/common';
import { RabbitService } from './rabbit/rabbit.service';
import { RedisService } from './redis/redis.service';
import { RunController } from './run/run.controller';
import { RunService } from './run/run.service';
import { WorkerService } from './worker/worker.service';

@Module({
  controllers: [RunController],
  providers: [RunService, RabbitService, WorkerService, RedisService],
})
export class AppModule {}
