# Akashic Core - AI Assistant Guide

## Project Overview

Akashic Core is an **ontology-first backend platform** for digital twins and graph-based data modeling. It provides a flexible, schema-driven approach to managing entities and their relationships, with all system configuration stored as entities within the system itself (dogfooding).

### Core Philosophy

- **Everything is an entity** - Even system configuration like health checks
- **Schema-first** - All entities have JSON Schema definitions
- **Graph-based** - Entities connected through typed relations
- **Namespace isolation** - Multi-tenant support via namespaces
- **Self-describing** - The system uses itself to define itself

## Key Concepts

### Entities & Types

- **EntityTypes**: JSON Schema definitions that describe entity structure
- **Entities**: Instances of EntityTypes containing actual data
- **Relations**: Typed connections between entities
- **RelationTypes**: Define allowed connections between EntityTypes (with cardinality)
- **Namespaces**: Logical isolation of data (e.g., `global`, `work.acme`, `test`)

### Process System (In Development)

- **ProcessDefinitions**: Workflow templates with steps
- **ProcessInstances**: Running instances of processes with state tracking
- **Events**: System events that can trigger processes

## Essential Commands

### Development

```bash
npm run dev          # Start development server
npm run build        # Build the project
npm test            # Run tests
npm run typecheck   # Run TypeScript type checking
npm run lint        # Run ESLint
```

### CLI Tools (Akashic Smart CLI)

```bash
npm run akashic -- <command>           # Run any CLI command

# Core commands
npm run akashic list-types             # List all entity types
npm run akashic show-type <id>         # Show detailed type structure
npm run akashic create <type>          # Create new entity
npm run akashic update <id>            # Update existing entity
npm run akashic delete <id>            # Delete entity
npm run akashic relate                 # Create relation between entities

# Health & Monitoring
npm run akashic health                 # Run all health checks
npm run akashic health --category schema  # Run specific category
npm run akashic health --export report.json  # Export results

# Data Management
npm run akashic import <file>          # Import entities from JSON
npm run akashic export                 # Export all data
```

## Common Tasks

### Creating an Entity Type

```graphql
mutation CreateEntityType($input: CreateEntityTypeInput!) {
  createEntityType(input: $input) {
    id
    name
  }
}
```

### Finding Entities

```bash
# Via CLI
npm run akashic list --type Person --namespace global

# Via GraphQL
query {
  entities(filter: { entityTypeId: "person-type-id" }) {
    id
    data
  }
}
```

### Running Health Checks

```bash
# Run all checks
npm run akashic health

# Run specific severity
npm run akashic health --severity critical

# Export results
npm run akashic health --export health-report.json
```

## Architecture

### Tech Stack

- **Backend**: NestJS with GraphQL (Apollo)
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: AJV for JSON Schema validation
- **CLI**: Custom TypeScript CLI with Inquirer.js
- **Testing**: Jest
- **Language**: TypeScript

### Project Structure

```
/src
  /modules          # Core backend modules
    /entities       # Entity management
    /entity-types   # Entity type definitions
    /relations      # Relation management
    /relation-types # Relation type definitions
    /processes      # Process system
    /events         # Event system
  /database         # Database schema and migrations
  /lib              # Shared utilities

/cli
  akashic-smart.ts  # Main CLI entry point
  schema-helper.ts  # GraphQL client utilities
  health-checker.ts # Health check engine

/data
  *.json           # Sample data and entity definitions
  health-checks.json # Health check definitions (as entities!)

/scripts
  *.sh             # Utility scripts for testing
```

## Recent Features

### Show-Type Command (August 2025)

Displays complete entity type structure including:

- Schema with field details and constraints
- Usage statistics
- Related relation types
- Required fields and validation rules

### Health Check System (August 2025)

Comprehensive data integrity checking:

- 20+ different check types
- Severity levels (critical, warning, info)
- Checks defined as entities (dogfooding)
- Export capabilities for CI/CD integration
- Auto-fix capabilities for safe operations

## Known Issues & Limitations

### Current Limitations

1. Process system exists but isn't fully integrated
2. Some health checks not yet implemented (circular dependencies, oversized fields)
3. No built-in scheduling for automated health checks
4. Entity deletion doesn't cascade to relations (by design, but needs handling)

### Planned Improvements

1. Convert health checks to use Process system
2. Add WebSocket support for real-time updates
3. Implement event sourcing for audit trails
4. Add GraphQL subscriptions
5. Create web UI for management

## Testing Strategy

### Before Committing

Always run these commands to ensure code quality:

```bash
npm run typecheck   # Check TypeScript types
npm run lint        # Check code style
npm test           # Run unit tests
npm run akashic health  # Verify data integrity
```

### Test Data Setup

```bash
# Import sample data
npm run akashic import data/sample-entities.json

# Create test namespace
npm run akashic create entity-type
# Choose namespace: "test"
```

## Debugging Tips

1. **GraphQL Queries**: Use `cli/schema-helper.ts:graphqlRequest()` for testing queries
2. **Type Issues**: Check `entityType.schemaJson` for schema structure
3. **Relation Issues**: Verify both EntityTypes exist and RelationType allows connection
4. **Health Check Issues**: Check `data/health-checks.json` for check definitions

## Important Notes

- **Always preserve namespaces** - Don't mix data across namespace boundaries
- **Schema versions matter** - Entities track which version they were created with
- **Everything is JSON** - All entity data is stored as JSON in PostgreSQL
- **Use the CLI** - The smart CLI handles complex operations safely
- **Dogfood when possible** - Define new features as entities when it makes sense

## Contributing Guidelines

1. Follow existing patterns in the codebase
2. Add TypeScript types for all new code
3. Update this file when adding major features
4. Write tests for new functionality
5. Use meaningful commit messages
6. Run health checks after data model changes

## Questions?

The codebase is designed to be self-documenting through its ontology. When in doubt:

- Check existing EntityTypes for patterns
- Look at health check definitions for validation rules
- Use `show-type` command to understand data structures
- Run health checks to verify data integrity
