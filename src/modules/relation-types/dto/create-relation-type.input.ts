import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class CreateRelationTypeInput {
  @Field()
  namespace: string;

  @Field()
  name: string;

  @Field(() => ID)
  fromEntityTypeId: string;

  @Field(() => ID)
  toEntityTypeId: string;

  @Field()
  cardinality: string;
}
