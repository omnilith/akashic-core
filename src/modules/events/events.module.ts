import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { EventsService } from './events.service';
import { EventsRepo } from './events.repo';
import { EventsResolver } from './events.resolver';

@Module({
  imports: [DbModule],
  providers: [EventsService, EventsRepo, EventsResolver],
  exports: [EventsService, EventsRepo],
})
export class EventsModule {}
