// src/modules/relations/relations.resolver.ts
import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { RelationsService } from './relations.service';
import { RelationDto } from './dto/relation.dto';
import { CreateRelationInput } from './dto/create-relation.input';

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

  @Query(() => [RelationDto])
  async relations(
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
