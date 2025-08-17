# Akashic Core

**A federated creative engine where personal and organizational digital twins share the same ontology, processes are cultural rituals, and the public history of creation is part of the art.**

## Overview

Akashic Core is an ontology-first backend platform for building personal twins that can grow into networks of collaborating nodes. Unlike traditional productivity or digital twin systems, Akashic Core treats data structure as a first-class creative medium.

### Key Principles

- **Ontology-first**: Entity types and relationships are defined as data (JSON Schema), not code
- **Event-sourced**: Complete append-only history of every change
- **Process-aware**: Workflows are semantic checklists with guards and actions
- **Federation-ready**: Personal and organizational twins can link and share while maintaining autonomy
- **Namespace-isolated**: Global, organizational, and personal data coexist safely

## Architecture

### Core Modules

- **EntityTypes** - Define data schemas as JSON Schema documents
- **Entities** - Create and validate instances against type definitions
- **RelationTypes** - Define typed relationships between entity types
- **Relations** - Create actual links between entity instances
- **Processes** - Execute step-by-step workflows with state tracking
- **Events** - Append-only log of all system changes
- **Views** - Optimized read models (planned)

### Technology Stack

- **Backend**: NestJS with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **API**: GraphQL with automatic schema generation
- **Validation**: AJV for JSON Schema validation
- **Events**: Custom event sourcing implementation

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm or yarn

### Installation

```bash
git clone https://github.com/yourusername/akashic-core
cd akashic-core
npm install
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Configure your database
DATABASE_URL="postgresql://localhost:5432/akashic"
```

### Database Setup

```bash
# Generate and run migrations
npm run db:generate
npm run db:migrate
```

### Start Development Server

```bash
npm run start:dev
```

Navigate to `http://localhost:3000/graphql` to access the GraphQL Playground.

## Core Concepts

### Namespaces

Data is organized into namespaces for multi-tenancy:

- `global` - Shared entity types and processes
- `personal.username` - Individual user spaces
- `org.company` - Organizational workspaces
- `team.department` - Team-specific areas

### Entity-Centric Design

Everything is an entity with typed relationships:

```graphql
# Define a Project type
createEntityType(input: {
  namespace: "personal.you"
  name: "Project"
  schema: "{\"type\": \"object\", \"properties\": {...}}"
})

# Create an actual project
createEntity(input: {
  namespace: "personal.you"
  entityTypeId: "project-type-id"
  data: "{\"title\": \"Build Personal Twin\", \"status\": \"active\"}"
})
```

### Semantic Processes

Workflows are data-driven and reusable:

```graphql
# Define a weekly review process
createProcessDefinition(input: {
  namespace: "personal.you"
  name: "WeeklyReview"
  steps: "[{\"id\": \"inbox_zero\", \"label\": \"Clear Inbox\"}, ...]"
})

# Execute the process
startProcess(input: {
  processDefId: "weekly-review-id"
  namespace: "personal.you"
})
```

## API Examples

### Creating Entity Types

```graphql
mutation {
  createEntityType(
    input: {
      namespace: "global"
      name: "Person"
      schema: "{\"type\": \"object\", \"properties\": {\"name\": {\"type\": \"string\"}, \"email\": {\"type\": \"string\", \"format\": \"email\"}}, \"required\": [\"name\"]}"
    }
  ) {
    id
    name
    version
  }
}
```

### Linking Entities

```graphql
mutation {
  createRelationType(
    input: {
      namespace: "personal.you"
      name: "has_next_action"
      fromEntityTypeId: "project-type-id"
      toEntityTypeId: "task-type-id"
      cardinality: "1..n"
    }
  ) {
    id
  }
}

mutation {
  createRelation(
    input: {
      namespace: "personal.you"
      relationTypeId: "has-next-action-id"
      fromEntityId: "my-project-id"
      toEntityId: "my-task-id"
    }
  ) {
    id
  }
}
```

### Process Execution

```graphql
# Start a process
mutation {
  startProcess(
    input: { namespace: "personal.you", processDefId: "daily-review-id" }
  ) {
    id
    status
    currentStep
  }
}

# Advance through steps
mutation {
  advanceProcess(
    input: {
      instanceId: "process-instance-id"
      stepInput: "{\"notes\": \"Completed inbox review\"}"
    }
  ) {
    status
    currentStep
  }
}
```

### Event History

```graphql
query {
  events(namespace: "personal.you", limit: 10) {
    eventType
    resourceType
    payload
    timestamp
  }
}
```

## Development

### Database Migrations

```bash
# Create new migration after schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Open database GUI
npm run db:studio
```

### Project Structure

```
src/
├── db/
│   ├── schema.ts              # Drizzle table definitions
│   └── migrations/            # Database migrations
├── lib/
│   ├── validation.service.ts  # AJV JSON Schema validation
│   └── json.scalar.ts         # GraphQL JSON scalar
├── modules/
│   ├── entity-types/          # Entity type management
│   ├── entities/              # Entity CRUD operations
│   ├── relation-types/        # Relationship type definitions
│   ├── relations/             # Relationship management
│   ├── processes/             # Workflow engine
│   └── events/                # Event sourcing
└── main.ts                    # Application entry point
```

## Roadmap

### Immediate (MVP Complete ✅)

- [x] Core entity and relationship system
- [x] Process definitions and execution
- [x] Event sourcing foundation
- [x] Multi-namespace support

### Next Phase

- [ ] Guards and actions with CEL expressions
- [ ] Read models and optimized views
- [ ] Real-time subscriptions via WebSocket
- [ ] Authentication and authorization

### Future

- [ ] Federation between instances
- [ ] Visual process designer
- [ ] Advanced querying and graph traversal
- [ ] Public chronicle and aesthetic views

## Philosophy

Akashic Core embraces the idea that **how we structure information is itself a creative act**. By making ontology a first-class citizen, it enables:

- **Personal knowledge graphs** that evolve with your thinking
- **Organizational memory** that preserves context and decisions
- **Creative workflows** that bridge personal and collective intelligence
- **Living documentation** where the structure is part of the art

The system doesn't impose rigid categories but provides tools for creating your own meaningful structures that can grow and federate with others.

## Contributing

This is currently a personal research project. As it matures, contribution guidelines will be established.

---

_"The Akashic Records are a compendium of all universal events, thoughts, words, emotions and intent ever to have occurred in the past, present, or future." - This system aims to be your personal Akashic record._
