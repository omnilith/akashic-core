import { ObjectType, Field, Int } from '@nestjs/graphql';
import { RelationDto } from './relation.dto';
import { PageInfo } from '../../common/dto/pagination.dto';

@ObjectType()
export class RelationEdge {
  @Field(() => RelationDto)
  node: RelationDto;

  @Field()
  cursor: string;
}

@ObjectType()
export class RelationConnection {
  @Field(() => [RelationEdge])
  edges: RelationEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => Int)
  totalCount: number;
}
