import { ObjectType, Field, Int } from '@nestjs/graphql';
import { RelationTypeDto } from './relation-type.dto';
import { PageInfo } from '../../common/dto/pagination.dto';

@ObjectType()
export class RelationTypeEdge {
  @Field(() => RelationTypeDto)
  node: RelationTypeDto;

  @Field()
  cursor: string;
}

@ObjectType()
export class RelationTypeConnection {
  @Field(() => [RelationTypeEdge])
  edges: RelationTypeEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => Int)
  totalCount: number;
}
