// src/modules/entities/dto/create-entity.input.ts
import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateEntityInput {
  @Field()
  namespace: string;

  @Field(() => ID)
  entityTypeId: string;

  @Field() // ← Using string for now like EntityTypes
  data: string;
}
