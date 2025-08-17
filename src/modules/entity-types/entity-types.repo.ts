import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import { entityType, InsertEntityType, EntityType } from '../../db/schema';
import { eq } from 'drizzle-orm';

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
}
