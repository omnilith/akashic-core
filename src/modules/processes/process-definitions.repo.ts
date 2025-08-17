// src/modules/processes/process-definitions.repo.ts
import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../../db/drizzle.service';
import {
  processDefinition,
  InsertProcessDefinition,
  ProcessDefinition,
} from '../../db/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class ProcessDefinitionsRepo {
  constructor(private drizzle: DrizzleService) {}

  async create(data: InsertProcessDefinition): Promise<ProcessDefinition> {
    const [newProcessDef] = await this.drizzle.db
      .insert(processDefinition)
      .values(data)
      .returning();

    return newProcessDef;
  }

  async findAll(namespace?: string): Promise<ProcessDefinition[]> {
    if (namespace) {
      return await this.drizzle.db
        .select()
        .from(processDefinition)
        .where(eq(processDefinition.namespace, namespace));
    }

    return await this.drizzle.db.select().from(processDefinition);
  }

  async findById(id: string): Promise<ProcessDefinition | null> {
    const [found] = await this.drizzle.db
      .select()
      .from(processDefinition)
      .where(eq(processDefinition.id, id));

    return found || null;
  }

  async findByName(
    namespace: string,
    name: string,
  ): Promise<ProcessDefinition | null> {
    const [found] = await this.drizzle.db
      .select()
      .from(processDefinition)
      .where(
        and(
          eq(processDefinition.namespace, namespace),
          eq(processDefinition.name, name),
        ),
      );

    return found || null;
  }
}
