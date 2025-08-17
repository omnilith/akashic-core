import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { JSONScalar } from '../../../lib/json.scalar';

@ObjectType()
export class ProcessDefinitionDto {
  @Field(() => ID)
  id: string;

  @Field()
  namespace: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int)
  version: number;

  @Field(() => JSONScalar)
  steps: any;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  createdBy?: string;
}
