// src/modules/processes/process-definitions.module.ts
import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { EventsModule } from '../events/events.module';
import { ProcessDefinitionsService } from './process-definitions.service';
import { ProcessDefinitionsRepo } from './process-definitions.repo';
import { ProcessDefinitionsResolver } from './process-definitions.resolver';
import { ProcessInstancesService } from './process-instances.service';
import { ProcessInstancesResolver } from './process-instances.resolver';
import { ProcessInstancesRepo } from './process-instances.repo';

@Module({
  imports: [DbModule, EventsModule],
  providers: [
    ProcessDefinitionsService,
    ProcessInstancesService,
    ProcessDefinitionsRepo,
    ProcessDefinitionsResolver,
    ProcessInstancesRepo,
    ProcessInstancesResolver,
  ],
  exports: [ProcessDefinitionsService],
})
export class ProcessesModule {}
