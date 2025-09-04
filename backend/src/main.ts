import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api'); // optional
  await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3000);
  console.log(`Code Runner API listening on ${await app.getUrl()}`);
}
bootstrap();
