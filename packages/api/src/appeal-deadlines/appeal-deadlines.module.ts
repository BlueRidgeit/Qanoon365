import { Module } from '@nestjs/common';
import { AppealDeadlinesService } from './appeal-deadlines.service.js';
import { AppealDeadlinesController } from './appeal-deadlines.controller.js';

@Module({
  controllers: [AppealDeadlinesController],
  providers: [AppealDeadlinesService],
  exports: [AppealDeadlinesService],
})
export class AppealDeadlinesModule {}
