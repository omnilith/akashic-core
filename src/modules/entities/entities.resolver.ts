// src/modules/entities/entities.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { EntitiesService } from './entities.service';
import { EntityDto } from './dto/entity.dto';
import { CreateEntityInput } from './dto/create-entity.input';
import { EntityFilterInput } from '../query-builder/dto/query-filter.dto';
import { DeleteEntityResponse } from './dto/delete-entity-response.dto';

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
  async entities(
    @Args('namespace', { nullable: true }) namespace?: string,
    @Args('entityTypeId', { nullable: true }) entityTypeId?: string,
  ) {
    return await this.entitiesService.findAll(namespace, entityTypeId);
  }

  @Mutation(() => EntityDto)
  async updateEntity(@Args('id') id: string, @Args('data') data: string) {
    return await this.entitiesService.update(id, JSON.parse(data));
  }

  @Query(() => [EntityDto])
  async searchEntities(@Args('filter') filter: EntityFilterInput) {
    return await this.entitiesService.search(filter);
  }

  @Query(() => Int)
  async countEntities(@Args('filter') filter: EntityFilterInput) {
    return await this.entitiesService.count(filter);
  }

  @Mutation(() => DeleteEntityResponse)
  async deleteEntity(@Args('id') id: string) {
    return await this.entitiesService.delete(id);
  }
}
