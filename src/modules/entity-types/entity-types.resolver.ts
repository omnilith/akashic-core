import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ObjectType,
  Field,
  Int,
} from '@nestjs/graphql';
import { EntityTypesService } from './entity-types.service';
import { EntityTypeDto } from './dto/entity-type.dto';
import { CreateEntityTypeInput } from './dto/create-entity-type.input';
import { UpdateEntityTypeInput } from './dto/update-entity-type.input';
import { EntityTypeConnection } from './dto/entity-type-connection.dto';

@ObjectType()
class DeleteEntityTypeResponse {
  @Field(() => ID)
  id: string;

  @Field()
  deleted: boolean;
}

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

  @Mutation(() => EntityTypeDto)
  async updateEntityType(@Args('input') input: UpdateEntityTypeInput) {
    return await this.entityTypesService.update(
      input.id,
      input.name,
      input.schema,
    );
  }

  @Mutation(() => DeleteEntityTypeResponse)
  async deleteEntityType(@Args('id', { type: () => ID }) id: string) {
    return await this.entityTypesService.delete(id);
  }

  @Query(() => [EntityTypeDto], {
    deprecationReason: 'Use entityTypesConnection for paginated results',
  })
  async entityTypesList(
    @Args('namespace', { nullable: true }) namespace?: string,
    @Args('name', { nullable: true }) name?: string,
  ) {
    if (name && namespace) {
      const result = await this.entityTypesService.findByNameAndNamespace(
        name,
        namespace,
      );
      return result ? [result] : [];
    }
    return await this.entityTypesService.findAll(namespace);
  }

  @Query(() => EntityTypeConnection)
  async entityTypes(
    @Args('namespace', { nullable: true }) namespace?: string,
    @Args('name', { nullable: true }) name?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 })
    limit: number = 100,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset: number = 0,
  ): Promise<EntityTypeConnection> {
    // Special case: if searching by name and namespace, return single result
    if (name && namespace) {
      const result = await this.entityTypesService.findByNameAndNamespace(
        name,
        namespace,
      );
      const nodes = result ? [result] : [];
      const edges = nodes.map((node, index) => ({
        node,
        cursor: Buffer.from(`${index}`).toString('base64'),
      }));
      return {
        edges,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[0].cursor : null,
        },
        totalCount: nodes.length,
      };
    }

    // Apply reasonable limits
    const actualLimit = Math.min(limit, 1000);
    const actualOffset = Math.max(offset, 0);

    // Get data and total count
    const [entityTypes, totalCount] = await Promise.all([
      this.entityTypesService.findAll(
        namespace,
        actualLimit + 1, // Fetch one extra to check if there's a next page
        actualOffset,
      ),
      this.entityTypesService.countAll(namespace),
    ]);

    // Check if there are more results
    const hasNextPage = entityTypes.length > actualLimit;
    const nodes = hasNextPage ? entityTypes.slice(0, actualLimit) : entityTypes;

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
}
