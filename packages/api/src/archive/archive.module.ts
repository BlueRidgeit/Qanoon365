import { Module } from '@nestjs/common';
import { ArchiveService } from './archive.service.js';
import { ArchiveController } from './archive.controller.js';

@Module({
  controllers: [ArchiveController],
  providers: [ArchiveService],
  exports: [ArchiveService],
})
export class ArchiveModule {}
