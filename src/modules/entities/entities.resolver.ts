// src/modules/entities/entities.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { EntitiesService } from './entities.service';
import { EntityDto } from './dto/entity.dto';
import { CreateEntityInput } from './dto/create-entity.input';

@Resolver(() => EntityDto)
export class EntitiesResolver {
  constructor(private entitiesService: EntitiesService) {}

  @Mutation(() => EntityDto)
  async createEntity(@Args('input') input: CreateEntityInput) {
    return await this.entitiesService.create(
      input.namespace,
      input.entityTypeId,
      JSON.parse(input.data),
    );
  }

  @Query(() => [EntityDto])
  async entities(@Args('namespace', { nullable: true }) namespace?: string) {
    return await this.entitiesService.findAll(namespace);
  }
}
