import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class StartProcessInput {
  @Field()
  namespace: string;

  @Field(() => ID)
  processDefId: string;

  @Field({ nullable: true })
  context?: string;

  @Field(() => [String], { nullable: true })
  assignees?: string[];
}