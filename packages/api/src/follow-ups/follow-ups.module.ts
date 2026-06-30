import { Module } from '@nestjs/common';
import { FollowUpsService } from './follow-ups.service.js';
import { FollowUpsController } from './follow-ups.controller.js';

@Module({
  controllers: [FollowUpsController],
  providers: [FollowUpsService],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
