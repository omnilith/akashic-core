import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import {
  processInstance,
  InsertProcessInstance,
  ProcessInstance,
} from '../../db/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class ProcessInstancesRepo {
  constructor(private drizzle: DrizzleService) {}

  async create(data: InsertProcessInstance): Promise<ProcessInstance> {
    const [newInstance] = await this.drizzle.db
      .insert(processInstance)
      .values(data)
      .returning();

    return newInstance;
  }

  async findAll(namespace?: string): Promise<ProcessInstance[]> {
    if (namespace) {
      return await this.drizzle.db
        .select()
        .from(processInstance)
        .where(eq(processInstance.namespace, namespace));
    }

    return await this.drizzle.db.select().from(processInstance);
  }

  async findById(id: string): Promise<ProcessInstance | null> {
    const [found] = await this.drizzle.db
      .select()
      .from(processInstance)
      .where(eq(processInstance.id, id));

    return found || null;
  }

  async findByStatus(
    namespace: string,
    status: string,
  ): Promise<ProcessInstance[]> {
    return await this.drizzle.db
      .select()
      .from(processInstance)
      .where(
        and(
          eq(processInstance.namespace, namespace),
          eq(processInstance.status, status),
        ),
      );
  }

  async update(
    id: string,
    updates: Partial<ProcessInstance>,
  ): Promise<ProcessInstance> {
    const [updated] = await this.drizzle.db
      .update(processInstance)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(processInstance.id, id))
      .returning();

    return updated;
  }
}
