// src/modules/entity-types/dto/entity-type.dto.ts
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { JSONScalar } from '../../../lib/json.scalar';

@ObjectType()
export class EntityTypeDto {
  @Field(() => ID)
  id: string;

  @Field()
  namespace: string;

  @Field()
  name: string;

  @Field(() => Int)
  version: number;

  @Field(() => JSONScalar)
  schemaJson: any;

  @Field()
  createdAt: Date;
}
