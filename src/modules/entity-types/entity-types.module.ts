import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module';
import { EntityTypesRepo } from './entity-types.repo';
import { EntityTypesService } from './entity-types.service';
import { EntityTypesResolver } from './entity-types.resolver';
import { LibModule } from 'src/lib/lib.module';

@Module({
  imports: [DbModule, LibModule],
  providers: [EntityTypesRepo, EntityTypesService, EntityTypesResolver],
  exports: [EntityTypesService],
})
export class EntityTypesModule {}
