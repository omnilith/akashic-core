// src/modules/relation-types/relation-types.resolver.ts
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { RelationTypesService } from './relation-types.service';
import { RelationTypeDto } from './dto/relation-type.dto';
import { CreateRelationTypeInput } from './dto/create-relation-type.input';

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

  @Query(() => [RelationTypeDto])
  async relationTypes(
    @Args('namespace', { nullable: true }) namespace?: string,
  ) {
    return await this.relationTypesService.findAll(namespace);
  }
}
