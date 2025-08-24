import { ObjectType, Field, Int } from '@nestjs/graphql';
import { EntityTypeDto } from './entity-type.dto';
import { PageInfo } from '../../common/dto/pagination.dto';

@ObjectType()
export class EntityTypeEdge {
  @Field(() => EntityTypeDto)
  node: EntityTypeDto;

  @Field()
  cursor: string;
}

@ObjectType()
export class EntityTypeConnection {
  @Field(() => [EntityTypeEdge])
  edges: EntityTypeEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => Int)
  totalCount: number;
}
