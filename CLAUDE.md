# Akashic Core - AI Assistant Guide

## The Omnilith: A Creative Network for Collective Production

**Akashic Core** is the ontology engine powering **The Omnilith**—a creative network for sovereign collaboration and collective production. The infrastructure enables any aesthetic vision while maintaining transparency, attribution, and fair value distribution.

**Purpose**: To build infrastructure for collective meaning-making, where people produce beautiful cultural artifacts together while maintaining individual sovereignty and fair value distribution.

### The Vision: Infrastructure for Creative Sovereignty

**The Omnilith begins with a simple premise**: Creative communities need infrastructure that enables both individual sovereignty and collective production. A system where contribution is transparent, value flows fairly, and anyone can build their own aesthetic universe.

The namespace system provides this foundation. Every participant gets their own sovereign node where they can define their own creative reality—their own schemas, processes, and aesthetic language. These individual universes can then connect and collaborate through Relations, creating collective works while maintaining individual attribution.

**Core Principles:**

- **Production over abstraction**: We make things—music, merchandise, events. Capital flows from real artifacts, not promises.
- **Sovereignty through structure**: Your namespace is your digital universe. Define your own reality, then bridge to others.
- **Aesthetic pluralism**: The infrastructure supports any creative vision. Each namespace can embody its own aesthetic language.
- **Recursive expansion**: Start with music, expand to all creative production. Each layer builds from the last.

### Core Technical Philosophy

- **Network of namespaces** - Every participant (person, org, process) is a namespace node in the graph
- **Everything is an entity** - Works, rights, contributions, even system configuration
- **Schema-first** - Schema definitions create shared language and meaning
- **Graph-based** - Relations are edges connecting namespace nodes
- **Namespace sovereignty** - Each node has complete control over its space
- **Self-describing** - The system uses itself to define itself

## Key Concepts: Technical → Cultural Mapping

### The Network: Namespaces as Nodes

**Every namespace is a node in the network graph.** When you join The Omnilith, you simply claim a namespace—this becomes your permanent address, your birth certificate on the network. No gatekeepers, no approval needed. Just pick your namespace and start creating.

- **Personal namespaces** (e.g., `person.alice`): Individual nodes—your sovereign identity on the network. Anyone can create one.
- **Community namespaces** (e.g., `scene.jazz`): Collective nodes where groups coordinate. Joining these requires mutual consent via Relations.
- **Institutional namespaces** (e.g., `grant.arts`): Process nodes that run programs like grants or councils. These have their own governance rules.
- **Global namespace**: The commons—shared standards and public goods accessible to all.

Every participant—whether individual, band, label, or grant program—is just a namespace node with:

- Sovereign control over their space
- Relations connecting to other nodes
- Entities they create and manage
- Processes they run

### Your Personal Digital Universe

**Your namespace is your digital twin—a sovereign model of your actual creative life.** This isn't abstract data management; it's creating a living, evolving representation of your real work, relationships, and creative journey.

**Modeling Your Real Creative Life:**

- **Your practice**: Track actual sessions, hours spent, techniques learned
- **Your works**: Every song, sketch, performance—with full history and evolution
- **Your collaborations**: Real relationships with real people, not just data links
- **Your economics**: Actual income, expenses, royalties from your creative work
- **Your growth**: Skills developed, milestones reached, breakthroughs documented

Think of it as your creative autobiography that writes itself as you work. Every real-world creative act gets captured in your namespace, building a complete picture of your artistic life that you fully control.

**The Infrastructure Layer:**
Akashic Core provides neutral tools that enable coordination:

- **Schemas** give structure to your ideas (you define what that structure is)
- **Relations** formalize collaborations (maintaining clear attribution)
- **Validations** ensure data coherence (not aesthetic conformity)
- **Namespaces** maintain sovereignty (your space, your rules)

**Aesthetic Freedom:**
The infrastructure doesn't dictate aesthetic outcomes. The founding aesthetic of The Omnilith—that "emotional distortion" of human expression through algorithmic mediation—is one vision among many possible. As the network grows, new aesthetic languages will emerge, each sovereign namespace potentially embodying a completely different creative philosophy.

**Joining The Omnilith:**

- **Open registration**: Anyone can claim a personal namespace and start creating immediately
- **Your space, your rules**: Define your own EntityTypes, schemas, and creative process
- **Connect when ready**: Form Relations with other namespaces when you find resonance
- **Contribute to collectives**: Join bands, scenes, or projects through mutual consent
- **Build your aesthetic**: Whatever vision drives you, the infrastructure supports it
- **Earn transparently**: Revenue flows based on documented contributions

The barrier to entry is zero. Claim your namespace and start building your digital twin. The infrastructure is the canvas, not the painting. What you create on it is entirely your own.

### Entities & Types

- **EntityTypes**: JSON Schema definitions that describe entity structure (the shared language)
- **Entities**: Instances representing people, works, contributions, rights (the commons with receipts)
- **Relations**: Edges in the network graph—connections between namespace nodes
- **RelationTypes**: Define allowed connections with cardinality (the rules of engagement)

### Process System (Institutions as Programs)

- **ProcessDefinitions**: Workflow templates for grants, councils, releases (inspectable institutions)
- **ProcessInstances**: Running instances with transparent state tracking (active governance)
- **Events**: System events that trigger processes (community actions)

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

### Creating an Entity Type (Modeling Your Real Life)

```graphql
# Create a custom EntityType to track your real practice sessions
mutation CreatePracticeSessionType {
  createEntityType(
    input: {
      name: "PracticeSession"
      namespace: "person.alice"
      schemaJson: {
        type: "object"
        properties: {
          date: { type: "string", format: "date" }
          duration: { type: "number" }
          instrument: { type: "string" }
          pieces: { type: "array", items: { type: "string" } }
          breakthrough: { type: "string" }
          nextSteps: { type: "string" }
        }
      }
    }
  ) {
    id
    name
  }
}
```

### Finding Entities

```bash
# Via CLI
npm run akashic list --type Person --namespace person.alice

# Via GraphQL
query {
  entities(filter: {
    entityTypeId: "person-type-id",
    namespace: "person.alice"
  }) {
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

### Query Builder & Advanced Search (August 2025)

Powerful query system for searching entities by JSON data fields:

- MongoDB-like query operators ($eq, $gte, $lt, $in, $regex, etc.)
- Search within nested JSON fields
- Pagination and sorting support
- CLI and GraphQL interfaces
- Examples:
  ```bash
  npm run akashic search status=todo
  npm run akashic search --filter '{"data": {"age": {"$gte": 18}}}'
  npm run akashic search edited=false --namespace example
  ```

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

## The Omnilith Roadmap

### Current State

The ontology engine is live. Namespaces can be created. The infrastructure for tracking creative production exists. We're ready to begin the first phase: making music through the system to prove the model.

### Active Development

1. **Music Production Pipeline**: Demos → remixes → releases workflow
2. **Contribution Tracking**: Cryptographic proof of who did what
3. **Revenue Attribution**: Transparent splits based on documented work
4. **Founding Aesthetic**: Establishing The Omnilith's initial creative vision through early works

### Near Future (3-6 months)

1. **Merchandise Production**: Physical artifacts tracked from creation to sale
2. **Community Onboarding**: First wave of artists beyond core team
3. **Payment Documentation**: Clear records of value flows (not transmission yet)
4. **Process Templates**: Reusable patterns for common creative workflows

### Medium Term (6-12 months)

1. **Live Events**: Performances as entities with participant relations
2. **Visual Media**: Expand beyond audio into video production
3. **Rights Management**: Formal encoding of ownership and licensing
4. **Network Governance**: Progressive decentralization begins

### Long Term Vision

The Omnilith becomes a self-sustaining creative network where:

- Thousands of artists produce through mediated collaboration
- Capital flows automatically based on contribution
- New forms of creative expression emerge from the medium itself
- Digital coordination enables physical communities

### The Physical Future

While The Omnilith begins as digital infrastructure, the ultimate vision includes physical manifestation:

- **Creative Spaces**: Physical venues and studios as namespace nodes in the network
- **Residencies**: Places where digital collaborators meet to create in person
- **Communities**: Co-living spaces for creators, coordinated through the ontology
- **New Institutions**: Physical galleries, labels, and workshops that operate on Omnilith principles

The digital twin isn't meant to replace physical reality—it's meant to enhance our ability to coordinate and create together in real space. The civilization graph eventually becomes actual creative civilization.

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

- **Namespace = Network identity** - Your namespace is your permanent address on the network
- **Always preserve namespaces** - Each node maintains complete sovereignty over its space
- **Personal sovereignty** - Individual namespaces are controlled solely by their owners
- **Schema versions matter** - Entities track which version they were created with (evolution history)
- **Everything is JSON** - Universal format ensures portability and forkability
- **Use the CLI** - The smart CLI handles complex operations safely
- **Dogfood when possible** - Define new features as entities (the system defines itself)
- **Exit is sacred** - Design everything to be exportable, forkable, opt-out friendly
- **Meaning first** - Clear ontology (shared language) enables everything else
- **Consent by default** - Relations between namespace nodes require mutual agreement

## Contributing Guidelines

1. Follow existing patterns in the codebase
2. Add TypeScript types for all new code
3. Update this file when adding major features
4. Write tests for new functionality
5. Use meaningful commit messages
6. Run health checks after data model changes
7. Consider the cultural implications of technical decisions
8. Design for forkability and community autonomy

## The Promise

We're building sovereign infrastructure for creative production. A system where individuals maintain complete control over their creative universe while still being able to collaborate at scale.

The Omnilith provides:

- **Creative sovereignty**: Your namespace, your rules, your aesthetic
- **Transparent attribution**: Every contribution tracked and valued
- **Fair value flow**: Capital returns to creators based on actual work
- **Aesthetic freedom**: The infrastructure enables any creative vision
- **Collective power**: Individual nodes combining into something greater

This codebase is the foundation—neutral infrastructure that enables a thousand different aesthetic visions to bloom. The founding aesthetic is just the first seed. What grows from here depends on who joins and what they choose to create.

## Questions?

The codebase is designed to be self-documenting through its ontology. When in doubt:

- Check existing EntityTypes for patterns (the shared language)
- Look at health check definitions for validation rules (the invariants)
- Use `show-type` command to understand data structures (the meaning)
- Run health checks to verify data integrity (the receipts)
- Remember: we're building The Omnilith—a living network for creative production

**For more context on The Omnilith vision:**

- This is production-focused: we make things, not just organize
- Infrastructure enables aesthetics, doesn't dictate them
- Start with music, expand recursively into all creative forms
- Every namespace is a sovereign node in the civilization graph
- The founding aesthetic is one vision; many others will emerge
- Digital coordination ultimately enables physical creative communities
