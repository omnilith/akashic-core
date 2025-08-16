// src/modules/entities/dto/entity.dto.ts
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { JSONScalar } from '../../../lib/json.scalar';

@ObjectType()
export class EntityDto {
  @Field(() => ID)
  id: string;

  @Field()
  namespace: string;

  @Field(() => ID)
  entityTypeId: string;

  @Field(() => Int)
  entityTypeVersion: number;

  @Field(() => JSONScalar)
  data: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
