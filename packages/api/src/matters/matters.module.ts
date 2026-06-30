import { Module } from '@nestjs/common';
import { MattersService } from './matters.service.js';
import { MattersController } from './matters.controller.js';

@Module({
  controllers: [MattersController],
  providers: [MattersService],
  exports: [MattersService],
})
export class MattersModule {}
