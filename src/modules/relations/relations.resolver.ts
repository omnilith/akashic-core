// src/modules/relations/relations.resolver.ts
import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { RelationsService } from './relations.service';
import { RelationDto } from './dto/relation.dto';
import { CreateRelationInput } from './dto/create-relation.input';
import { RelationConnection } from './dto/relation-connection.dto';

@Resolver(() => RelationDto)
export class RelationsResolver {
  constructor(private relationsService: RelationsService) {}

  @Mutation(() => RelationDto)
  async createRelation(
    @Args('input') input: CreateRelationInput,
  ): Promise<RelationDto> {
    const metadata: unknown = input.metadata
      ? JSON.parse(input.metadata)
      : undefined;

    const relation = await this.relationsService.create(
      input.namespace,
      input.relationTypeId,
      input.fromEntityId,
      input.toEntityId,
      metadata,
    );

    return {
      ...relation,
      createdAt: relation.createdAt || new Date(),
      metadata: relation.metadata
        ? JSON.stringify(relation.metadata)
        : undefined,
    };
  }

  @Mutation(() => RelationDto)
  async deleteRelation(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<RelationDto> {
    const relation = await this.relationsService.delete(id);

    return {
      ...relation,
      createdAt: relation.createdAt || new Date(),
      metadata: relation.metadata
        ? JSON.stringify(relation.metadata)
        : undefined,
    };
  }

  @Query(() => [RelationDto], {
    deprecationReason: 'Use relationsConnection for paginated results',
  })
  async relationsList(
    @Args('namespace', { nullable: true }) namespace?: string,
    @Args('relationTypeId', { type: () => ID, nullable: true })
    relationTypeId?: string,
    @Args('fromEntityId', { type: () => ID, nullable: true })
    fromEntityId?: string,
    @Args('toEntityId', { type: () => ID, nullable: true }) toEntityId?: string,
  ): Promise<RelationDto[]> {
    const relations = await this.relationsService.findAll({
      namespace,
      relationTypeId,
      fromEntityId,
      toEntityId,
    });

    return relations.map((relation) => ({
      ...relation,
      createdAt: relation.createdAt || new Date(),
      metadata: relation.metadata
        ? JSON.stringify(relation.metadata)
        : undefined,
    }));
  }

  @Query(() => RelationConnection)
  async relations(
    @Args('namespace', { nullable: true }) namespace?: string,
    @Args('relationTypeId', { type: () => ID, nullable: true })
    relationTypeId?: string,
    @Args('fromEntityId', { type: () => ID, nullable: true })
    fromEntityId?: string,
    @Args('toEntityId', { type: () => ID, nullable: true }) toEntityId?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 })
    limit: number = 100,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 })
    offset: number = 0,
  ): Promise<RelationConnection> {
    // Apply reasonable limits
    const actualLimit = Math.min(limit, 1000);
    const actualOffset = Math.max(offset, 0);

    const filters = {
      namespace,
      relationTypeId,
      fromEntityId,
      toEntityId,
    };

    // Get data and total count
    const [relations, totalCount] = await Promise.all([
      this.relationsService.findAll(
        filters,
        actualLimit + 1, // Fetch one extra to check if there's a next page
        actualOffset,
      ),
      this.relationsService.countAll(filters),
    ]);

    // Check if there are more results
    const hasNextPage = relations.length > actualLimit;
    const nodes = hasNextPage ? relations.slice(0, actualLimit) : relations;

    // Build edges with cursors and transform metadata
    const edges = nodes.map((node, index) => ({
      node: {
        ...node,
        createdAt: node.createdAt || new Date(),
        metadata: node.metadata ? JSON.stringify(node.metadata) : undefined,
      },
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

  @Query(() => RelationDto, { nullable: true })
  async relation(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<RelationDto | null> {
    const relation = await this.relationsService.findById(id);

    if (!relation) {
      return null;
    }

    return {
      ...relation,
      createdAt: relation.createdAt || new Date(),
      metadata: relation.metadata
        ? JSON.stringify(relation.metadata)
        : undefined,
    };
  }
}
