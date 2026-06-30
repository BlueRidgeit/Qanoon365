import { Module } from '@nestjs/common';
import { ConflictsService } from './conflicts.service.js';
import { ConflictAnalysisService } from './conflict-analysis.service.js';
import { ConflictsController } from './conflicts.controller.js';

@Module({
  controllers: [ConflictsController],
  providers: [ConflictsService, ConflictAnalysisService],
  exports: [ConflictsService, ConflictAnalysisService],
})
export class ConflictsModule {}
