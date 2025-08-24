// src/modules/entities/entities.repo.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService, DrizzleTransaction } from '../../db/drizzle.service';
import { entity, InsertEntity, Entity, InsertEventLog } from '../../db/schema';
import { eq, and, SQL, sql } from 'drizzle-orm';
import { QueryBuilderService } from '../query-builder/query-builder.service';
import { EntityFilterInput } from '../query-builder/dto/query-filter.dto';
import { EventsRepo } from '../events/events.repo';

@Injectable()
export class EntitiesRepo {
  constructor(
    private drizzle: DrizzleService,
    private queryBuilder: QueryBuilderService,
    private eventsRepo: EventsRepo,
  ) {}

  private getDb(tx?: DrizzleTransaction) {
    // Both NodePgDatabase and NodePgTransaction share the same query interface
    // This helper ensures we use the transaction if provided, otherwise the main db
    return tx ?? this.drizzle.db;
  }

  async create(data: InsertEntity, tx?: DrizzleTransaction): Promise<Entity> {
    const db = this.getDb(tx);
    const [newEntity] = await db.insert(entity).values(data).returning();
    return newEntity;
  }

  async findAll(
    namespace?: string,
    entityTypeId?: string,
    limit?: number,
    offset?: number,
  ): Promise<Entity[]> {
    const conditions: SQL[] = [];

    if (namespace) {
      conditions.push(eq(entity.namespace, namespace));
    }

    if (entityTypeId) {
      conditions.push(eq(entity.entityTypeId, entityTypeId));
    }

    let query = this.drizzle.db.select().from(entity);

    if (conditions.length > 0) {
      query = query.where(
        conditions.length === 1 ? conditions[0] : and(...conditions),
      ) as typeof query;
    }

    if (limit) {
      query = query.limit(limit) as typeof query;
    }

    if (offset) {
      query = query.offset(offset) as typeof query;
    }

    return await query;
  }

  async countAll(namespace?: string, entityTypeId?: string): Promise<number> {
    const conditions: SQL[] = [];

    if (namespace) {
      conditions.push(eq(entity.namespace, namespace));
    }

    if (entityTypeId) {
      conditions.push(eq(entity.entityTypeId, entityTypeId));
    }

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

  async findById(id: string, tx?: DrizzleTransaction): Promise<Entity | null> {
    const db = this.getDb(tx);
    const [found] = await db.select().from(entity).where(eq(entity.id, id));
    return found || null;
  }

  async update(
    id: string,
    data: unknown,
    tx?: DrizzleTransaction,
  ): Promise<Entity | null> {
    const db = this.getDb(tx);
    const [updated] = await db
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

  async createWithEvent(
    entityData: InsertEntity,
    eventData: Omit<InsertEventLog, 'id' | 'timestamp' | 'resourceId'> & {
      payload: any;
    },
  ): Promise<Entity> {
    return await this.drizzle.transaction(async (tx) => {
      const newEntity = await this.create(entityData, tx);
      await this.eventsRepo.create(
        {
          ...eventData,
          resourceId: newEntity.id,
        },
        tx,
      );
      return newEntity;
    });
  }

  async updateWithEvent(
    id: string,
    data: unknown,
    eventData: Omit<InsertEventLog, 'id' | 'timestamp'>,
  ): Promise<Entity | null> {
    return await this.drizzle.transaction(async (tx) => {
      const updatedEntity = await this.update(id, data, tx);
      if (updatedEntity) {
        await this.eventsRepo.create(eventData, tx);
      }
      return updatedEntity;
    });
  }

  async delete(id: string, tx?: DrizzleTransaction): Promise<Entity | null> {
    const db = this.getDb(tx);
    const [deleted] = await db
      .delete(entity)
      .where(eq(entity.id, id))
      .returning();
    return deleted || null;
  }

  async deleteWithEvent(
    id: string,
    eventData: Omit<InsertEventLog, 'id' | 'timestamp'>,
  ): Promise<Entity | null> {
    return await this.drizzle.transaction(async (tx) => {
      const deletedEntity = await this.delete(id, tx);
      if (deletedEntity) {
        await this.eventsRepo.create(eventData, tx);
      }
      return deletedEntity;
    });
  }
}
