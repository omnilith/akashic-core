// src/modules/relation-types/relation-types.repo.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import {
  relationType,
  InsertRelationType,
  RelationType,
} from '../../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class RelationTypesRepo {
  constructor(private drizzle: DrizzleService) {}

  async create(data: InsertRelationType): Promise<RelationType> {
    const [newRelationType] = await this.drizzle.db
      .insert(relationType)
      .values(data)
      .returning();

    return newRelationType;
  }

  async findAll(namespace?: string): Promise<RelationType[]> {
    if (namespace) {
      return await this.drizzle.db
        .select()
        .from(relationType)
        .where(eq(relationType.namespace, namespace));
    }

    return await this.drizzle.db.select().from(relationType);
  }

  async findById(id: string): Promise<RelationType | null> {
    const [found] = await this.drizzle.db
      .select()
      .from(relationType)
      .where(eq(relationType.id, id));

    return found || null;
  }
}
