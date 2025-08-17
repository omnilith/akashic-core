// src/modules/events/dto/event.dto.ts
import { ObjectType, Field, ID } from '@nestjs/graphql';
import { JSONScalar } from '../../../lib/json.scalar';

@ObjectType()
export class EventDto {
  @Field(() => ID)
  id: string;

  @Field()
  eventType: string;

  @Field()
  resourceType: string;

  @Field(() => ID)
  resourceId: string;

  @Field()
  namespace: string;

  @Field(() => JSONScalar)
  payload: any;

  @Field(() => JSONScalar, { nullable: true })
  metadata?: any;

  @Field()
  timestamp: Date;
}
