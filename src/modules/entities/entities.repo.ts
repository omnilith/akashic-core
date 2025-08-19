// src/modules/entities/entities.repo.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { entity, InsertEntity, Entity } from '../../db/schema';
import { eq, and, SQL } from 'drizzle-orm';
import { QueryBuilderService } from '../query-builder/query-builder.service';
import { EntityFilterInput } from '../query-builder/dto/query-filter.dto';

@Injectable()
export class EntitiesRepo {
  constructor(
    private drizzle: DrizzleService,
    private queryBuilder: QueryBuilderService,
  ) {}

  async create(data: InsertEntity): Promise<Entity> {
    const [newEntity] = await this.drizzle.db
      .insert(entity)
      .values(data)
      .returning();

    return newEntity;
  }

  async findAll(namespace?: string, entityTypeId?: string): Promise<Entity[]> {
    const conditions: SQL[] = [];

    if (namespace) {
      conditions.push(eq(entity.namespace, namespace));
    }

    if (entityTypeId) {
      conditions.push(eq(entity.entityTypeId, entityTypeId));
    }

    if (conditions.length > 0) {
      return await this.drizzle.db
        .select()
        .from(entity)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }

    return await this.drizzle.db.select().from(entity);
  }

  async findById(id: string): Promise<Entity | null> {
    const [found] = await this.drizzle.db
      .select()
      .from(entity)
      .where(eq(entity.id, id));

    return found || null;
  }

  async update(id: string, data: any): Promise<Entity | null> {
    const [updated] = await this.drizzle.db
      .update(entity)
      .set({
        data,
        updatedAt: new Date(),
      })
      .where(eq(entity.id, id))
      .returning();

    return updated || null;
  }

  async search(filter: EntityFilterInput): Promise<Entity[]> {
    const conditions = this.queryBuilder.buildWhereConditions(filter);
    const orderBy = this.queryBuilder.buildOrderBy(filter.sort);

    // Build the base query
    const baseQuery = this.drizzle.db.select().from(entity);

    // Apply WHERE conditions
    const whereQuery =
      conditions.length > 0
        ? baseQuery.where(
            conditions.length === 1 ? conditions[0] : and(...conditions),
          )
        : baseQuery;

    // Apply ORDER BY
    let orderedQuery = whereQuery;
    for (const order of orderBy) {
      // @ts-expect-error - Drizzle types don't properly handle dynamic orderBy
      orderedQuery = orderedQuery.orderBy(order);
    }

    // Apply LIMIT
    const limitedQuery = filter.limit
      ? orderedQuery.limit(filter.limit)
      : orderedQuery;

    // Apply OFFSET
    const finalQuery = filter.offset
      ? limitedQuery.offset(filter.offset)
      : limitedQuery;

    return await finalQuery;
  }

  async count(filter: EntityFilterInput): Promise<number> {
    const conditions = this.queryBuilder.buildWhereConditions(filter);

    const baseQuery = this.drizzle.db.select({ count: entity.id }).from(entity);

    const whereQuery =
      conditions.length > 0
        ? baseQuery.where(
            conditions.length === 1 ? conditions[0] : and(...conditions),
          )
        : baseQuery;

    const result = await whereQuery;
    return result.length;
  }
}
