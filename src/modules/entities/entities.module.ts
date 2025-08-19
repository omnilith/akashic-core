// src/modules/entities/entities.module.ts
import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { LibModule } from '../../lib/lib.module';
import { EntityTypesModule } from '../entity-types/entity-types.module';
import { EventsModule } from '../events/events.module';
import { QueryBuilderModule } from '../query-builder/query-builder.module';
import { EntitiesService } from './entities.service';
import { EntitiesRepo } from './entities.repo';
import { EntitiesResolver } from './entities.resolver';

@Module({
  imports: [
    DbModule, // For DrizzleService
    LibModule, // For ValidationService
    EventsModule,
    EntityTypesModule, // For EntityTypesRepo
    QueryBuilderModule, // For QueryBuilderService
  ],
  providers: [EntitiesService, EntitiesRepo, EntitiesResolver],
  exports: [EntitiesService],
})
export class EntitiesModule {}
