import { ObjectType, Field, Int, InputType } from '@nestjs/graphql';

@ObjectType()
export class PageInfo {
  @Field()
  hasNextPage: boolean;

  @Field()
  hasPreviousPage: boolean;

  @Field({ nullable: true })
  startCursor?: string | null;

  @Field({ nullable: true })
  endCursor?: string | null;
}

@InputType()
export class PaginationArgs {
  @Field(() => Int, { nullable: true, defaultValue: 100 })
  limit?: number = 100;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  offset?: number = 0;

  @Field({ nullable: true })
  cursor?: string;
}
