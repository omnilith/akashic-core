// src/modules/relation-types/relation-types.repo.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import {
  relationType,
  InsertRelationType,
  RelationType,
  relation,
} from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

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

  async findAll(
    namespace?: string,
    limit?: number,
    offset?: number,
  ): Promise<RelationType[]> {
    let query = this.drizzle.db.select().from(relationType);

    if (namespace) {
      query = query.where(
        eq(relationType.namespace, namespace),
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

  async countAll(namespace?: string): Promise<number> {
    let query = this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(relationType);

    if (namespace) {
      query = query.where(
        eq(relationType.namespace, namespace),
      ) as typeof query;
    }

    const [result] = await query;
    return result?.count ?? 0;
  }

  async findById(id: string): Promise<RelationType | null> {
    const [found] = await this.drizzle.db
      .select()
      .from(relationType)
      .where(eq(relationType.id, id));

    return found || null;
  }

  async findByNameAndNamespace(
    name: string,
    namespace: string,
  ): Promise<RelationType | null> {
    const [found] = await this.drizzle.db
      .select()
      .from(relationType)
      .where(
        sql`${relationType.name} = ${name} AND ${relationType.namespace} = ${namespace}`,
      );

    return found || null;
  }

  async update(
    id: string,
    updates: Partial<InsertRelationType>,
  ): Promise<RelationType | null> {
    const updateData: Partial<{
      name: string;
      cardinality: string;
    }> = {};

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.cardinality !== undefined) {
      updateData.cardinality = updates.cardinality;
    }

    const [updated] = await this.drizzle.db
      .update(relationType)
      .set(updateData)
      .where(eq(relationType.id, id))
      .returning();

    return updated || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.drizzle.db
      .delete(relationType)
      .where(eq(relationType.id, id))
      .returning();

    return result.length > 0;
  }

  async hasRelations(relationTypeId: string): Promise<boolean> {
    const [result] = await this.drizzle.db
      .select({ count: sql<number>`count(*)` })
      .from(relation)
      .where(eq(relation.relationTypeId, relationTypeId));

    return result.count > 0;
  }
}
