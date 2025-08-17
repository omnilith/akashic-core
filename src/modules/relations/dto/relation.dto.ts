// src/modules/relations/dto/relation.dto.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class RelationDto {
  @Field(() => ID)
  id: string;

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

  @Field()
  createdAt: Date;
}
