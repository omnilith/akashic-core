import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { EntityTypesService } from './entity-types.service';
import { EntityTypeDto } from './dto/entity-type.dto';
import { CreateEntityTypeInput } from './dto/create-entity-type.input';

@Resolver(() => EntityTypeDto)
export class EntityTypesResolver {
  constructor(private entityTypesService: EntityTypesService) {}

  @Mutation(() => EntityTypeDto)
  async createEntityType(@Args('input') input: CreateEntityTypeInput) {
    return await this.entityTypesService.create(
      input.namespace,
      input.name,
      input.schema,
    );
  }

  @Query(() => [EntityTypeDto])
  async entityTypes(@Args('namespace', { nullable: true }) namespace?: string) {
    return await this.entityTypesService.findAll(namespace);
  }
}
