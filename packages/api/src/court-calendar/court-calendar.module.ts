import { Module } from '@nestjs/common';
import { CourtCalendarService } from './court-calendar.service.js';
import { CourtCalendarController } from './court-calendar.controller.js';

@Module({
  controllers: [CourtCalendarController],
  providers: [CourtCalendarService],
  exports: [CourtCalendarService],
})
export class CourtCalendarModule {}
