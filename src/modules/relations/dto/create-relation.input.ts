// src/modules/relations/dto/create-relation.input.ts
import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateRelationInput {
  @Field()
  namespace: string;

  @Field(() => ID)
  relationTypeId: string;

  @Field(() => ID)
  fromEntityId: string;

  @Field(() => ID)
  toEntityId: string;

  @Field(() => String, { nullable: true })
  metadata?: string;
}
