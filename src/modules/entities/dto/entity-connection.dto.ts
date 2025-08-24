import { ObjectType, Field, Int } from '@nestjs/graphql';
import { EntityDto } from './entity.dto';
import { PageInfo } from '../../common/dto/pagination.dto';

@ObjectType()
export class EntityEdge {
  @Field(() => EntityDto)
  node: EntityDto;

  @Field()
  cursor: string;
}

@ObjectType()
export class EntityConnection {
  @Field(() => [EntityEdge])
  edges: EntityEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => Int)
  totalCount: number;
}
