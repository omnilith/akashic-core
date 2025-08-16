import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

export const entityType = pgTable('entity_type', {
  id: uuid('id').primaryKey().defaultRandom(),
  namespace: text('namespace').notNull(),
  name: text('name').notNull(),
  version: integer('version').notNull().default(1),
  schemaJson: jsonb('schema_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const entity = pgTable('entity', {
  id: uuid('id').primaryKey().defaultRandom(),
  namespace: text('namespace').notNull(),
  entityTypeId: uuid('entity_type_id').references(() => entityType.id),
  entityTypeVersion: integer('entity_type_version').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type EntityType = typeof entityType.$inferSelect;
export type InsertEntityType = typeof entityType.$inferInsert;
export type Entity = typeof entity.$inferSelect;
export type InsertEntity = typeof entity.$inferInsert;
