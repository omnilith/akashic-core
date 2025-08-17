// src/modules/relations/dto/delete-relation.input.ts
import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class DeleteRelationInput {
  @Field(() => ID)
  id: string;
}
