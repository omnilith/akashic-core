import {
  Resolver,
  Query,
  Mutation,
  Args,
  ID,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { EntityTypesService } from './entity-types.service';
import { EntityTypeDto } from './dto/entity-type.dto';
import { CreateEntityTypeInput } from './dto/create-entity-type.input';
import { UpdateEntityTypeInput } from './dto/update-entity-type.input';

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

  @Query(() => [EntityTypeDto])
  async entityTypes(
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
}
