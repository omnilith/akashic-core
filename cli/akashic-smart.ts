#!/usr/bin/env tsx
/**
 * Akashic Smart CLI
 * Schema-aware command-line interface with interactive prompts
 */

import * as schemaHelper from './schema-helper';
import * as interactive from './interactive';
import inquirer from 'inquirer';

const DEFAULT_NAMESPACE = process.env.AKASHIC_NAMESPACE || 'default';

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Main commands
const commands = {
  // Register a type alias
  register(args: string[]) {
    if (args.length < 2) {
      console.error(
        `${colors.red}Usage: akashic register <name> <uuid>${colors.reset}`,
      );
      process.exit(1);
    }

    const [name, uuid] = args;
    schemaHelper.registerTypeAlias(name, uuid);
  },

  // List registered types
  async types() {
    console.log(`\n${colors.cyan}Registered Type Aliases:${colors.reset}\n`);
    schemaHelper.listTypeAliases();

    console.log(`\n${colors.cyan}Available Entity Types:${colors.reset}\n`);
    const types = await schemaHelper.fetchAllEntityTypes();

    for (const type of types) {
      const config = schemaHelper.loadConfig();
      const alias = Object.entries(config.typeAliases).find(
        ([_, id]) => id === type.id,
      )?.[0];

      console.log(
        `  ${colors.green}${type.name}${colors.reset} (${type.namespace})`,
      );
      console.log(`    ID: ${type.id}`);
      if (alias) {
        console.log(`    Alias: ${colors.blue}${alias}${colors.reset}`);
      }
      console.log();
    }
  },

  // Create entity with interactive prompts
  async create(args: string[]) {
    let typeName: string;
    let namespace = DEFAULT_NAMESPACE;
    let quickData: any = {};

    // Parse arguments
    if (args.length === 0) {
      // Interactive mode - ask for type
      const types = await schemaHelper.fetchAllEntityTypes();
      const config = schemaHelper.loadConfig();

      const choices = types.map((t: any) => {
        const alias = Object.entries(config.typeAliases).find(
          ([_, id]) => id === t.id,
        )?.[0];
        return {
          name: alias ? `${t.name} (${alias})` : t.name,
          value: t.id,
        };
      });

      const answer = await inquirer.prompt([
        {
          type: 'list',
          name: 'typeId',
          message: 'Select entity type:',
          choices,
        },
      ]);

      typeName = answer.typeId;
    } else {
      typeName = args[0];

      // Check for quick input mode (key=value pairs)
      if (args.length > 1) {
        quickData = interactive.parseQuickInput(args.slice(1));
      }
    }

    // Parse namespace if provided
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--namespace' && args[i + 1]) {
        namespace = args[i + 1];
        break;
      }
    }

    // For Task type, default to tasks namespace
    if (typeName && typeName.toLowerCase() === 'task') {
      namespace = 'tasks';
    }

    try {
      // Get schema
      console.log(`\n${colors.cyan}Loading schema...${colors.reset}`);
      const schema = await schemaHelper.getSchema(typeName);
      const fields = schemaHelper.parseSchema(schema);

      // Get entity type info
      const typeId = schemaHelper.resolveTypeId(typeName);

      let entityData: any;

      if (Object.keys(quickData).length > 0) {
        // Quick mode - validate provided data
        entityData = quickData;
        const validation = interactive.validateEntity(entityData, fields);

        if (!validation.valid) {
          console.error(`${colors.red}Validation errors:${colors.reset}`);
          validation.errors.forEach((err) => console.error(`  - ${err}`));

          // Ask if they want to continue interactively
          const answer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'continue',
              message: 'Would you like to fix these issues interactively?',
              default: true,
            },
          ]);

          if (!answer.continue) {
            process.exit(1);
          }

          // Fill in missing required fields
          const missingFields = fields.filter(
            (f) =>
              f.required &&
              (entityData[f.name] === undefined || entityData[f.name] === ''),
          );

          if (missingFields.length > 0) {
            const additionalData =
              await interactive.promptForEntity(missingFields);
            entityData = { ...entityData, ...additionalData };
          }
        }
      } else {
        // Interactive mode - prompt for all fields
        entityData = await interactive.promptForEntity(fields);
      }

      // Create the entity
      console.log(`\n${colors.cyan}Creating entity...${colors.reset}`);

      const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            entityTypeId
            data
            createdAt
          }
        }
      `;

      const result = await schemaHelper.graphqlRequest(mutation, {
        input: {
          namespace,
          entityTypeId: typeId,
          data: JSON.stringify(entityData),
        },
      });

      console.log(
        `\n${colors.green}✅ Entity created successfully!${colors.reset}`,
      );
      console.log(`   ID: ${result.createEntity.id}`);
      console.log(
        `   Created: ${new Date(result.createEntity.createdAt).toLocaleString()}`,
      );
      console.log(`   Data: ${JSON.stringify(entityData, null, 2)}`);
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // List entities of a type
  async list(args: string[]) {
    if (args.length === 0) {
      console.error(`${colors.red}Usage: akashic list <type>${colors.reset}`);
      process.exit(1);
    }

    const typeName = args[0];
    let namespace = DEFAULT_NAMESPACE;

    // Check for namespace flag
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--namespace' && args[i + 1]) {
        namespace = args[i + 1];
        break;
      }
    }

    // For Task type, default to tasks namespace
    if (typeName.toLowerCase() === 'task') {
      namespace = 'tasks';
    }

    try {
      const typeId = schemaHelper.resolveTypeId(typeName);

      const query = `
        query GetEntities($namespace: String, $entityTypeId: String) {
          entities(namespace: $namespace, entityTypeId: $entityTypeId) {
            id
            data
            createdAt
            updatedAt
          }
        }
      `;

      const result = await schemaHelper.graphqlRequest(query, {
        namespace,
        entityTypeId: typeId,
      });

      if (result.entities.length === 0) {
        console.log(`No entities found for type: ${typeName}`);
        return;
      }

      console.log(
        `\n${colors.cyan}Entities of type ${typeName}:${colors.reset}\n`,
      );

      result.entities.forEach((entity: any, index: number) => {
        console.log(
          `${colors.green}[${index + 1}]${colors.reset} ${entity.id}`,
        );
        console.log(
          `    Created: ${new Date(entity.createdAt).toLocaleString()}`,
        );
        console.log(
          `    Data: ${JSON.stringify(entity.data, null, 2)
            .split('\n')
            .map((line, i) => (i === 0 ? line : `    ${line}`))
            .join('\n')}`,
        );
        console.log();
      });
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Update an entity
  async update(args: string[]) {
    if (args.length < 2) {
      console.error(
        `${colors.red}Usage: akashic update <type> <id> [field=value ...]${colors.reset}`,
      );
      process.exit(1);
    }

    const typeName = args[0];
    const entityId = args[1];
    const updates = interactive.parseQuickInput(args.slice(2));

    try {
      // Get current entity data - fetch all and filter client-side
      const query = `
        query GetEntities {
          entities {
            id
            data
            entityTypeId
          }
        }
      `;

      const entityResult = await schemaHelper.graphqlRequest(query, {});

      const entity = entityResult.entities.find((e: any) => e.id === entityId);

      if (!entity) {
        throw new Error(`Entity not found: ${entityId}`);
      }

      const currentData = entity.data;

      // Get schema for validation
      const schema = await schemaHelper.getSchema(typeName);
      const fields = schemaHelper.parseSchema(schema);

      // Merge updates
      const newData = { ...currentData, ...updates };

      // Validate
      const validation = interactive.validateEntity(newData, fields);
      if (!validation.valid) {
        console.error(`${colors.red}Validation errors:${colors.reset}`);
        validation.errors.forEach((err) => console.error(`  - ${err}`));
        process.exit(1);
      }

      // Update entity
      const mutation = `
        mutation UpdateEntity($id: String!, $data: String!) {
          updateEntity(id: $id, data: $data) {
            id
            data
            updatedAt
          }
        }
      `;

      const result = await schemaHelper.graphqlRequest(mutation, {
        id: entityId,
        data: JSON.stringify(newData),
      });

      console.log(
        `\n${colors.green}✅ Entity updated successfully!${colors.reset}`,
      );
      console.log(
        `   Updated: ${new Date(result.updateEntity.updatedAt).toLocaleString()}`,
      );
      console.log(`   New Data: ${JSON.stringify(newData, null, 2)}`);
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Create a new entity type
  async createType(args: string[]) {
    console.log(`\n${colors.cyan}Create New Entity Type${colors.reset}\n`);
    
    // Get type name and namespace
    const typeInfo = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Entity type name:',
        validate: (input) => input.length > 0 || 'Type name is required',
      },
      {
        type: 'input',
        name: 'namespace',
        message: 'Namespace:',
        default: DEFAULT_NAMESPACE,
      },
    ]);
    
    // Build properties
    const properties: any = {};
    const required: string[] = [];
    let addMore = true;
    
    while (addMore) {
      const propInfo = await interactive.buildProperty();
      properties[propInfo.name] = propInfo.property;
      
      if (propInfo.required) {
        required.push(propInfo.name);
      }
      
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addMore',
          message: 'Add another property?',
          default: true,
        },
      ]);
      
      addMore = answer.addMore;
    }
    
    // Build the JSON schema
    const schema = {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false,
    };
    
    // Show the schema for confirmation
    console.log(`\n${colors.cyan}Generated JSON Schema:${colors.reset}`);
    console.log(JSON.stringify(schema, null, 2));
    
    const confirm = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Create this entity type?',
        default: true,
      },
    ]);
    
    if (!confirm.proceed) {
      console.log('Cancelled.');
      return;
    }
    
    try {
      // Create the entity type
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
      
      const result = await schemaHelper.graphqlRequest(mutation, {
        input: {
          namespace: typeInfo.namespace,
          name: typeInfo.name,
          schema: JSON.stringify(schema),
        },
      });
      
      const entityType = result.createEntityType;
      console.log(`\n${colors.green}✅ Entity type created successfully!${colors.reset}`);
      console.log(`   Name: ${entityType.name}`);
      console.log(`   Namespace: ${entityType.namespace}`);
      console.log(`   ID: ${entityType.id}`);
      console.log(`   Version: ${entityType.version}`);
      
      // Offer to register an alias
      const registerAlias = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'register',
          message: 'Register an alias for easier access?',
          default: true,
        },
      ]);
      
      if (registerAlias.register) {
        const aliasName = await inquirer.prompt([
          {
            type: 'input',
            name: 'alias',
            message: 'Alias name:',
            default: typeInfo.name.toLowerCase(),
          },
        ]);
        
        schemaHelper.registerTypeAlias(aliasName.alias, entityType.id);
      }
      
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Show help
  help() {
    console.log(`
${colors.bright}Akashic Smart CLI${colors.reset}
Schema-aware interface for Akashic Core

${colors.cyan}Usage:${colors.reset}
  akashic <command> [options]

${colors.cyan}Commands:${colors.reset}
  ${colors.green}register <name> <uuid>${colors.reset}  Register a type alias
  ${colors.green}types${colors.reset}                    List all types and aliases
  ${colors.green}create-type${colors.reset}              Create a new entity type (schema)
  ${colors.green}create [type]${colors.reset}            Create entity (interactive if no type)
  ${colors.green}list <type>${colors.reset}              List entities of a type
  ${colors.green}update <type> <id>${colors.reset}       Update an entity
  ${colors.green}help${colors.reset}                     Show this help

${colors.cyan}Quick Input Mode:${colors.reset}
  # Create with inline data
  akashic create Task title="Fix bug" status=todo priority=high
  
  # Update specific fields
  akashic update Task <id> status=done

${colors.cyan}Interactive Mode:${colors.reset}
  # Prompts for all required fields
  akashic create Task
  
  # Choose from available types
  akashic create

${colors.cyan}Examples:${colors.reset}
  # First time setup
  akashic register Task 45fb9abb-09ef-4446-91ab-ac41d1b0cbd4
  
  # Create a task interactively
  akashic create Task
  
  # Quick create
  akashic create Task title="Fix login" status=todo priority=high
  
  # List all tasks
  akashic list Task
  
  # Update a task
  akashic update Task <id> status=done

${colors.cyan}Environment Variables:${colors.reset}
  AKASHIC_API_URL      API endpoint (default: http://localhost:3000/graphql)
  AKASHIC_NAMESPACE    Default namespace (default: "default")
`);
  },
};

// Main entry point
async function main() {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args[0] === 'help' ||
    args[0] === '--help' ||
    args[0] === '-h'
  ) {
    commands.help();
    return;
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  switch (command) {
    case 'register':
      commands.register(commandArgs);
      break;
    case 'types':
      await commands.types();
      break;
    case 'create-type':
      await commands.createType(commandArgs);
      break;
    case 'create':
      await commands.create(commandArgs);
      break;
    case 'list':
      await commands.list(commandArgs);
      break;
    case 'update':
      await commands.update(commandArgs);
      break;
    default:
      console.error(`${colors.red}Unknown command: ${command}${colors.reset}`);
      console.log('Run "akashic help" for usage information');
      process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error(
    `${colors.red}Unexpected error: ${error.message}${colors.reset}`,
  );
  process.exit(1);
});
