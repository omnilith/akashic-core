import { Injectable } from '@nestjs/common';
import { SQL, sql, and, eq, gte, lte } from 'drizzle-orm';
import { entity } from '../../db/schema';
import {
  EntityFilterInput,
  QueryOperator,
  DataQuery,
} from './dto/query-filter.dto';

@Injectable()
export class QueryBuilderService {
  /**
   * Build SQL conditions from filter input
   */
  buildWhereConditions(filter: EntityFilterInput): SQL[] {
    const conditions: SQL[] = [];

    // Basic field filters
    if (filter.namespace) {
      conditions.push(eq(entity.namespace, filter.namespace));
    }

    if (filter.entityTypeId) {
      conditions.push(eq(entity.entityTypeId, filter.entityTypeId));
    }

    // Date range filters
    if (filter.createdAfter) {
      conditions.push(gte(entity.createdAt, filter.createdAfter));
    }

    if (filter.createdBefore) {
      conditions.push(lte(entity.createdAt, filter.createdBefore));
    }

    if (filter.updatedAfter) {
      conditions.push(gte(entity.updatedAt, filter.updatedAfter));
    }

    if (filter.updatedBefore) {
      conditions.push(lte(entity.updatedAt, filter.updatedBefore));
    }

    // JSON data filters
    if (filter.data) {
      const jsonConditions = this.buildJsonConditions(filter.data as DataQuery);
      if (jsonConditions) {
        conditions.push(jsonConditions);
      }
    }

    return conditions;
  }

  /**
   * Build JSON field query conditions
   */
  private buildJsonConditions(dataQuery: DataQuery): SQL | null {
    const conditions: SQL[] = [];

    for (const [fieldPath, value] of Object.entries(dataQuery)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Handle operator-based queries
        for (const [operator, operand] of Object.entries(
          value as Record<string, unknown>,
        )) {
          const condition = this.buildJsonOperatorCondition(
            fieldPath,
            operator as QueryOperator,
            operand,
          );
          if (condition) {
            conditions.push(condition);
          }
        }
      } else {
        // Direct equality check
        conditions.push(this.buildJsonEqualsCondition(fieldPath, value));
      }
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];
    return and(...conditions) ?? null;
  }

  /**
   * Build condition for a specific JSON operator
   */
  private buildJsonOperatorCondition(
    fieldPath: string,
    operator: QueryOperator,
    value: any,
  ): SQL | null {
    const jsonPath = this.buildJsonPath(fieldPath);

    switch (operator) {
      case QueryOperator.EQUALS:
        return sql`${jsonPath} = ${JSON.stringify(value)}::jsonb`;

      case QueryOperator.NOT_EQUALS:
        return sql`${jsonPath} != ${JSON.stringify(value)}::jsonb`;

      case QueryOperator.GREATER_THAN:
        return sql`(${jsonPath})::numeric > ${value}`;

      case QueryOperator.GREATER_THAN_OR_EQUAL:
        return sql`(${jsonPath})::numeric >= ${value}`;

      case QueryOperator.LESS_THAN:
        return sql`(${jsonPath})::numeric < ${value}`;

      case QueryOperator.LESS_THAN_OR_EQUAL:
        return sql`(${jsonPath})::numeric <= ${value}`;

      case QueryOperator.IN: {
        if (!Array.isArray(value)) return null;
        const inValues = value.map((v) => JSON.stringify(v)).join(',');
        return sql`${jsonPath} IN (${sql.raw(inValues)})`;
      }

      case QueryOperator.NOT_IN: {
        if (!Array.isArray(value)) return null;
        const ninValues = value.map((v) => JSON.stringify(v)).join(',');
        return sql`${jsonPath} NOT IN (${sql.raw(ninValues)})`;
      }

      case QueryOperator.CONTAINS: {
        // For arrays or strings
        const containsValue = { [fieldPath]: value as unknown };
        return sql`${entity.data} @> ${JSON.stringify(containsValue)}::jsonb`;
      }

      case QueryOperator.EXISTS:
        if (value === true) {
          return sql`${jsonPath} IS NOT NULL`;
        } else {
          return sql`${jsonPath} IS NULL`;
        }

      case QueryOperator.REGEX:
        // Extract text and apply regex
        return sql`${jsonPath} ->> 0 ~ ${value}`;

      default:
        return null;
    }
  }

  /**
   * Build JSON equality condition
   */
  private buildJsonEqualsCondition(fieldPath: string, value: any): SQL {
    const jsonPath = this.buildJsonPath(fieldPath);

    if (value === null) {
      return sql`${jsonPath} IS NULL`;
    }

    if (typeof value === 'string') {
      return sql`${jsonPath} ->> 0 = ${value}`;
    }

    return sql`${jsonPath} = ${JSON.stringify(value)}::jsonb`;
  }

  /**
   * Build PostgreSQL JSON path expression
   */
  private buildJsonPath(fieldPath: string): SQL {
    const parts = fieldPath.split('.');
    let path = sql`${entity.data}`;

    for (const part of parts) {
      // Handle array indices like "tags[0]"
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, field, index] = arrayMatch;
        path = sql`${path}->'${sql.raw(field)}'->>${sql.raw(index)}`;
      } else {
        path = sql`${path}->'${sql.raw(part)}'`;
      }
    }

    return path;
  }

  /**
   * Build ORDER BY clause from sort input
   */
  buildOrderBy(sort?: { field: string; direction: 'ASC' | 'DESC' }[]): SQL[] {
    if (!sort || sort.length === 0) {
      return [sql`${entity.createdAt} DESC`];
    }

    return sort.map((s) => {
      // Handle JSON field sorting
      if (s.field.startsWith('data.')) {
        const jsonPath = this.buildJsonPath(s.field.substring(5));
        return s.direction === 'DESC'
          ? sql`${jsonPath} DESC`
          : sql`${jsonPath} ASC`;
      }

      // Handle regular fields
      const field = (entity as unknown as Record<string, unknown>)[s.field];
      if (!field) {
        // Default to createdAt if field not found
        return sql`${entity.createdAt} DESC`;
      }

      return s.direction === 'DESC' ? sql`${field} DESC` : sql`${field} ASC`;
    });
  }
}
