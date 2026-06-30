import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service.js';
import { ContactsController } from './contacts.controller.js';

@Module({
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
