// src/modules/entities/entities.repo.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { entity, InsertEntity, Entity } from '../../db/schema';
import { eq } from 'drizzle-orm';

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

  async findAll(namespace?: string): Promise<Entity[]> {
    if (namespace) {
      return await this.drizzle.db
        .select()
        .from(entity)
        .where(eq(entity.namespace, namespace));
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
