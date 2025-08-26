# Akashic Core

**Ontology engine powering The Omnilith creative network**

Akashic Core is an ontology-first backend platform where every participant gets a sovereign namespace to model their creative practice. These personal digital twins can connect through Relations to collaborate while maintaining individual sovereignty.

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
npm run dev
```

Navigate to `http://localhost:3000/graphql` to access the GraphQL Playground.

## CLI Tools

The Akashic Smart CLI provides powerful commands for managing your ontology:

```bash
# Core commands
npm run akashic list-types             # List all entity types
npm run akashic show-type <id>         # Show detailed type structure
npm run akashic create <type>          # Create new entity
npm run akashic update <id>            # Update existing entity
npm run akashic delete <id>            # Delete entity
npm run akashic relate                 # Create relation between entities

# Health & Monitoring  
npm run akashic health                 # Run all health checks
npm run akashic health --severity critical  # Run specific severity

# Data Management
npm run akashic import <file>          # Import entities from JSON
npm run akashic export                 # Export all data
```

## Core Concepts

### Namespaces as Nodes

Every namespace is a sovereign node in the network graph:
- `person.alice` - Personal digital twins
- `band.coolgroup` - Collective creative spaces
- `venue.bluenote` - Physical/institutional nodes
- `global` - Shared standards and commons

### Entity System

Everything is an entity with typed relationships:

```graphql
# Define an EntityType
mutation {
  createEntityType(input: {
    namespace: "person.alice"
    name: "Song"
    schemaJson: { /* JSON Schema */ }
  }) {
    id
    name
  }
}

# Create an Entity
mutation {
  createEntity(input: {
    namespace: "person.alice"
    entityTypeId: "song-type-id"
    data: { title: "New Track", bpm: 120 }
  }) {
    id
  }
}
```

### Relations

Connect namespaces while maintaining boundaries:

```graphql
mutation {
  createRelation(input: {
    relationTypeId: "collaborated-on"
    fromEntityId: "alice-id"
    toEntityId: "song-id"
    data: { role: "producer", split: 0.5 }
  }) {
    id
  }
}
```

## Project Structure

```
src/
├── modules/          # Core backend modules
│   ├── entities/     # Entity management
│   ├── entity-types/ # Entity type definitions
│   ├── relations/    # Relation management
│   ├── processes/    # Process system (workflows)
│   └── events/       # Event sourcing
├── database/         # Database schema and migrations
└── lib/             # Shared utilities

cli/
├── akashic-smart.ts  # Main CLI entry point
├── schema-helper.ts  # GraphQL client utilities
└── health-checker.ts # Health check engine
```

## Development

### Testing

```bash
npm test                # Run tests
npm run typecheck       # TypeScript checking
npm run lint           # ESLint
npm run akashic health  # Data integrity checks
```

### Database

```bash
npm run db:generate    # Generate migrations
npm run db:migrate     # Apply migrations
npm run db:studio      # Open Drizzle Studio
```

## Documentation

- **[VISION.md](./VISION.md)** - The Omnilith vision and philosophy
- **[CLAUDE.md](./CLAUDE.md)** - Deep technical documentation and AI context
- **[Contributing Guidelines](./CONTRIBUTING.md)** - How to contribute

## The Omnilith

This infrastructure powers [The Omnilith](https://omnilith.xyz) - a creative network where:
- Individuals maintain sovereign digital twins of their creative practice
- Contribution is transparent and permanently attributed  
- Value flows automatically based on documented work
- Digital coordination enables physical creative communities

Learn more about the vision in [VISION.md](./VISION.md).

## License

MIT

---

*Building infrastructure for creative sovereignty*