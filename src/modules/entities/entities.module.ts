// src/modules/entities/entities.module.ts
import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { LibModule } from '../../lib/lib.module';
import { EntityTypesModule } from '../entity-types/entity-types.module'; // ← Need this for EntityTypesRepo
import { EntitiesService } from './entities.service';
import { EntitiesRepo } from './entities.repo';
import { EntitiesResolver } from './entities.resolver';

@Module({
  imports: [
    DbModule, // For DrizzleService
    LibModule, // For ValidationService
    EntityTypesModule, // For EntityTypesRepo
  ],
  providers: [EntitiesService, EntitiesRepo, EntitiesResolver],
  exports: [EntitiesService],
})
export class EntitiesModule {}
