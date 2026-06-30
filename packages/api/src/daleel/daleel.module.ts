import { Module } from '@nestjs/common';
import { DaleelService } from './daleel.service.js';
import { DaleelController } from './daleel.controller.js';
import { DaleelConfig } from './daleel.config.js';

@Module({
  controllers: [DaleelController],
  providers: [DaleelService, DaleelConfig],
  exports: [DaleelService],
})
export class DaleelModule {}
