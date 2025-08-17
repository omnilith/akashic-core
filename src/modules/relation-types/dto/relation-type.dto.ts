import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class RelationTypeDto {
  @Field(() => ID)
  id: string;

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

  @Field(() => Int)
  version: number;

  @Field()
  createdAt: Date;
}
