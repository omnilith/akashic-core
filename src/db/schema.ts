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

export const relationType = pgTable('relation_type', {
  id: uuid('id').primaryKey().defaultRandom(),
  namespace: text('namespace').notNull(),
  name: text('name').notNull(),
  fromEntityTypeId: uuid('from_entity_type_id')
    .notNull()
    .references(() => entityType.id),
  toEntityTypeId: uuid('to_entity_type_id')
    .notNull()
    .references(() => entityType.id),
  cardinality: text('cardinality').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
});

export const relation = pgTable('relation', {
  id: uuid('id').primaryKey().defaultRandom(),
  namespace: text('namespace').notNull(),
  relationTypeId: uuid('relation_type_id')
    .notNull()
    .references(() => relationType.id),
  fromEntityId: uuid('from_entity_id')
    .notNull()
    .references(() => entity.id),
  toEntityId: uuid('to_entity_id')
    .notNull()
    .references(() => entity.id),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export type RelationType = typeof relationType.$inferSelect;
export type InsertRelationType = typeof relationType.$inferInsert;
export type Relation = typeof relation.$inferSelect;
export type InsertRelation = typeof relation.$inferInsert;

export type EntityType = typeof entityType.$inferSelect;
export type InsertEntityType = typeof entityType.$inferInsert;
export type Entity = typeof entity.$inferSelect;
export type InsertEntity = typeof entity.$inferInsert;
