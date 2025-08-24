// src/modules/relation-types/relation-types.resolver.ts
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
import { RelationTypesService } from './relation-types.service';
import { RelationTypeDto } from './dto/relation-type.dto';
import { CreateRelationTypeInput } from './dto/create-relation-type.input';
import { UpdateRelationTypeInput } from './dto/update-relation-type.input';
import { RelationTypeConnection } from './dto/relation-type-connection.dto';

@ObjectType()
class DeleteRelationTypeResponse {
  @Field(() => ID)
  id: string;

  @Field()
  deleted: boolean;
}

@Resolver(() => RelationTypeDto)
export class RelationTypesResolver {
  constructor(private relationTypesService: RelationTypesService) {}

  @Mutation(() => RelationTypeDto)
  async createRelationType(@Args('input') input: CreateRelationTypeInput) {
    return await this.relationTypesService.create(
      input.namespace,
      input.name,
      input.fromEntityTypeId,
      input.toEntityTypeId,
      input.cardinality,
    );
  }

  @Mutation(() => RelationTypeDto)
  async updateRelationType(@Args('input') input: UpdateRelationTypeInput) {
    return await this.relationTypesService.update(
      input.id,
      input.name,
      input.cardinality,
    );
  }

  @Mutation(() => DeleteRelationTypeResponse)
  async deleteRelationType(@Args('id', { type: () => ID }) id: string) {
    return await this.relationTypesService.delete(id);
  }

  @Query(() => [RelationTypeDto], {
    deprecationReason: 'Use relationTypesConnection for paginated results',
  })
  async relationTypesList(
    @Args('namespace', { nullable: true }) namespace?: string,
    @Args('name', { nullable: true }) name?: string,
  ) {
    if (name && namespace) {
      const result = await this.relationTypesService.findByNameAndNamespace(
        name,
        namespace,
      );
      return result ? [result] : [];
    }
    return await this.relationTypesService.findAll(namespace);
  }

  @Query(() => RelationTypeConnection)
  async relationTypes(
    @Args('namespace', { nullable: true }) namespace?: string,
    @Args('name', { nullable: true }) name?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 })
    limit: number = 100,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset: number = 0,
  ): Promise<RelationTypeConnection> {
    // Special case: if searching by name and namespace, return single result
    if (name && namespace) {
      const result = await this.relationTypesService.findByNameAndNamespace(
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
    const [relationTypes, totalCount] = await Promise.all([
      this.relationTypesService.findAll(
        namespace,
        actualLimit + 1, // Fetch one extra to check if there's a next page
        actualOffset,
      ),
      this.relationTypesService.countAll(namespace),
    ]);

    // Check if there are more results
    const hasNextPage = relationTypes.length > actualLimit;
    const nodes = hasNextPage
      ? relationTypes.slice(0, actualLimit)
      : relationTypes;

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
