import { InputType, Field, ID } from '@nestjs/graphql';

@InputType()
export class UpdateEntityTypeInput {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  schema?: string;
}
