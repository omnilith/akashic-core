// src/modules/entities/entities.repo.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { entity, InsertEntity, Entity } from '../../db/schema';
import { eq, and, SQL, sql } from 'drizzle-orm';
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

  async update(id: string, data: unknown): Promise<Entity | null> {
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

    // Build query with method chaining
    let query = this.drizzle.db.select().from(entity);

    // Apply WHERE conditions
    if (conditions.length > 0) {
      query = query.where(
        conditions.length === 1 ? conditions[0] : and(...conditions),
      ) as typeof query;
    }

    // Apply ORDER BY
    if (orderBy.length > 0) {
      // Use the first order clause if available
      // Note: Drizzle's chaining for multiple orderBy needs proper typing
      query = query.orderBy(...orderBy) as typeof query;
    }

    // Apply LIMIT
    if (filter.limit) {
      query = query.limit(filter.limit) as typeof query;
    }

    // Apply OFFSET
    if (filter.offset) {
      query = query.offset(filter.offset) as typeof query;
    }

    return await query;
  }

  async count(filter: EntityFilterInput): Promise<number> {
    const conditions = this.queryBuilder.buildWhereConditions(filter);

    let query = this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(entity);

    if (conditions.length > 0) {
      query = query.where(
        conditions.length === 1 ? conditions[0] : and(...conditions),
      ) as typeof query;
    }

    const [result] = await query;
    return result?.count ?? 0;
  }
}
