import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import {
  entityType,
  InsertEntityType,
  EntityType,
  entity,
} from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class EntityTypesRepo {
  constructor(private drizzle: DrizzleService) {}

  async create(data: InsertEntityType): Promise<EntityType> {
    const [newEntityType] = await this.drizzle.db
      .insert(entityType)
      .values(data)
      .returning();

    return newEntityType;
  }

  async findAll(namespace?: string): Promise<EntityType[]> {
    if (namespace) {
      return await this.drizzle.db
        .select()
        .from(entityType)
        .where(eq(entityType.namespace, namespace));
    }

    return await this.drizzle.db.select().from(entityType);
  }

  async findById(id: string): Promise<EntityType | null> {
    const [found] = await this.drizzle.db
      .select()
      .from(entityType)
      .where(eq(entityType.id, id));

    return found || null;
  }

  async findByNameAndNamespace(
    name: string,
    namespace: string,
  ): Promise<EntityType | null> {
    const [found] = await this.drizzle.db
      .select()
      .from(entityType)
      .where(
        sql`${entityType.name} = ${name} AND ${entityType.namespace} = ${namespace}`,
      );

    return found || null;
  }

  async update(
    id: string,
    updates: Partial<InsertEntityType>,
  ): Promise<EntityType | null> {
    const updateData: Partial<{
      name: string;
      schemaJson: unknown;
      version: ReturnType<typeof sql>;
    }> = {};

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.schemaJson !== undefined) {
      updateData.schemaJson = updates.schemaJson;
      updateData.version = sql`${entityType.version} + 1`;
    }

    const [updated] = await this.drizzle.db
      .update(entityType)
      .set(updateData)
      .where(eq(entityType.id, id))
      .returning();

    return updated || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(entityType)
      .where(eq(entityType.id, id))
      .returning();

    return result.length > 0;
  }

  async hasEntities(entityTypeId: string): Promise<boolean> {
    const [result] = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(entity)
      .where(eq(entity.entityTypeId, entityTypeId));

    return result.count > 0;
  }
}
