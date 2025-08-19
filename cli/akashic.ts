#!/usr/bin/env tsx
/**
 * Akashic Core CLI
 * Command-line interface for interacting with Akashic Core API
 */

const API_URL = process.env.AKASHIC_API_URL || 'http://localhost:3000/graphql';
const DEFAULT_NAMESPACE = process.env.AKASHIC_NAMESPACE || 'default';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Helper function for GraphQL requests
async function graphqlRequest(query: string, variables: any = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data;
  } catch (error: any) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Format JSON for display
function formatJson(obj: any, indent = 2): string {
  return JSON.stringify(obj, null, indent);
}

// Commands
const commands = {
  // List entity types
  async types(args: any) {
    const namespace = args.namespace || DEFAULT_NAMESPACE;

    const query = `
      query GetEntityTypes($namespace: String) {
        entityTypes(namespace: $namespace) {
          id
          name
          namespace
          version
        }
      }
    `;

    const data = await graphqlRequest(query, { namespace });

    console.log(
      `${colors.cyan}Entity Types in namespace '${namespace}':${colors.reset}\n`,
    );
    data.entityTypes.forEach((type: any) => {
      console.log(
        `  ${colors.green}${type.name}${colors.reset} (v${type.version})`,
      );
      console.log(`    ID: ${type.id}`);
    });
  },

  // Create entity type
  async createType(args: any) {
    const namespace = args.namespace || DEFAULT_NAMESPACE;
    const name = args.name;
    const schemaFile = args.schema;

    if (!name || !schemaFile) {
      console.error(
        `${colors.red}Error: --name and --schema are required${colors.reset}`,
      );
      process.exit(1);
    }

    const fs = await import('fs');
    const schemaContent = fs.readFileSync(schemaFile, 'utf-8');

    // Validate JSON
    try {
      JSON.parse(schemaContent);
    } catch (e) {
      console.error(
        `${colors.red}Error: Invalid JSON in schema file${colors.reset}`,
      );
      process.exit(1);
    }

    const mutation = `
      mutation CreateEntityType($input: CreateEntityTypeInput!) {
        createEntityType(input: $input) {
          id
          name
          namespace
          version
        }
      }
    `;

    const data = await graphqlRequest(mutation, {
      input: {
        namespace,
        name,
        schema: schemaContent,
      },
    });

    console.log(
      `${colors.green}✅ Created Entity Type: ${data.createEntityType.name}${colors.reset}`,
    );
    console.log(`   ID: ${data.createEntityType.id}`);
  },

  // List entities
  async entities(args: any) {
    const namespace = args.namespace || DEFAULT_NAMESPACE;
    const typeId = args.type;

    const query = `
      query GetEntities($namespace: String, $entityTypeId: String) {
        entities(namespace: $namespace, entityTypeId: $entityTypeId) {
          id
          entityTypeId
          data
          createdAt
        }
      }
    `;

    const data = await graphqlRequest(query, {
      namespace,
      entityTypeId: typeId,
    });

    console.log(
      `${colors.cyan}Entities in namespace '${namespace}':${colors.reset}\n`,
    );
    data.entities.forEach((entity: any, index: number) => {
      console.log(`${colors.green}[${index + 1}]${colors.reset} ${entity.id}`);
      console.log(`    Data: ${formatJson(entity.data)}`);
      console.log(
        `    Created: ${new Date(entity.createdAt).toLocaleString()}`,
      );
      console.log();
    });
  },

  // Create entity
  async create(args: any) {
    const namespace = args.namespace || DEFAULT_NAMESPACE;
    const typeId = args.type;
    const dataFile = args.data;

    if (!typeId || !dataFile) {
      console.error(
        `${colors.red}Error: --type and --data are required${colors.reset}`,
      );
      process.exit(1);
    }

    const fs = await import('fs');
    const dataContent = fs.readFileSync(dataFile, 'utf-8');

    const mutation = `
      mutation CreateEntity($input: CreateEntityInput!) {
        createEntity(input: $input) {
          id
          entityTypeId
          data
        }
      }
    `;

    const data = await graphqlRequest(mutation, {
      input: {
        namespace,
        entityTypeId: typeId,
        data: dataContent,
      },
    });

    console.log(`${colors.green}✅ Created Entity${colors.reset}`);
    console.log(`   ID: ${data.createEntity.id}`);
    console.log(`   Data: ${formatJson(data.createEntity.data)}`);
  },

  // Query events
  async events(args: any) {
    const namespace = args.namespace || DEFAULT_NAMESPACE;
    const limit = args.limit || 10;

    const query = `
      query GetEvents($namespace: String) {
        events(namespace: $namespace) {
          id
          eventType
          resourceType
          resourceId
          timestamp
          payload
        }
      }
    `;

    const data = await graphqlRequest(query, { namespace });
    const events = data.events.slice(-limit);

    console.log(
      `${colors.cyan}Recent Events (last ${limit}):${colors.reset}\n`,
    );
    events.forEach((event: any) => {
      const time = new Date(event.timestamp).toLocaleString();
      console.log(
        `${colors.yellow}${time}${colors.reset} - ${colors.green}${event.eventType}${colors.reset}`,
      );
      console.log(`  Resource: ${event.resourceType} (${event.resourceId})`);
      if (args.verbose) {
        console.log(`  Payload: ${formatJson(event.payload)}`);
      }
      console.log();
    });
  },

  // Create relation type
  async createRelationType(args: any) {
    const namespace = args.namespace || DEFAULT_NAMESPACE;
    const name = args.name;
    const from = args.from;
    const to = args.to;
    const cardinality = args.cardinality || '1..n';

    if (!name || !from || !to) {
      console.error(
        `${colors.red}Error: --name, --from, and --to are required${colors.reset}`,
      );
      process.exit(1);
    }

    const mutation = `
      mutation CreateRelationType($input: CreateRelationTypeInput!) {
        createRelationType(input: $input) {
          id
          name
          cardinality
        }
      }
    `;

    const data = await graphqlRequest(mutation, {
      input: {
        namespace,
        name,
        fromEntityTypeId: from,
        toEntityTypeId: to,
        cardinality,
      },
    });

    console.log(
      `${colors.green}✅ Created Relation Type: ${data.createRelationType.name}${colors.reset}`,
    );
    console.log(`   ID: ${data.createRelationType.id}`);
    console.log(`   Cardinality: ${data.createRelationType.cardinality}`);
  },

  // Create relation
  async link(args: any) {
    const namespace = args.namespace || DEFAULT_NAMESPACE;
    const typeId = args.type;
    const from = args.from;
    const to = args.to;
    const metadata = args.metadata;

    if (!typeId || !from || !to) {
      console.error(
        `${colors.red}Error: --type, --from, and --to are required${colors.reset}`,
      );
      process.exit(1);
    }

    const mutation = `
      mutation CreateRelation($input: CreateRelationInput!) {
        createRelation(input: $input) {
          id
          relationTypeId
          fromEntityId
          toEntityId
        }
      }
    `;

    const data = await graphqlRequest(mutation, {
      input: {
        namespace,
        relationTypeId: typeId,
        fromEntityId: from,
        toEntityId: to,
        metadata: metadata || undefined,
      },
    });

    console.log(`${colors.green}✅ Created Relation${colors.reset}`);
    console.log(`   ID: ${data.createRelation.id}`);
    console.log(`   From: ${data.createRelation.fromEntityId}`);
    console.log(`   To: ${data.createRelation.toEntityId}`);
  },

  // Query relations
  async relations(args: any) {
    const namespace = args.namespace || DEFAULT_NAMESPACE;
    const fromId = args.from;
    const toId = args.to;

    const query = `
      query GetRelations($namespace: String, $fromEntityId: String, $toEntityId: String) {
        relations(namespace: $namespace, fromEntityId: $fromEntityId, toEntityId: $toEntityId) {
          id
          relationTypeId
          fromEntityId
          toEntityId
          metadata
        }
      }
    `;

    const data = await graphqlRequest(query, {
      namespace,
      fromEntityId: fromId,
      toEntityId: toId,
    });

    console.log(`${colors.cyan}Relations:${colors.reset}\n`);
    data.relations.forEach((rel: any) => {
      console.log(`${colors.green}Relation ${rel.id}${colors.reset}`);
      console.log(`  From: ${rel.fromEntityId}`);
      console.log(`  To: ${rel.toEntityId}`);
      if (rel.metadata) {
        console.log(`  Metadata: ${formatJson(rel.metadata)}`);
      }
      console.log();
    });
  },

  // Health check
  async health() {
    try {
      const query = `
        query Health {
          __typename
        }
      `;

      await graphqlRequest(query);
      console.log(`${colors.green}✅ API is healthy${colors.reset}`);
      console.log(`   Endpoint: ${API_URL}`);
    } catch (error) {
      console.log(`${colors.red}❌ API is not responding${colors.reset}`);
      process.exit(1);
    }
  },

  // Show help
  help() {
    console.log(`
${colors.bright}Akashic Core CLI${colors.reset}

${colors.cyan}Usage:${colors.reset}
  akashic <command> [options]

${colors.cyan}Commands:${colors.reset}
  ${colors.green}types${colors.reset}                List entity types
  ${colors.green}create-type${colors.reset}          Create a new entity type
  ${colors.green}entities${colors.reset}             List entities
  ${colors.green}create${colors.reset}               Create a new entity
  ${colors.green}create-relation-type${colors.reset} Create a relation type
  ${colors.green}link${colors.reset}                 Create a relation between entities
  ${colors.green}relations${colors.reset}            List relations
  ${colors.green}events${colors.reset}               Show recent events
  ${colors.green}health${colors.reset}               Check API health
  ${colors.green}help${colors.reset}                 Show this help message

${colors.cyan}Global Options:${colors.reset}
  --namespace <ns>     Namespace to use (default: "${DEFAULT_NAMESPACE}")
  --api <url>          API endpoint (default: "${API_URL}")

${colors.cyan}Examples:${colors.reset}
  # List all entity types
  akashic types

  # Create an entity type from a JSON schema file
  akashic create-type --name User --schema ./schemas/user.json

  # Create an entity
  akashic create --type <entity-type-id> --data ./data/user.json

  # Create a relation between entities
  akashic link --type <relation-type-id> --from <entity-id> --to <entity-id>

  # View recent events
  akashic events --limit 20 --verbose

${colors.cyan}Environment Variables:${colors.reset}
  AKASHIC_API_URL      API endpoint
  AKASHIC_NAMESPACE    Default namespace
`);
  },
};

// Main CLI handler
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    commands.help();
    process.exit(0);
  }

  const command = args[0];

  // Parse command line arguments
  const options: any = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      options[key] = value;
      i++;
    }
  }

  // Override API URL if provided
  if (options.api) {
    Object.assign(globalThis, { API_URL: options.api });
  }

  // Execute command
  switch (command) {
    case 'types':
      await commands.types(options);
      break;
    case 'create-type':
      await commands.createType(options);
      break;
    case 'entities':
      await commands.entities(options);
      break;
    case 'create':
      await commands.create(options);
      break;
    case 'create-relation-type':
      await commands.createRelationType(options);
      break;
    case 'link':
      await commands.link(options);
      break;
    case 'relations':
      await commands.relations(options);
      break;
    case 'events':
      await commands.events(options);
      break;
    case 'health':
      await commands.health();
      break;
    case 'help':
    case '--help':
    case '-h':
      commands.help();
      break;
    default:
      console.error(`${colors.red}Unknown command: ${command}${colors.reset}`);
      console.log('Run "akashic help" for usage information');
      process.exit(1);
  }
}

// Run the CLI
main().catch((error) => {
  console.error(
    `${colors.red}Unexpected error: ${error.message}${colors.reset}`,
  );
  process.exit(1);
});
