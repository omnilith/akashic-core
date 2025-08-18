// src/modules/entities/entities.repo.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { entity, InsertEntity, Entity } from '../../db/schema';
import { eq, and, SQL } from 'drizzle-orm';

@Injectable()
export class EntitiesRepo {
  constructor(private drizzle: DrizzleService) {}

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
}
