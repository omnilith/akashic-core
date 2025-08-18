import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class AdvanceProcessInput {
  @Field(() => ID)
  instanceId: string;

  @Field({ nullable: true })
  stepInput?: string;
}
