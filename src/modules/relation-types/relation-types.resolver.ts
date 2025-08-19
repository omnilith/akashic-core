// src/modules/relation-types/relation-types.resolver.ts
import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { RelationTypesService } from './relation-types.service';
import { RelationTypeDto } from './dto/relation-type.dto';
import { CreateRelationTypeInput } from './dto/create-relation-type.input';
import { UpdateRelationTypeInput } from './dto/update-relation-type.input';

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

  @Query(() => [RelationTypeDto])
  async relationTypes(
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
}
