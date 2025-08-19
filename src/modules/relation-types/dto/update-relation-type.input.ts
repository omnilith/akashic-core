import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class UpdateRelationTypeInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  cardinality?: string;
}
