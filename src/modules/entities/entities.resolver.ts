// src/modules/entities/entities.resolver.ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { EntitiesService } from './entities.service';
import { EntityDto } from './dto/entity.dto';
import { CreateEntityInput } from './dto/create-entity.input';
import { EntityFilterInput } from '../query-builder/dto/query-filter.dto';
import { DeleteEntityResponse } from './dto/delete-entity-response.dto';
import { EntityConnection } from './dto/entity-connection.dto';

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

  @Query(() => [EntityDto], {
    deprecationReason: 'Use entitiesConnection for paginated results',
  })
  async entitiesList(
    @Args('namespace', { nullable: true }) namespace?: string,
    @Args('entityTypeId', { nullable: true }) entityTypeId?: string,
  ) {
    return await this.entitiesService.findAll(namespace, entityTypeId);
  }

  @Query(() => EntityConnection)
  async entities(
    @Args('namespace', { nullable: true }) namespace?: string,
    @Args('entityTypeId', { nullable: true }) entityTypeId?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 })
    limit: number = 100,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset: number = 0,
  ): Promise<EntityConnection> {
    // Apply reasonable limits
    const actualLimit = Math.min(limit, 1000);
    const actualOffset = Math.max(offset, 0);

    // Get data and total count
    const [entities, totalCount] = await Promise.all([
      this.entitiesService.findAll(
        namespace,
        entityTypeId,
        actualLimit + 1, // Fetch one extra to check if there's a next page
        actualOffset,
      ),
      this.entitiesService.countAll(namespace, entityTypeId),
    ]);

    // Check if there are more results
    const hasNextPage = entities.length > actualLimit;
    const nodes = hasNextPage ? entities.slice(0, actualLimit) : entities;

    // Build edges with cursors
    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`${actualOffset + index}`).toString('base64'),
    }));

    // Build page info
    const pageInfo = {
      hasNextPage,
      hasPreviousPage: actualOffset > 0,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
      totalCount,
    };
  }

  @Mutation(() => EntityDto)
  async updateEntity(@Args('id') id: string, @Args('data') data: string) {
    return await this.entitiesService.update(id, JSON.parse(data));
  }

  @Query(() => EntityConnection)
  async searchEntities(
    @Args('filter') filter: EntityFilterInput,
  ): Promise<EntityConnection> {
    // Apply reasonable limits if not specified
    const actualLimit = Math.min(filter.limit || 100, 1000);
    const actualOffset = Math.max(filter.offset || 0, 0);

    // Update filter with actual limits
    const searchFilter = {
      ...filter,
      limit: actualLimit + 1, // Fetch one extra to check if there's a next page
      offset: actualOffset,
    };

    // Get data and count
    const [entities, totalCount] = await Promise.all([
      this.entitiesService.search(searchFilter),
      this.entitiesService.count(filter),
    ]);

    // Check if there are more results
    const hasNextPage = entities.length > actualLimit;
    const nodes = hasNextPage ? entities.slice(0, actualLimit) : entities;

    // Build edges with cursors
    const edges = nodes.map((node, index) => ({
      node,
      cursor: Buffer.from(`${actualOffset + index}`).toString('base64'),
    }));

    // Build page info
    const pageInfo = {
      hasNextPage,
      hasPreviousPage: actualOffset > 0,
      startCursor: edges.length > 0 ? edges[0].cursor : null,
      endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
    };

    return {
      edges,
      pageInfo,
      totalCount,
    };
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
