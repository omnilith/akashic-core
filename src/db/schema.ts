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

export const eventLog = pgTable('event_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: text('event_type').notNull(), // 'entity.created', 'relation.deleted', etc.
  resourceType: text('resource_type').notNull(), // 'entity', 'relation', 'entity_type'
  resourceId: uuid('resource_id').notNull(),
  namespace: text('namespace').notNull(),
  payload: jsonb('payload').notNull(), // The actual event data
  metadata: jsonb('metadata'), // Request ID, user info, etc.
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const outbox = pgTable('outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventLogId: uuid('event_log_id')
    .notNull()
    .references(() => eventLog.id),
  destination: text('destination').notNull(), // 'websocket', 'webhook', 'notification'
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('pending'), // 'pending', 'sent', 'failed'
  attempts: integer('attempts').notNull().default(0),
  nextRetryAt: timestamp('next_retry_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// src/db/schema.ts (add these to your existing file)

export const processDefinition = pgTable('process_definition', {
  id: uuid('id').primaryKey().defaultRandom(),
  namespace: text('namespace').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  version: integer('version').notNull().default(1),
  steps: jsonb('steps').notNull(), // Array of step definitions
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: text('created_by'), // For future user system
});

export const processInstance = pgTable('process_instance', {
  id: uuid('id').primaryKey().defaultRandom(),
  processDefId: uuid('process_def_id')
    .notNull()
    .references(() => processDefinition.id),
  namespace: text('namespace').notNull(),

  status: text('status').notNull().default('running'),
  currentStep: text('current_step'),
  currentStepIndex: integer('current_step_index').notNull().default(0),

  context: jsonb('context').notNull().default('{}'),

  completedSteps: jsonb('completed_steps').notNull().default('[]'),

  assignees: jsonb('assignees').notNull().default('[]'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Add the inferred types
export type ProcessDefinition = typeof processDefinition.$inferSelect;
export type InsertProcessDefinition = typeof processDefinition.$inferInsert;
export type ProcessInstance = typeof processInstance.$inferSelect;
export type InsertProcessInstance = typeof processInstance.$inferInsert;

export type EventLog = typeof eventLog.$inferSelect;
export type InsertEventLog = typeof eventLog.$inferInsert;
export type Outbox = typeof outbox.$inferSelect;
export type InsertOutbox = typeof outbox.$inferInsert;

export type RelationType = typeof relationType.$inferSelect;
export type InsertRelationType = typeof relationType.$inferInsert;
export type Relation = typeof relation.$inferSelect;
export type InsertRelation = typeof relation.$inferInsert;

export type EntityType = typeof entityType.$inferSelect;
export type InsertEntityType = typeof entityType.$inferInsert;
export type Entity = typeof entity.$inferSelect;
export type InsertEntity = typeof entity.$inferInsert;
