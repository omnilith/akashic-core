import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class DeleteEntityResponse {
  @Field(() => ID)
  id: string;

  @Field()
  deleted: boolean;

  @Field(() => ID)
  entityTypeId: string;
}
