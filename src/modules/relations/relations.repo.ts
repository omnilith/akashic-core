// src/modules/relations/relations.repo.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService, DrizzleTransaction } from '../../db/drizzle.service';
import { relation, InsertRelation, Relation } from '../../db/schema';
import { eq, and, SQL } from 'drizzle-orm';

@Injectable()
export class RelationsRepo {
  constructor(private drizzle: DrizzleService) {}

  private getDb(tx?: DrizzleTransaction) {
    return (tx ?? this.drizzle.db) as typeof this.drizzle.db;
  }

  async create(
    data: InsertRelation,
    tx?: DrizzleTransaction,
  ): Promise<Relation> {
    const db = this.getDb(tx);
    const [newRelation] = await db.insert(relation).values(data).returning();
    return newRelation;
  }

  async findAll(filters?: {
    namespace?: string;
    relationTypeId?: string;
    fromEntityId?: string;
    toEntityId?: string;
  }): Promise<Relation[]> {
    const conditions: SQL[] = [];

    if (filters?.namespace) {
      conditions.push(eq(relation.namespace, filters.namespace));
    }
    if (filters?.relationTypeId) {
      conditions.push(eq(relation.relationTypeId, filters.relationTypeId));
    }
    if (filters?.fromEntityId) {
      conditions.push(eq(relation.fromEntityId, filters.fromEntityId));
    }
    if (filters?.toEntityId) {
      conditions.push(eq(relation.toEntityId, filters.toEntityId));
    }

    if (conditions.length > 0) {
      return await this.drizzle.db
        .select()
        .from(relation)
        .where(and(...conditions));
    }

    return await this.drizzle.db.select().from(relation);
  }

  async findById(id: string): Promise<Relation | null> {
    const [found] = await this.drizzle.db
      .select()
      .from(relation)
      .where(eq(relation.id, id));

    return found || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(relation)
      .where(eq(relation.id, id))
      .returning();

    return result.length > 0;
  }
}
