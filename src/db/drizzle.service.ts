import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  drizzle,
  NodePgDatabase,
  NodePgTransaction,
} from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

import { ExtractTablesWithRelations } from 'drizzle-orm';

export type DrizzleTransaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

@Injectable()
export class DrizzleService implements OnModuleDestroy {
  public readonly db: NodePgDatabase<typeof schema>;
  private readonly pool: Pool;

  constructor() {
    // Create the PostgreSQL connection pool
    this.pool = new Pool({
      connectionString:
        process.env.DATABASE_URL || 'postgresql://localhost:5432/akashic',
    });

    // Create the Drizzle instance with the pool
    this.db = drizzle(this.pool, { schema });
  }

  // Clean up connections when the app shuts down
  async onModuleDestroy() {
    await this.pool.end();
  }

  // Execute operations in a transaction
  async transaction<T>(
    callback: (tx: DrizzleTransaction) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(callback);
  }
}
