// src/modules/relations/relations.module.ts
import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { RelationTypesModule } from '../relation-types/relation-types.module';
import { EntitiesModule } from '../entities/entities.module';
import { RelationsService } from './relations.service';
import { RelationsRepo } from './relations.repo';
import { RelationsResolver } from './relations.resolver';

@Module({
  imports: [DbModule, RelationTypesModule, EntitiesModule],
  providers: [RelationsService, RelationsRepo, RelationsResolver],
  exports: [RelationsService],
})
export class RelationsModule {}
