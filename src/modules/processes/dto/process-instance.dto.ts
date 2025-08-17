import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { JSONScalar } from '../../../lib/json.scalar';

@ObjectType()
export class ProcessInstanceDto {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  processDefId: string;

  @Field()
  namespace: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  currentStep?: string;

  @Field(() => Int)
  currentStepIndex: number;

  @Field(() => JSONScalar)
  context: any;

  @Field(() => JSONScalar)
  completedSteps: any;

  @Field(() => JSONScalar)
  assignees: any;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  completedAt?: Date;
}