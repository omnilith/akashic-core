import { Field, InputType, Int } from '@nestjs/graphql';
import { JSONScalar } from '../../../lib/json.scalar';

@InputType()
export class EntityFilterInput {
  @Field({ nullable: true })
  namespace?: string;

  @Field({ nullable: true })
  entityTypeId?: string;

  @Field(() => JSONScalar, { nullable: true })
  data?: any; // JSON query filter

  @Field({ nullable: true })
  createdAfter?: Date;

  @Field({ nullable: true })
  createdBefore?: Date;

  @Field({ nullable: true })
  updatedAfter?: Date;

  @Field({ nullable: true })
  updatedBefore?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 100 })
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  offset?: number;

  @Field(() => [SortInput], { nullable: true })
  sort?: SortInput[];
}

@InputType()
export class SortInput {
  @Field()
  field: string;

  @Field({ defaultValue: 'ASC' })
  direction: 'ASC' | 'DESC';
}

// Query operators for JSON field matching
export enum QueryOperator {
  EQUALS = '$eq',
  NOT_EQUALS = '$ne',
  GREATER_THAN = '$gt',
  GREATER_THAN_OR_EQUAL = '$gte',
  LESS_THAN = '$lt',
  LESS_THAN_OR_EQUAL = '$lte',
  IN = '$in',
  NOT_IN = '$nin',
  CONTAINS = '$contains',
  EXISTS = '$exists',
  REGEX = '$regex',
}

export interface QueryCondition {
  [operator: string]: any;
}

export interface DataQuery {
  [fieldPath: string]: any | QueryCondition;
}