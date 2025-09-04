import * as amqplib from 'amqplib';
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

@Injectable()
export class RabbitService implements OnModuleInit, OnModuleDestroy {
  private url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
  private conn: amqplib.Connection;
  private ch: amqplib.Channel;
  private logger = new Logger(RabbitService.name);

  async onModuleInit() {
    await this.connect();
  }

  async connect() {
    this.conn = await amqplib.connect(this.url);
    this.ch = await this.conn.createChannel();
    this.logger.log('Connected to RabbitMQ');
  }

  async assertExchange(exchange: string) {
    await this.ch.assertExchange(exchange, 'direct', { durable: true });
  }

  async assertQueue(queue: string, exchange?: string) {
    await this.ch.assertQueue(queue, { durable: true });
    if (exchange) await this.ch.bindQueue(queue, exchange, queue);
  }

  async publish(exchange: string, routingKey: string, content: Buffer) {
    return this.ch.publish(exchange, routingKey, content, { persistent: true });
  }

  async consume(
    queue: string,
    onMessage: (msg: amqplib.ConsumeMessage) => Promise<void>,
    prefetch = 5,
  ) {
    await this.ch.assertQueue(queue, { durable: true });
    this.ch.prefetch(prefetch);
    await this.ch.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        await onMessage(msg);
        this.ch.ack(msg);
      } catch (err) {
        this.logger.error(
          'Error processing message, nack and move to DLQ or drop',
          err,
        );
        this.ch.nack(msg, false, false); // do not requeue by default
      }
    });
  }

  async onModuleDestroy() {
    await this.ch?.close();
    await this.conn?.close();
  }
}
