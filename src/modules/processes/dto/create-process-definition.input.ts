import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateProcessDefinitionInput {
  @Field()
  namespace: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  steps: string;
}
