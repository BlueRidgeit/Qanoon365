import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { MatterOnboardingProcessor } from './matter-onboarding.processor.js';
import { KycExpiryProcessor } from './kyc-expiry.processor.js';
import { InactivityAlertProcessor } from './inactivity-alert.processor.js';
import { EnforcementFollowupProcessor } from './enforcement-followup.processor.js';
import { EnforcementStaleCheckProcessor } from './enforcement-stale-check.processor.js';
import { JobsService } from './jobs.service.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(config.get<string>('REDIS_URL', 'redis://localhost:6379'));
        return {
          redis: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port) || 6379,
            password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
            tls: redisUrl.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: 'matter-onboarding' },
      { name: 'kyc-expiry' },
      { name: 'inactivity-alert' },
      { name: 'enforcement-followup' },
      { name: 'enforcement-stale-check' },
    ),
    PrismaModule,
    AuditModule,
  ],
  providers: [
    JobsService,
    MatterOnboardingProcessor,
    KycExpiryProcessor,
    InactivityAlertProcessor,
    EnforcementFollowupProcessor,
    EnforcementStaleCheckProcessor,
  ],
  exports: [JobsService],
})
export class JobsModule {}
