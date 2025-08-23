import { Injectable } from '@nestjs/common';
import { DrizzleService, DrizzleTransaction } from '../../db/drizzle.service';
import { eventLog, InsertEventLog, EventLog } from '../../db/schema';
import { eq, and, desc, gte, SQL } from 'drizzle-orm';

@Injectable()
export class EventsRepo {
  constructor(private drizzle: DrizzleService) {}

  private getDb(tx?: DrizzleTransaction) {
    return (tx ?? this.drizzle.db) as typeof this.drizzle.db;
  }

  async create(
    data: InsertEventLog,
    tx?: DrizzleTransaction,
  ): Promise<EventLog> {
    const db = this.getDb(tx);
    const [newEvent] = await db.insert(eventLog).values(data).returning();
    return newEvent;
  }

  async findEvents(options?: {
    namespace?: string;
    resourceType?: string;
    resourceId?: string;
    eventType?: string;
    since?: Date;
    limit?: number;
  }): Promise<EventLog[]> {
    const conditions: SQL[] = [];

    if (options?.namespace) {
      conditions.push(eq(eventLog.namespace, options.namespace));
    }

    if (options?.resourceType) {
      conditions.push(eq(eventLog.resourceType, options.resourceType));
    }

    if (options?.resourceId) {
      conditions.push(eq(eventLog.resourceId, options.resourceId));
    }

    if (options?.eventType) {
      conditions.push(eq(eventLog.eventType, options.eventType));
    }

    if (options?.since) {
      conditions.push(gte(eventLog.timestamp, options.since));
    }

    let query = this.drizzle.db.select().from(eventLog).$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(desc(eventLog.timestamp));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  }

  async findByResource(
    resourceType: string,
    resourceId: string,
  ): Promise<EventLog[]> {
    return await this.drizzle.db
      .select()
      .from(eventLog)
      .where(
        and(
          eq(eventLog.resourceType, resourceType),
          eq(eventLog.resourceId, resourceId),
        ),
      )
      .orderBy(desc(eventLog.timestamp));
  }
}
