import { InputType, Field } from '@nestjs/graphql';
import { JSONScalar } from '../../../lib/json.scalar';

@InputType()
export class CreateEntityTypeInput {
  @Field()
  namespace: string;

  @Field()
  name: string;

  @Field(() => JSONScalar)
  schema: any;
}
