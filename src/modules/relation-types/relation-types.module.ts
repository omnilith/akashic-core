// src/modules/relation-types/relation-types.module.ts
import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { EntityTypesModule } from '../entity-types/entity-types.module';
import { RelationTypesService } from './relation-types.service';
import { RelationTypesRepo } from './relation-types.repo';
import { RelationTypesResolver } from './relation-types.resolver';

@Module({
  imports: [DbModule, EntityTypesModule],
  providers: [RelationTypesService, RelationTypesRepo, RelationTypesResolver],
  exports: [RelationTypesService],
})
export class RelationTypesModule {}
