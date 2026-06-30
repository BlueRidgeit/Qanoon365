import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TenancyModule } from './tenancy/tenancy.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { OpportunitiesModule } from './opportunities/opportunities.module.js';
import { MattersModule } from './matters/matters.module.js';
import { ActivitiesModule } from './activities/activities.module.js';
import { ConflictsModule } from './conflicts/conflicts.module.js';
import { KycModule } from './kyc/kyc.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { CourtIntelModule } from './court-intel/court-intel.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { AiDraftingModule } from './ai-drafting/ai-drafting.module.js';
import { TimeBillingModule } from './time-billing/time-billing.module.js';
import { CourtCalendarModule } from './court-calendar/court-calendar.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { EnforcementModule } from './enforcement/enforcement.module.js';
import { ComplaintsModule } from './complaints/complaints.module.js';
import { EmailModule } from './email/email.module.js';
import { FollowUpsModule } from './follow-ups/follow-ups.module.js';
import { AppealDeadlinesModule } from './appeal-deadlines/appeal-deadlines.module.js';
import { ArchiveModule } from './archive/archive.module.js';
import { DaleelModule } from './daleel/daleel.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    TenancyModule,
    ClientsModule,
    ContactsModule,
    LeadsModule,
    OpportunitiesModule,
    MattersModule,
    ActivitiesModule,
    ConflictsModule,
    KycModule,
    DocumentsModule,
    DashboardModule,
    CourtIntelModule,
    JobsModule,
    AiDraftingModule,
    TimeBillingModule,
    CourtCalendarModule,
    TasksModule,
    NotificationsModule,
    EnforcementModule,
    ComplaintsModule,
    EmailModule,
    FollowUpsModule,
    AppealDeadlinesModule,
    ArchiveModule,
    DaleelModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
