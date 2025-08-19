#!/usr/bin/env tsx
/**
 * Akashic Smart CLI
 * Schema-aware command-line interface with interactive prompts
 */

import * as schemaHelper from './schema-helper';
import * as interactive from './interactive';
import inquirer from 'inquirer';
import HealthChecker from './health-checker';
import * as fs from 'fs';

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
  dim: '\x1b[2m',
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
    const partialId = args[1];

    // Resolve partial ID to full ID
    const entityId = await schemaHelper.resolveEntityId(partialId);
    if (!entityId) {
      console.error(
        `${colors.red}Entity not found matching: ${partialId}${colors.reset}`,
      );
      process.exit(1);
    }
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
      console.log(
        `\n${colors.green}✅ Entity type created successfully!${colors.reset}`,
      );
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

  // Create a new relation type
  async createRelationType(args: string[]) {
    console.log(`\n${colors.cyan}Create New Relation Type${colors.reset}\n`);

    // Get all entity types for selection
    const types = await schemaHelper.fetchAllEntityTypes();
    const typeChoices = types.map((t: any) => ({
      name: `${t.name} (${t.namespace})`,
      value: t.id,
    }));

    // Get relation type info
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Relation type name (e.g., "author", "belongs_to"):',
        validate: (input) => input.length > 0 || 'Name is required',
      },
      {
        type: 'input',
        name: 'namespace',
        message: 'Namespace:',
        default: DEFAULT_NAMESPACE,
      },
      {
        type: 'list',
        name: 'fromEntityTypeId',
        message: 'From entity type (source):',
        choices: typeChoices,
      },
      {
        type: 'list',
        name: 'toEntityTypeId',
        message: 'To entity type (target):',
        choices: typeChoices,
      },
      {
        type: 'list',
        name: 'cardinality',
        message: 'Cardinality:',
        choices: [
          { name: 'One to One (1..1)', value: '1..1' },
          { name: 'One to Many (1..n)', value: '1..n' },
          { name: 'Many to One (n..1)', value: 'n..1' },
          { name: 'Many to Many (n..n)', value: 'n..n' },
        ],
      },
    ]);

    try {
      const mutation = `
        mutation CreateRelationType($input: CreateRelationTypeInput!) {
          createRelationType(input: $input) {
            id
            name
            namespace
            fromEntityTypeId
            toEntityTypeId
            cardinality
          }
        }
      `;

      const result = await schemaHelper.graphqlRequest(mutation, {
        input: answers,
      });

      const relationType = result.createRelationType;
      console.log(
        `\n${colors.green}✅ Relation type created successfully!${colors.reset}`,
      );
      console.log(`   Name: ${relationType.name}`);
      console.log(`   Namespace: ${relationType.namespace}`);
      console.log(`   Cardinality: ${relationType.cardinality}`);
      console.log(`   ID: ${relationType.id}`);
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Create a relation between two entities
  async link(args: string[]) {
    console.log(`\n${colors.cyan}Create Relation${colors.reset}\n`);

    // Get relation types for selection
    const rtQuery = `
      query GetRelationTypes {
        relationTypes {
          id
          name
          namespace
          fromEntityTypeId
          toEntityTypeId
          cardinality
        }
      }
    `;

    const rtResult = await schemaHelper.graphqlRequest(rtQuery, {});

    if (rtResult.relationTypes.length === 0) {
      console.log(
        'No relation types found. Create one first with create-relation-type.',
      );
      return;
    }

    const rtChoices = rtResult.relationTypes.map((rt: any) => ({
      name: `${rt.name} (${rt.cardinality})`,
      value: rt,
    }));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'relationType',
        message: 'Select relation type:',
        choices: rtChoices,
      },
      {
        type: 'input',
        name: 'fromEntityId',
        message: 'From entity ID:',
        validate: (input) => input.length > 0 || 'From entity ID is required',
      },
      {
        type: 'input',
        name: 'toEntityId',
        message: 'To entity ID:',
        validate: (input) => input.length > 0 || 'To entity ID is required',
      },
      {
        type: 'input',
        name: 'metadata',
        message: 'Metadata (JSON, optional):',
        default: '',
      },
    ]);

    try {
      const mutation = `
        mutation CreateRelation($input: CreateRelationInput!) {
          createRelation(input: $input) {
            id
            relationTypeId
            fromEntityId
            toEntityId
            metadata
            createdAt
          }
        }
      `;

      const input: any = {
        namespace: answers.relationType.namespace,
        relationTypeId: answers.relationType.id,
        fromEntityId: answers.fromEntityId,
        toEntityId: answers.toEntityId,
      };

      if (answers.metadata) {
        input.metadata = answers.metadata;
      }

      const result = await schemaHelper.graphqlRequest(mutation, { input });

      console.log(
        `\n${colors.green}✅ Relation created successfully!${colors.reset}`,
      );
      console.log(`   Type: ${answers.relationType.name}`);
      console.log(`   From: ${answers.fromEntityId}`);
      console.log(`   To: ${answers.toEntityId}`);
      console.log(`   ID: ${result.createRelation.id}`);
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Delete a relation
  async unlink(args: string[]) {
    if (args.length === 0) {
      console.error(
        `${colors.red}Usage: akashic unlink <relation-id>${colors.reset}`,
      );
      process.exit(1);
    }

    const partialId = args[0];

    // For relations, we need a different resolver
    // For now, require full relation ID
    const relationId = partialId;

    try {
      const mutation = `
        mutation DeleteRelation($id: ID!) {
          deleteRelation(id: $id) {
            id
          }
        }
      `;

      await schemaHelper.graphqlRequest(mutation, { id: relationId });

      console.log(
        `\n${colors.green}✅ Relation deleted successfully!${colors.reset}`,
      );
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // List relations
  async listRelations(args: string[]) {
    let filters: any = {};

    // Parse filters
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--from' && args[i + 1]) {
        filters.fromEntityId = args[i + 1];
      }
      if (args[i] === '--to' && args[i + 1]) {
        filters.toEntityId = args[i + 1];
      }
      if (args[i] === '--type' && args[i + 1]) {
        filters.relationTypeId = args[i + 1];
      }
      if (args[i] === '--namespace' && args[i + 1]) {
        filters.namespace = args[i + 1];
      }
    }

    try {
      const query = `
        query GetRelations($namespace: String, $relationTypeId: ID, $fromEntityId: ID, $toEntityId: ID) {
          relations(
            namespace: $namespace
            relationTypeId: $relationTypeId
            fromEntityId: $fromEntityId
            toEntityId: $toEntityId
          ) {
            id
            relationTypeId
            fromEntityId
            toEntityId
            metadata
            createdAt
          }
        }
      `;

      const result = await schemaHelper.graphqlRequest(query, filters);

      if (result.relations.length === 0) {
        console.log('No relations found.');
        return;
      }

      console.log(`\n${colors.cyan}Relations:${colors.reset}\n`);

      for (const rel of result.relations) {
        console.log(`${colors.green}[Relation]${colors.reset} ${rel.id}`);
        console.log(`  Type: ${rel.relationTypeId}`);
        console.log(`  From: ${rel.fromEntityId}`);
        console.log(`  To: ${rel.toEntityId}`);
        if (rel.metadata) {
          console.log(`  Metadata: ${rel.metadata}`);
        }
        console.log(`  Created: ${new Date(rel.createdAt).toLocaleString()}`);
        console.log();
      }
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Search for entities by field values
  async search(args: string[]) {
    const parseArgs = () => {
      const options: any = {
        filter: {},
      };

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--type' && args[i + 1]) {
          options.filter.entityTypeId = schemaHelper.resolveTypeId(args[i + 1]);
          i++;
        } else if (args[i] === '--namespace' && args[i + 1]) {
          options.filter.namespace = args[i + 1];
          i++;
        } else if (args[i] === '--query' && args[i + 1]) {
          try {
            const query = args[i + 1];
            if (query.startsWith('{')) {
              options.filter.data = JSON.parse(query);
            } else {
              const [key, value] = query.split('=');
              if (key && value) {
                options.filter.data = { [key]: value };
              }
            }
          } catch (e) {
            console.error(`Invalid query format: ${args[i + 1]}`);
          }
          i++;
        } else if (args[i] === '--filter' && args[i + 1]) {
          try {
            const filterJson = JSON.parse(args[i + 1]);
            options.filter = { ...options.filter, ...filterJson };
          } catch (e) {
            console.error(`Invalid filter JSON: ${args[i + 1]}`);
          }
          i++;
        } else if (args[i] === '--limit' && args[i + 1]) {
          options.filter.limit = parseInt(args[i + 1]);
          i++;
        } else if (args[i] === '--offset' && args[i + 1]) {
          options.filter.offset = parseInt(args[i + 1]);
          i++;
        } else if (!args[i].startsWith('--')) {
          const [key, value] = args[i].split('=');
          if (key && value) {
            if (!options.filter.data) options.filter.data = {};
            options.filter.data[key] = value;
          }
        }
      }

      if (!options.filter.limit) {
        options.filter.limit = 20;
      }

      return options;
    };

    const options = parseArgs();

    console.log(`\n${colors.cyan}Searching entities...${colors.reset}`);

    const query = `
      query SearchEntities($filter: EntityFilterInput!) {
        searchEntities(filter: $filter) {
          id
          namespace
          entityTypeId
          data
          createdAt
          updatedAt
        }
        countEntities(filter: $filter)
      }
    `;

    try {
      const result = await schemaHelper.graphqlRequest(query, { filter: options.filter });

      if (!result.searchEntities || result.searchEntities.length === 0) {
        console.log(`${colors.yellow}No entities found matching the query.${colors.reset}`);
        return;
      }

      const entities = result.searchEntities;
      const total = result.countEntities;

      console.log(`\n${colors.green}Found ${entities.length} of ${total} total matching entities:${colors.reset}\n`);

      const typeIds = [...new Set(entities.map((e: any) => e.entityTypeId))];
      const typesQuery = `
        query GetTypes {
          entityTypes {
            id
            name
          }
        }
      `;
      const typesResult = await schemaHelper.graphqlRequest(typesQuery);
      const typeMap = new Map(typesResult.entityTypes.map((t: any) => [t.id, t.name]));

      entities.forEach((entity: any) => {
        const typeName = typeMap.get(entity.entityTypeId) || 'Unknown';
        console.log(`${colors.bright}[${typeName}] ${entity.id}${colors.reset}`);
        console.log(`  Namespace: ${entity.namespace}`);
        
        const dataKeys = Object.keys(entity.data);
        const preview = dataKeys.slice(0, 3).reduce((acc: any, key) => {
          acc[key] = entity.data[key];
          return acc;
        }, {});
        
        console.log(`  Data: ${JSON.stringify(preview, null, 2).split('\n').join('\n  ')}`);
        if (dataKeys.length > 3) {
          console.log(`  ... and ${dataKeys.length - 3} more fields`);
        }
        console.log();
      });

      if (entities.length < total) {
        console.log(`${colors.dim}Showing ${entities.length} of ${total} results. Use --limit and --offset for pagination.${colors.reset}\n`);
      }

    } catch (error: any) {
      console.error(`${colors.red}Search failed:${colors.reset}`, error.message);
    }
  },

  // OLD SEARCH FUNCTION REMOVED - using new query builder
  async oldSearch_removed(args: string[]) {

    // Parse arguments
    let i = 0;
    while (i < args.length) {
      if (args[i] === '--type' && args[i + 1]) {
        searchType = args[i + 1];
        i += 2;
      } else if (args[i] === '--namespace' && args[i + 1]) {
        namespace = args[i + 1];
        i += 2;
      } else if (!searchField && args[i].includes('=')) {
        // Parse field=value format
        const [field, ...valueParts] = args[i].split('=');
        searchField = field;
        searchValue = valueParts.join('=');
        i++;
      } else if (!searchField) {
        searchField = args[i];
        searchValue = args[i + 1];
        i += 2;
      } else {
        i++;
      }
    }

    // Interactive mode if no search criteria provided
    if (!searchField) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'field',
          message: 'Search field name:',
          validate: (input) => input.length > 0 || 'Field name is required',
        },
        {
          type: 'input',
          name: 'value',
          message: 'Search value (supports partial matches):',
          validate: (input) => input.length > 0 || 'Search value is required',
        },
      ]);

      searchField = answers.field;
      searchValue = answers.value;
    }

    try {
      // Fetch all entities
      const query = `
        query GetEntities($namespace: String, $entityTypeId: String) {
          entities(namespace: $namespace, entityTypeId: $entityTypeId) {
            id
            namespace
            entityTypeId
            data
            createdAt
            updatedAt
          }
        }
      `;

      // If type specified, resolve it to an ID
      let typeId: string | undefined;
      if (searchType) {
        typeId = schemaHelper.resolveTypeId(searchType);
      }

      const result = await schemaHelper.graphqlRequest(query, {
        namespace: searchType ? undefined : namespace,
        entityTypeId: typeId,
      });

      // Search through entities
      const matches: any[] = [];
      for (const entity of result.entities) {
        const data = entity.data;

        // Check if field exists and matches (case-insensitive partial match)
        if (data && typeof data === 'object') {
          const fieldValue = data[searchField!];
          if (fieldValue !== undefined) {
            const valueStr = String(fieldValue).toLowerCase();
            const searchStr = String(searchValue).toLowerCase();

            if (valueStr.includes(searchStr)) {
              matches.push(entity);
            }
          }
        }
      }

      // Get entity type information for display
      const typesQuery = `
        query GetEntityTypes {
          entityTypes {
            id
            name
            namespace
          }
        }
      `;

      const typesResult = await schemaHelper.graphqlRequest(typesQuery, {});
      const typeMap = new Map(
        typesResult.entityTypes.map((t: any) => [t.id, t]),
      );

      // Display results
      if (matches.length === 0) {
        console.log(
          `No entities found matching ${searchField}="${searchValue}"`,
        );
        return;
      }

      console.log(
        `\n${colors.green}Found ${matches.length} match${matches.length === 1 ? '' : 'es'}:${colors.reset}\n`,
      );

      // Group by entity type for better display
      const byType = new Map<string, any[]>();
      for (const entity of matches) {
        const typeId = entity.entityTypeId;
        if (!byType.has(typeId)) {
          byType.set(typeId, []);
        }
        byType.get(typeId)!.push(entity);
      }

      // Display grouped results
      for (const [typeId, entities] of byType) {
        const type = typeMap.get(typeId);
        console.log(
          `${colors.cyan}${type ? (type as any).name : 'Unknown Type'}:${colors.reset}`,
        );

        for (const entity of entities) {
          // Create a preview of the entity
          const data = entity.data;
          const matchedValue = data[searchField!];

          // Build a preview showing the matched field and other key fields
          let preview = `${searchField}: ${colors.yellow}${matchedValue}${colors.reset}`;

          // Add other identifying fields if they exist
          const identifiers = ['name', 'title', 'username', 'email', 'id'];
          for (const field of identifiers) {
            if (field !== searchField && data[field]) {
              preview += `, ${field}: ${data[field]}`;
              break; // Just show one additional field
            }
          }

          console.log(`  • ${entity.id.substring(0, 8)}... ${preview}`);
          console.log(
            `    ${colors.dim}namespace: ${entity.namespace}, created: ${new Date(entity.createdAt).toLocaleDateString()}${colors.reset}`,
          );
        }
        console.log();
      }

      // Suggest next actions
      console.log(
        `${colors.dim}Tip: Use 'akashic show <id>' to see full details of any entity${colors.reset}`,
      );
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Show detailed information about an entity
  async show(args: string[]) {
    if (args.length === 0) {
      console.error(
        `${colors.red}Usage: akashic show <entity-id>${colors.reset}`,
      );
      process.exit(1);
    }

    const partialId = args[0];

    // Resolve partial ID to full ID
    const entityId = await schemaHelper.resolveEntityId(partialId);
    if (!entityId) {
      console.error(
        `${colors.red}Entity not found matching: ${partialId}${colors.reset}`,
      );
      process.exit(1);
    }

    try {
      // 1. Fetch the entity
      const entityQuery = `
        query GetEntity {
          entities {
            id
            namespace
            entityTypeId
            entityTypeVersion
            data
            createdAt
            updatedAt
          }
        }
      `;

      const entityResult = await schemaHelper.graphqlRequest(entityQuery, {});
      const entity = entityResult.entities.find((e: any) => e.id === entityId);

      if (!entity) {
        console.error(
          `${colors.red}Entity not found: ${entityId}${colors.reset}`,
        );
        process.exit(1);
      }

      // 2. Fetch entity type info
      const typesQuery = `
        query GetEntityTypes {
          entityTypes {
            id
            name
            namespace
          }
        }
      `;

      const typesResult = await schemaHelper.graphqlRequest(typesQuery, {});
      const entityType = typesResult.entityTypes.find(
        (t: any) => t.id === entity.entityTypeId,
      );

      // 3. Fetch outgoing relations
      const outgoingQuery = `
        query GetOutgoingRelations($fromEntityId: ID) {
          relations(fromEntityId: $fromEntityId) {
            id
            relationTypeId
            toEntityId
            metadata
          }
        }
      `;

      const outgoingResult = await schemaHelper.graphqlRequest(outgoingQuery, {
        fromEntityId: entityId,
      });

      // 4. Fetch incoming relations
      const incomingQuery = `
        query GetIncomingRelations($toEntityId: ID) {
          relations(toEntityId: $toEntityId) {
            id
            relationTypeId
            fromEntityId
            metadata
          }
        }
      `;

      const incomingResult = await schemaHelper.graphqlRequest(incomingQuery, {
        toEntityId: entityId,
      });

      // 5. Fetch relation types
      const rtQuery = `
        query GetRelationTypes {
          relationTypes {
            id
            name
            cardinality
          }
        }
      `;

      const rtResult = await schemaHelper.graphqlRequest(rtQuery, {});
      const relationTypes = rtResult.relationTypes;

      // 6. Fetch related entities for context
      const relatedIds = [
        ...outgoingResult.relations.map((r: any) => r.toEntityId),
        ...incomingResult.relations.map((r: any) => r.fromEntityId),
      ];

      let relatedEntities: any[] = [];
      if (relatedIds.length > 0) {
        const relatedResult = await schemaHelper.graphqlRequest(
          entityQuery,
          {},
        );
        relatedEntities = relatedResult.entities.filter((e: any) =>
          relatedIds.includes(e.id),
        );
      }

      // Display everything
      console.log('\n' + '━'.repeat(50));
      console.log(
        `${colors.bright}ENTITY: ${entityType ? entityType.name : 'Unknown'}${colors.reset}`,
      );
      console.log('━'.repeat(50));

      console.log(`\n${colors.cyan}ID:${colors.reset} ${entity.id}`);
      console.log(
        `${colors.cyan}Type:${colors.reset} ${entityType ? `${entityType.name} (${entityType.namespace})` : entity.entityTypeId}`,
      );
      console.log(
        `${colors.cyan}Created:${colors.reset} ${new Date(entity.createdAt).toLocaleString()}`,
      );
      if (entity.updatedAt) {
        console.log(
          `${colors.cyan}Updated:${colors.reset} ${new Date(entity.updatedAt).toLocaleString()}`,
        );
      }

      console.log(`\n${colors.cyan}DATA:${colors.reset}`);
      console.log(JSON.stringify(entity.data, null, 2));

      // Display relationships
      console.log(`\n${colors.cyan}RELATIONSHIPS:${colors.reset}`);

      // Outgoing relations
      console.log(
        `${colors.green}→ Outgoing${colors.reset} (${outgoingResult.relations.length}):`,
      );
      if (outgoingResult.relations.length === 0) {
        console.log('  (none)');
      } else {
        for (const rel of outgoingResult.relations) {
          const rt = relationTypes.find(
            (t: any) => t.id === rel.relationTypeId,
          );
          const target = relatedEntities.find(
            (e: any) => e.id === rel.toEntityId,
          );
          const targetType = target
            ? typesResult.entityTypes.find(
                (t: any) => t.id === target.entityTypeId,
              )
            : null;

          let preview = '';
          if (target && target.data) {
            // Try to get a meaningful preview from the target entity
            const data = target.data;
            preview =
              data.name ||
              data.title ||
              data.username ||
              data.fullName ||
              data.email ||
              JSON.stringify(data).substring(0, 50);
          }

          console.log(
            `  └─ ${colors.yellow}${rt ? rt.name : rel.relationTypeId}${colors.reset} → ${targetType ? targetType.name : 'Entity'}: ${preview} ${colors.dim}(${rel.toEntityId.substring(0, 8)}...)${colors.reset}`,
          );

          if (rel.metadata && rel.metadata !== '{}') {
            console.log(
              `     ${colors.dim}metadata: ${rel.metadata}${colors.reset}`,
            );
          }
        }
      }

      // Incoming relations
      console.log(
        `\n${colors.blue}← Incoming${colors.reset} (${incomingResult.relations.length}):`,
      );
      if (incomingResult.relations.length === 0) {
        console.log('  (none)');
      } else {
        for (const rel of incomingResult.relations) {
          const rt = relationTypes.find(
            (t: any) => t.id === rel.relationTypeId,
          );
          const source = relatedEntities.find(
            (e: any) => e.id === rel.fromEntityId,
          );
          const sourceType = source
            ? typesResult.entityTypes.find(
                (t: any) => t.id === source.entityTypeId,
              )
            : null;

          let preview = '';
          if (source && source.data) {
            const data = source.data;
            preview =
              data.name ||
              data.title ||
              data.username ||
              data.fullName ||
              data.email ||
              JSON.stringify(data).substring(0, 50);
          }

          console.log(
            `  └─ ${sourceType ? sourceType.name : 'Entity'}: ${preview} ${colors.dim}(${rel.fromEntityId.substring(0, 8)}...)${colors.reset} ${colors.yellow}${rt ? rt.name : rel.relationTypeId}${colors.reset} →`,
          );

          if (rel.metadata && rel.metadata !== '{}') {
            console.log(
              `     ${colors.dim}metadata: ${rel.metadata}${colors.reset}`,
            );
          }
        }
      }

      console.log('\n' + '━'.repeat(50));
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Show entity hierarchy as a tree
  async tree(args: string[]) {
    if (args.length === 0) {
      console.error(
        `${colors.red}Usage: akashic tree <entity-id> [--depth <n>]${colors.reset}`,
      );
      process.exit(1);
    }

    const partialId = args[0];

    // Resolve partial ID to full ID
    const rootId = await schemaHelper.resolveEntityId(partialId);
    if (!rootId) {
      console.error(
        `${colors.red}Entity not found matching: ${partialId}${colors.reset}`,
      );
      process.exit(1);
    }
    let maxDepth = 3; // Default depth

    // Parse depth option
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--depth' && args[i + 1]) {
        maxDepth = parseInt(args[i + 1]);
        if (isNaN(maxDepth) || maxDepth < 1) {
          console.error(`${colors.red}Invalid depth value${colors.reset}`);
          process.exit(1);
        }
      }
    }

    try {
      // Fetch all entities and relations for tree building
      const entitiesQuery = `
        query GetAllEntities {
          entities {
            id
            entityTypeId
            data
          }
        }
      `;

      const relationsQuery = `
        query GetAllRelations {
          relations {
            id
            relationTypeId
            fromEntityId
            toEntityId
          }
        }
      `;

      const typesQuery = `
        query GetAllTypes {
          entityTypes {
            id
            name
          }
          relationTypes {
            id
            name
          }
        }
      `;

      const [entitiesResult, relationsResult, typesResult] = await Promise.all([
        schemaHelper.graphqlRequest(entitiesQuery, {}),
        schemaHelper.graphqlRequest(relationsQuery, {}),
        schemaHelper.graphqlRequest(typesQuery, {}),
      ]);

      // Build maps for quick lookup
      const entityMap = new Map(
        entitiesResult.entities.map((e: any) => [e.id, e]),
      );
      const entityTypeMap = new Map(
        typesResult.entityTypes.map((t: any) => [t.id, t.name]),
      );
      const relationTypeMap = new Map(
        typesResult.relationTypes.map((t: any) => [t.id, t.name]),
      );

      // Check if root entity exists
      const rootEntity = entityMap.get(rootId);
      if (!rootEntity) {
        console.error(
          `${colors.red}Entity not found: ${rootId}${colors.reset}`,
        );
        process.exit(1);
      }

      // Build adjacency lists for outgoing relations
      const outgoingRelations = new Map<string, any[]>();
      for (const rel of relationsResult.relations) {
        if (!outgoingRelations.has(rel.fromEntityId)) {
          outgoingRelations.set(rel.fromEntityId, []);
        }
        outgoingRelations.get(rel.fromEntityId)!.push(rel);
      }

      // Helper function to get entity preview
      const getEntityPreview = (entity: any): string => {
        const data = entity.data;
        const typeName = entityTypeMap.get(entity.entityTypeId) || 'Entity';

        // Try to find a good display field
        let preview = '';
        if (data) {
          preview =
            data.name ||
            data.title ||
            data.username ||
            data.fullName ||
            data.email ||
            (typeof data === 'string'
              ? data
              : JSON.stringify(data).substring(0, 30));
        }

        return `${colors.cyan}[${typeName}]${colors.reset} ${preview}`;
      };

      // Recursive tree printing function
      const printTree = (
        entityId: string,
        depth: number,
        prefix: string,
        isLast: boolean,
        visited: Set<string>,
      ) => {
        if (depth > maxDepth) return;
        if (visited.has(entityId)) {
          console.log(
            `${prefix}${isLast ? '└─' : '├─'} ${colors.dim}[circular reference]${colors.reset}`,
          );
          return;
        }

        visited.add(entityId);
        const entity = entityMap.get(entityId);

        if (!entity) {
          console.log(
            `${prefix}${isLast ? '└─' : '├─'} ${colors.red}[entity not found]${colors.reset}`,
          );
          return;
        }

        // Print current entity
        const preview = getEntityPreview(entity);
        const idShort = entityId.substring(0, 8);

        if (depth === 0) {
          // Root node
          console.log(
            `${colors.bright}${preview}${colors.reset} ${colors.dim}(${idShort}...)${colors.reset}`,
          );
        } else {
          console.log(
            `${prefix}${isLast ? '└─' : '├─'} ${preview} ${colors.dim}(${idShort}...)${colors.reset}`,
          );
        }

        // Get outgoing relations
        const relations = outgoingRelations.get(entityId) || [];

        if (relations.length > 0 && depth < maxDepth) {
          // Group relations by type
          const byType = new Map<string, any[]>();
          for (const rel of relations) {
            const typeName =
              relationTypeMap.get(rel.relationTypeId) || rel.relationTypeId;
            if (!byType.has(typeName)) {
              byType.set(typeName, []);
            }
            byType.get(typeName)!.push(rel);
          }

          // Print children grouped by relation type
          const typeEntries = Array.from(byType.entries());
          typeEntries.forEach(([relType, rels], typeIndex) => {
            const isLastType = typeIndex === typeEntries.length - 1;
            const typePrefix =
              prefix + (depth === 0 ? '' : isLast ? '    ' : '│   ');

            // Print relation type
            console.log(
              `${typePrefix}${isLastType ? '└─' : '├─'} ${colors.yellow}${relType}${colors.reset}:`,
            );

            // Print related entities
            rels.forEach((rel, relIndex) => {
              const isLastRel = relIndex === rels.length - 1;
              const relPrefix = typePrefix + (isLastType ? '    ' : '│   ');

              printTree(
                rel.toEntityId,
                depth + 1,
                relPrefix,
                isLastRel,
                new Set(visited),
              );
            });
          });
        }
      };

      // Print the tree
      console.log('\n' + '═'.repeat(50));
      console.log(
        `${colors.bright}ENTITY TREE${colors.reset} (max depth: ${maxDepth})`,
      );
      console.log('═'.repeat(50) + '\n');

      printTree(rootId, 0, '', true, new Set());

      console.log('\n' + '═'.repeat(50));
      console.log(
        `${colors.dim}Use --depth <n> to control tree depth${colors.reset}`,
      );
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Advanced query builder for complex searches
  async query(args: string[]) {
    console.log(`\n${colors.cyan}Query Builder${colors.reset}\n`);

    // Interactive query building
    const queryParts: any = await inquirer.prompt([
      {
        type: 'list',
        name: 'entityType',
        message: 'Select entity type to query:',
        choices: async () => {
          const types = await schemaHelper.fetchAllEntityTypes();
          return [
            { name: 'All types', value: null },
            ...types.map((t: any) => ({
              name: `${t.name} (${t.namespace})`,
              value: t.id,
            })),
          ];
        },
      },
      {
        type: 'input',
        name: 'namespace',
        message: 'Namespace (leave empty for all):',
        default: '',
      },
    ]);

    // Build filter conditions
    const conditions: Array<{ field: string; operator: string; value: any }> =
      [];
    let addMore = true;

    while (addMore) {
      const addCondition = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'add',
          message:
            conditions.length === 0
              ? 'Add filter condition?'
              : 'Add another filter condition?',
          default: conditions.length === 0,
        },
      ]);

      if (!addCondition.add) {
        addMore = false;
        continue;
      }

      const condition = await inquirer.prompt([
        {
          type: 'input',
          name: 'field',
          message: 'Field name:',
          validate: (input) => input.length > 0 || 'Field name is required',
        },
        {
          type: 'list',
          name: 'operator',
          message: 'Operator:',
          choices: [
            { name: 'equals', value: 'eq' },
            { name: 'not equals', value: 'ne' },
            { name: 'contains', value: 'contains' },
            { name: 'starts with', value: 'startsWith' },
            { name: 'ends with', value: 'endsWith' },
            { name: 'greater than', value: 'gt' },
            { name: 'less than', value: 'lt' },
            { name: 'is null', value: 'isNull' },
            { name: 'is not null', value: 'isNotNull' },
          ],
        },
        {
          type: 'input',
          name: 'value',
          message: 'Value:',
          when: (answers) =>
            !['isNull', 'isNotNull'].includes(answers.operator),
        },
      ]);

      conditions.push({
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
      });
    }

    // Sorting options
    const sortOptions = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addSort',
        message: 'Add sorting?',
        default: false,
      },
      {
        type: 'input',
        name: 'sortField',
        message: 'Sort by field:',
        when: (answers) => answers.addSort,
      },
      {
        type: 'list',
        name: 'sortOrder',
        message: 'Sort order:',
        choices: ['ascending', 'descending'],
        when: (answers) => answers.addSort,
      },
    ]);

    // Limit results
    const limitOptions = await inquirer.prompt([
      {
        type: 'number',
        name: 'limit',
        message: 'Limit results (0 for all):',
        default: 0,
      },
    ]);

    try {
      // Fetch entities
      const query = `
        query GetEntities($namespace: String, $entityTypeId: String) {
          entities(namespace: $namespace, entityTypeId: $entityTypeId) {
            id
            namespace
            entityTypeId
            data
            createdAt
            updatedAt
          }
        }
      `;

      const variables: any = {};
      if (queryParts.namespace) {
        variables.namespace = queryParts.namespace;
      }
      if (queryParts.entityType) {
        variables.entityTypeId = queryParts.entityType;
      }

      const result = await schemaHelper.graphqlRequest(query, variables);

      // Apply client-side filtering
      let filtered = result.entities;

      for (const condition of conditions) {
        filtered = filtered.filter((entity: any) => {
          const value = entity.data?.[condition.field];

          switch (condition.operator) {
            case 'eq':
              return value == condition.value;
            case 'ne':
              return value != condition.value;
            case 'contains':
              return String(value)
                .toLowerCase()
                .includes(String(condition.value).toLowerCase());
            case 'startsWith':
              return String(value)
                .toLowerCase()
                .startsWith(String(condition.value).toLowerCase());
            case 'endsWith':
              return String(value)
                .toLowerCase()
                .endsWith(String(condition.value).toLowerCase());
            case 'gt':
              return value > condition.value;
            case 'lt':
              return value < condition.value;
            case 'isNull':
              return value == null;
            case 'isNotNull':
              return value != null;
            default:
              return true;
          }
        });
      }

      // Apply sorting
      if (sortOptions.addSort && sortOptions.sortField) {
        filtered.sort((a: any, b: any) => {
          const aVal = a.data?.[sortOptions.sortField];
          const bVal = b.data?.[sortOptions.sortField];

          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;

          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return sortOptions.sortOrder === 'descending'
            ? -comparison
            : comparison;
        });
      }

      // Apply limit
      if (limitOptions.limit > 0) {
        filtered = filtered.slice(0, limitOptions.limit);
      }

      // Get entity type information
      const typesQuery = `
        query GetEntityTypes {
          entityTypes {
            id
            name
            namespace
          }
        }
      `;

      const typesResult = await schemaHelper.graphqlRequest(typesQuery, {});
      const typeMap = new Map(
        typesResult.entityTypes.map((t: any) => [t.id, t]),
      );

      // Display results
      console.log(
        `\n${colors.green}Query Results: ${filtered.length} entities${colors.reset}\n`,
      );

      if (filtered.length === 0) {
        console.log('No entities match your query criteria.');
        return;
      }

      // Group by type
      const byType = new Map<string, any[]>();
      for (const entity of filtered) {
        const typeId = entity.entityTypeId;
        if (!byType.has(typeId)) {
          byType.set(typeId, []);
        }
        byType.get(typeId)!.push(entity);
      }

      // Display grouped results
      for (const [typeId, entities] of byType) {
        const type = typeMap.get(typeId);
        console.log(
          `${colors.cyan}${type ? (type as any).name : 'Unknown Type'}:${colors.reset}`,
        );

        for (const entity of entities.slice(0, 10)) {
          // Build a preview
          let preview = '';
          const data = entity.data;

          // Show filtered fields first
          for (const condition of conditions) {
            if (data[condition.field] !== undefined) {
              preview += `${condition.field}: ${colors.yellow}${data[condition.field]}${colors.reset}, `;
            }
          }

          // Add other identifying fields
          const identifiers = ['name', 'title', 'username', 'email'];
          for (const field of identifiers) {
            if (!conditions.some((c) => c.field === field) && data[field]) {
              preview += `${field}: ${data[field]}, `;
              break;
            }
          }

          if (preview.endsWith(', ')) {
            preview = preview.slice(0, -2);
          }

          console.log(`  • ${entity.id.substring(0, 8)}... ${preview}`);
        }

        if (entities.length > 10) {
          console.log(`  ... and ${entities.length - 10} more`);
        }
        console.log();
      }

      // Export option
      const exportOption = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'export',
          message: 'Export results to JSON file?',
          default: false,
        },
        {
          type: 'input',
          name: 'filename',
          message: 'Filename:',
          default: 'query-results.json',
          when: (answers) => answers.export,
        },
      ]);

      if (exportOption.export) {
        const fs = await import('fs');
        fs.writeFileSync(
          exportOption.filename,
          JSON.stringify(filtered, null, 2),
        );
        console.log(
          `${colors.green}✅ Results exported to ${exportOption.filename}${colors.reset}`,
        );
      }
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Show entity type structure and schema
  async showType(args: string[]) {
    if (args.length === 0) {
      console.error(
        `${colors.red}Usage: akashic show-type <type-name-or-id>${colors.reset}`,
      );
      process.exit(1);
    }

    const typeNameOrId = args[0];

    try {
      // Resolve type ID if needed
      const typeId = schemaHelper.resolveTypeId(typeNameOrId);

      // Fetch the entity type with full details
      const query = `
        query GetEntityType {
          entityTypes {
            id
            name
            namespace
            version
            schemaJson
            createdAt
          }
        }
      `;

      const result = await schemaHelper.graphqlRequest(query, {});
      const entityType = result.entityTypes.find(
        (t: any) =>
          t.id === typeId ||
          t.name.toLowerCase() === typeNameOrId.toLowerCase(),
      );

      if (!entityType) {
        console.error(
          `${colors.red}Entity type not found: ${typeNameOrId}${colors.reset}`,
        );
        process.exit(1);
      }

      // Display header
      console.log('\n' + '═'.repeat(60));
      console.log(
        `${colors.bright}ENTITY TYPE: ${entityType.name}${colors.reset}`,
      );
      console.log('═'.repeat(60));

      // Basic info
      console.log(`\n${colors.cyan}METADATA:${colors.reset}`);
      console.log(`  ID:        ${entityType.id}`);
      console.log(`  Name:      ${entityType.name}`);
      console.log(`  Namespace: ${entityType.namespace}`);
      console.log(`  Version:   ${entityType.version}`);
      console.log(
        `  Created:   ${new Date(entityType.createdAt).toLocaleString()}`,
      );

      // Check for alias
      const config = schemaHelper.loadConfig();
      const alias = Object.entries(config.typeAliases).find(
        ([_, id]) => id === entityType.id,
      )?.[0];
      if (alias) {
        console.log(`  Alias:     ${colors.blue}${alias}${colors.reset}`);
      }

      // Parse and display schema structure
      const schema = entityType.schemaJson;
      const fields = schemaHelper.parseSchema(schema);

      console.log(`\n${colors.cyan}SCHEMA STRUCTURE:${colors.reset}`);
      console.log(`  Type: ${schema.type || 'object'}`);
      console.log(
        `  Additional Properties: ${schema.additionalProperties === false ? 'Not allowed' : 'Allowed'}`,
      );

      if (schema.required && schema.required.length > 0) {
        console.log(`  Required Fields: ${schema.required.join(', ')}`);
      }

      // Display fields
      console.log(`\n${colors.cyan}FIELDS (${fields.length}):${colors.reset}`);

      for (const field of fields) {
        const required = field.required ? `${colors.red}*${colors.reset}` : ' ';
        console.log(
          `\n  ${required} ${colors.green}${field.name}${colors.reset}`,
        );
        console.log(`      Type: ${field.type}`);

        if (field.description) {
          console.log(`      Description: ${field.description}`);
        }

        // Display constraints
        const constraints: string[] = [];

        if (field.enum) {
          constraints.push(`enum: [${field.enum.join(', ')}]`);
        }
        if (field.format) {
          constraints.push(`format: ${field.format}`);
        }
        if (field.minLength !== undefined) {
          constraints.push(`minLength: ${field.minLength}`);
        }
        if (field.maxLength !== undefined) {
          constraints.push(`maxLength: ${field.maxLength}`);
        }
        if (field.minimum !== undefined) {
          constraints.push(`min: ${field.minimum}`);
        }
        if (field.maximum !== undefined) {
          constraints.push(`max: ${field.maximum}`);
        }
        if (field.default !== undefined) {
          constraints.push(`default: ${JSON.stringify(field.default)}`);
        }

        if (constraints.length > 0) {
          console.log(`      Constraints: ${constraints.join(', ')}`);
        }

        // For array types, show item details
        if (field.type === 'array' && field.items) {
          console.log(`      Items: ${JSON.stringify(field.items)}`);
        }
      }

      // Show raw JSON schema if verbose flag
      if (args.includes('--json')) {
        console.log(`\n${colors.cyan}RAW JSON SCHEMA:${colors.reset}`);
        console.log(JSON.stringify(schema, null, 2));
      }

      // Count entities of this type
      const entitiesQuery = `
        query CountEntities($entityTypeId: String) {
          entities(entityTypeId: $entityTypeId) {
            id
          }
        }
      `;

      const entitiesResult = await schemaHelper.graphqlRequest(entitiesQuery, {
        entityTypeId: entityType.id,
      });

      console.log(`\n${colors.cyan}USAGE:${colors.reset}`);
      console.log(`  Entity Count: ${entitiesResult.entities.length}`);

      // Show relation types that use this entity type
      const relTypesQuery = `
        query GetRelationTypes {
          relationTypes {
            id
            name
            fromEntityTypeId
            toEntityTypeId
            cardinality
          }
        }
      `;

      const relTypesResult = await schemaHelper.graphqlRequest(
        relTypesQuery,
        {},
      );
      const relatedRelTypes = relTypesResult.relationTypes.filter(
        (rt: any) =>
          rt.fromEntityTypeId === entityType.id ||
          rt.toEntityTypeId === entityType.id,
      );

      if (relatedRelTypes.length > 0) {
        console.log(`\n${colors.cyan}RELATION TYPES:${colors.reset}`);
        for (const rt of relatedRelTypes) {
          const direction = rt.fromEntityTypeId === entityType.id ? '→' : '←';
          const otherTypeId =
            rt.fromEntityTypeId === entityType.id
              ? rt.toEntityTypeId
              : rt.fromEntityTypeId;
          const otherType = result.entityTypes.find(
            (t: any) => t.id === otherTypeId,
          );
          const otherTypeName = otherType ? otherType.name : 'Unknown';

          console.log(
            `  ${direction} ${colors.yellow}${rt.name}${colors.reset} ${direction === '→' ? 'to' : 'from'} ${otherTypeName} (${rt.cardinality})`,
          );
        }
      }

      console.log('\n' + '═'.repeat(60));
      console.log(
        `${colors.dim}Use --json flag to see raw JSON schema${colors.reset}`,
      );
    } catch (error: any) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  },

  // Health check command
  async health(args: string[]) {
    console.log(
      `\n🏥 ${colors.bright}Akashic Core Health Check${colors.reset}`,
    );
    console.log('═'.repeat(50) + '\n');

    const healthChecker = new HealthChecker();

    // Parse command line options
    let options: any = {};
    let exportPath: string | undefined;
    let autoFix = false;
    let safeOnly = true;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--category' && args[i + 1]) {
        options.category = args[i + 1];
        i++;
      } else if (args[i] === '--severity' && args[i + 1]) {
        options.severity = args[i + 1];
        i++;
      } else if (args[i] === '--export' && args[i + 1]) {
        exportPath = args[i + 1];
        i++;
      } else if (args[i] === '--fix') {
        autoFix = true;
      } else if (args[i] === '--fix-all') {
        autoFix = true;
        safeOnly = false;
      } else if (args[i] === '--help') {
        console.log(`Usage: akashic health [options]

Options:
  --category <name>   Filter by category (orphans, schema, relations, quality, optimization)
  --severity <level>  Filter by severity (critical, warning, info)
  --export <file>     Export results to JSON file
  --fix              Apply safe auto-fixes
  --fix-all          Apply all auto-fixes (including dangerous ones)
  --help             Show this help message`);
        return;
      }
    }

    // Run health checks
    console.log('Running health checks...');
    const results = await healthChecker.runAllChecks(options);

    // Calculate summary statistics
    const summary = {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      critical: results.filter((r) => r.severity === 'critical' && !r.passed)
        .length,
      warning: results.filter((r) => r.severity === 'warning' && !r.passed)
        .length,
      info: results.filter((r) => r.severity === 'info' && !r.passed).length,
      totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
    };

    // Display progress bar
    const progressBar = (current: number, total: number) => {
      const width = 30;
      const progress = Math.round((current / total) * width);
      const bar = '█'.repeat(progress) + '░'.repeat(width - progress);
      return `[${bar}] ${Math.round((current / total) * 100)}%`;
    };

    console.log(progressBar(results.length, results.length) + '\n');

    // Display summary
    console.log(`${colors.cyan}SUMMARY:${colors.reset}`);
    console.log(`  Total checks: ${summary.total}`);
    console.log(`  ${colors.green}✅ Passed: ${summary.passed}${colors.reset}`);

    if (summary.critical > 0) {
      console.log(
        `  ${colors.red}🔴 Critical: ${summary.critical} issues${colors.reset}`,
      );
    }
    if (summary.warning > 0) {
      console.log(
        `  ${colors.yellow}🟡 Warning: ${summary.warning} issues${colors.reset}`,
      );
    }
    if (summary.info > 0) {
      console.log(
        `  ${colors.blue}🔵 Info: ${summary.info} suggestions${colors.reset}`,
      );
    }

    console.log(`  Total issues found: ${summary.totalIssues}\n`);

    // Display detailed results by severity
    const severityOrder = ['critical', 'warning', 'info'];
    const severityIcons = {
      critical: '🔴',
      warning: '🟡',
      info: '🔵',
    };

    for (const severity of severityOrder) {
      const severityResults = results.filter(
        (r) => r.severity === severity && !r.passed,
      );

      if (severityResults.length === 0) continue;

      const severityColor =
        severity === 'critical'
          ? colors.red
          : severity === 'warning'
            ? colors.yellow
            : colors.blue;

      console.log(
        `${severityColor}${(severity as keyof typeof severityIcons) in severityIcons ? severityIcons[severity as keyof typeof severityIcons] : ''}  ${severity.toUpperCase()} ISSUES:${colors.reset}`,
      );

      for (const result of severityResults) {
        console.log(
          `\n  ${colors.bright}${result.displayName}${colors.reset} (${result.issues.length} issues)`,
        );
        console.log(`  ${colors.dim}${result.checkName}${colors.reset}`);

        // Show first 5 issues
        const issuesToShow = result.issues.slice(0, 5);
        for (const issue of issuesToShow) {
          let identifier = '';
          if (issue.entityId) {
            identifier = `Entity ${issue.entityId.substring(0, 8)}...`;
          } else if (issue.relationId) {
            identifier = `Relation ${issue.relationId.substring(0, 8)}...`;
          } else if (issue.typeId) {
            identifier = `Type ${issue.typeId.substring(0, 8)}...`;
          }

          console.log(`    • ${identifier}: ${issue.description}`);

          if (issue.details) {
            const detailStr = JSON.stringify(issue.details, null, 2)
              .split('\n')
              .map((line) => `      ${line}`)
              .join('\n');
            if (args.includes('--verbose')) {
              console.log(`${colors.dim}${detailStr}${colors.reset}`);
            }
          }
        }

        if (result.issues.length > 5) {
          console.log(`    ... and ${result.issues.length - 5} more`);
        }

        if (result.autoFixAvailable) {
          const riskColor =
            result.autoFixRisk === 'safe'
              ? colors.green
              : result.autoFixRisk === 'moderate'
                ? colors.yellow
                : colors.red;
          console.log(
            `    ${colors.dim}[Auto-fix available: ${riskColor}${result.autoFixRisk}${colors.reset}${colors.dim}]${colors.reset}`,
          );
        }
      }
      console.log();
    }

    // Export results if requested
    if (exportPath) {
      const exportData = {
        timestamp: new Date().toISOString(),
        summary,
        results: results.map((r) => ({
          ...r,
          issues: r.issues,
        })),
      };

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
      console.log(
        `${colors.green}✅ Results exported to ${exportPath}${colors.reset}\n`,
      );
    }

    // Apply auto-fixes if requested
    if (autoFix && summary.totalIssues > 0) {
      const fixableResults = results.filter(
        (r) => r.autoFixAvailable && r.issues.length > 0,
      );

      if (fixableResults.length === 0) {
        console.log('No auto-fixable issues found.\n');
      } else {
        console.log(`${colors.cyan}AUTO-FIX OPTIONS:${colors.reset}`);

        const safeFixCount = fixableResults.filter(
          (r) => r.autoFixRisk === 'safe',
        ).length;
        const moderateFixCount = fixableResults.filter(
          (r) => r.autoFixRisk === 'moderate',
        ).length;
        const dangerousFixCount = fixableResults.filter(
          (r) => r.autoFixRisk === 'dangerous',
        ).length;

        console.log(
          `  ${colors.green}Safe fixes: ${safeFixCount}${colors.reset}`,
        );
        console.log(
          `  ${colors.yellow}Moderate risk fixes: ${moderateFixCount}${colors.reset}`,
        );
        console.log(
          `  ${colors.red}Dangerous fixes: ${dangerousFixCount}${colors.reset}\n`,
        );

        let proceedWithFixes = false;

        if (safeOnly) {
          const answer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: `Apply ${safeFixCount} safe fixes?`,
              default: true,
            },
          ]);
          proceedWithFixes = answer.proceed;
        } else {
          console.log(
            `${colors.red}⚠️  WARNING: You are about to apply ALL fixes, including dangerous ones!${colors.reset}`,
          );
          const answer = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: `Apply ALL ${fixableResults.length} fixes (including dangerous)?`,
              default: false,
            },
          ]);
          proceedWithFixes = answer.proceed;
        }

        if (proceedWithFixes) {
          console.log('\nApplying fixes...');
          const fixes = await healthChecker.applyFixes(
            fixableResults,
            safeOnly,
          );

          console.log(`${colors.green}✅ Fixes applied:${colors.reset}`);
          for (const [checkName, fixData] of fixes) {
            console.log(`  ${checkName}: ${fixData.count} items fixed`);
          }
          console.log();
        }
      }
    }

    // Recommendations
    if (summary.totalIssues > 0) {
      console.log(`${colors.cyan}RECOMMENDATIONS:${colors.reset}`);

      if (summary.critical > 0) {
        console.log(
          `  ${colors.red}• Address critical issues immediately${colors.reset}`,
        );
      }
      if (
        results.some((r) => r.checkName === 'orphaned-entities' && !r.passed)
      ) {
        console.log(`  • Review and clean up orphaned entities`);
      }
      if (
        results.some(
          (r) => r.checkName === 'schema-validation-failures' && !r.passed,
        )
      ) {
        console.log(`  • Update entities to match current schemas`);
      }
      if (
        results.some((r) => r.checkName === 'duplicate-entities' && !r.passed)
      ) {
        console.log(`  • Consider merging duplicate entities`);
      }

      console.log(
        `\n${colors.dim}Run 'akashic health --export report.json' for detailed analysis${colors.reset}`,
      );
    } else {
      console.log(
        `${colors.green}🎉 All health checks passed! Your data is clean.${colors.reset}`,
      );
    }

    console.log('\n' + '═'.repeat(50));
  },

  // List all relation types
  async listRelationTypes(args: string[]) {
    let namespace: string | undefined;

    // Check for namespace flag
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--namespace' && args[i + 1]) {
        namespace = args[i + 1];
        break;
      }
    }

    try {
      const query = `
        query GetRelationTypes($namespace: String) {
          relationTypes(namespace: $namespace) {
            id
            name
            namespace
            fromEntityTypeId
            toEntityTypeId
            cardinality
          }
        }
      `;

      const result = await schemaHelper.graphqlRequest(query, { namespace });

      if (result.relationTypes.length === 0) {
        console.log('No relation types found.');
        return;
      }

      console.log(`\n${colors.cyan}Relation Types:${colors.reset}\n`);

      for (const rt of result.relationTypes) {
        console.log(
          `${colors.green}${rt.name}${colors.reset} (${rt.namespace})`,
        );
        console.log(`  Cardinality: ${rt.cardinality}`);
        console.log(`  From: ${rt.fromEntityTypeId}`);
        console.log(`  To: ${rt.toEntityTypeId}`);
        console.log(`  ID: ${rt.id}`);
        console.log();
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

${colors.cyan}Commands - Entity Management:${colors.reset}
  ${colors.green}create [type]${colors.reset}            Create entity (interactive if no type)
  ${colors.green}list <type>${colors.reset}              List entities of a type
  ${colors.green}update <type> <id>${colors.reset}       Update an entity
  ${colors.green}show <id>${colors.reset}                Show entity details with relationships
  ${colors.green}search [field=value]${colors.reset}     Search entities by field values
  ${colors.green}tree <id>${colors.reset}                Display entity hierarchy as tree
  ${colors.green}query${colors.reset}                    Advanced query builder (interactive)
  ${colors.green}health${colors.reset}                   Check data integrity and consistency
  
${colors.cyan}Commands - Type Management:${colors.reset}
  ${colors.green}types${colors.reset}                    List all entity types and aliases
  ${colors.green}show-type <type>${colors.reset}         Show entity type structure and schema
  ${colors.green}create-type${colors.reset}              Create a new entity type (schema)
  ${colors.green}register <name> <uuid>${colors.reset}  Register a type alias
  
${colors.cyan}Commands - Relationship Management:${colors.reset}
  ${colors.green}create-relation-type${colors.reset}     Define a new relation type
  ${colors.green}list-relation-types${colors.reset}      List all relation types
  ${colors.green}link${colors.reset}                     Create a relation between entities
  ${colors.green}unlink <id>${colors.reset}              Delete a relation
  ${colors.green}list-relations${colors.reset}           List relations (use --from, --to, --type)
  
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
  
  # Search for entities
  akashic search status=todo
  akashic search title="Fix" --type Task
  akashic search username=bob

${colors.cyan}Environment Variables:${colors.reset}
  AKASHIC_API_URL      API endpoint (default: http://localhost:3000/graphql)
  AKASHIC_NAMESPACE    Default namespace (default: "default")
`);
  },

  // Search entities - moved to commands.search
  async searchEntities_removed(args: string[]) {
    const parseArgs = () => {
      const options: any = {
        filter: {},
      };

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--type' && args[i + 1]) {
          options.filter.entityTypeId = schemaHelper.resolveTypeId(args[i + 1]);
          i++;
        } else if (args[i] === '--namespace' && args[i + 1]) {
          options.filter.namespace = args[i + 1];
          i++;
        } else if (args[i] === '--query' && args[i + 1]) {
          // Parse JSON query
          try {
            const query = args[i + 1];
            // Support simple key=value or JSON format
            if (query.startsWith('{')) {
              options.filter.data = JSON.parse(query);
            } else {
              // Parse simple format like "name=John"
              const [key, value] = query.split('=');
              if (key && value) {
                options.filter.data = { [key]: value };
              }
            }
          } catch (e) {
            console.error(`Invalid query format: ${args[i + 1]}`);
          }
          i++;
        } else if (args[i] === '--filter' && args[i + 1]) {
          // Full JSON filter
          try {
            const filterJson = JSON.parse(args[i + 1]);
            options.filter = { ...options.filter, ...filterJson };
          } catch (e) {
            console.error(`Invalid filter JSON: ${args[i + 1]}`);
          }
          i++;
        } else if (args[i] === '--limit' && args[i + 1]) {
          options.filter.limit = parseInt(args[i + 1]);
          i++;
        } else if (args[i] === '--offset' && args[i + 1]) {
          options.filter.offset = parseInt(args[i + 1]);
          i++;
        } else if (!args[i].startsWith('--')) {
          // Simple key=value format as positional argument
          const [key, value] = args[i].split('=');
          if (key && value) {
            if (!options.filter.data) options.filter.data = {};
            options.filter.data[key] = value;
          }
        }
      }

      // Set default limit if not specified
      if (!options.filter.limit) {
        options.filter.limit = 20;
      }

      return options;
    };

    const options = parseArgs();

    // Interactive mode if no filter provided
    if (Object.keys(options.filter).length === 1 && options.filter.limit === 20) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'namespace',
          message: 'Namespace (leave empty for all):',
        },
        {
          type: 'input',
          name: 'entityType',
          message: 'Entity type (name or ID, leave empty for all):',
        },
        {
          type: 'input',
          name: 'query',
          message: 'Data query (e.g., name=John or {"age": {"$gte": 18}}):',
        },
      ]);

      if (answers.namespace) {
        options.filter.namespace = answers.namespace;
      }
      if (answers.entityType) {
        options.filter.entityTypeId = schemaHelper.resolveTypeId(answers.entityType);
      }
      if (answers.query) {
        try {
          if (answers.query.startsWith('{')) {
            options.filter.data = JSON.parse(answers.query);
          } else {
            const [key, value] = answers.query.split('=');
            if (key && value) {
              options.filter.data = { [key]: value };
            }
          }
        } catch (e) {
          console.error('Invalid query format');
          return;
        }
      }
    }

    console.log(`\n${colors.cyan}Searching entities...${colors.reset}`);

    const query = `
      query SearchEntities($filter: EntityFilterInput!) {
        searchEntities(filter: $filter) {
          id
          namespace
          entityTypeId
          data
          createdAt
          updatedAt
        }
        countEntities(filter: $filter)
      }
    `;

    try {
      const result = await schemaHelper.graphqlRequest(query, { filter: options.filter });

      if (!result.searchEntities || result.searchEntities.length === 0) {
        console.log(`${colors.yellow}No entities found matching the query.${colors.reset}`);
        return;
      }

      const entities = result.searchEntities;
      const total = result.countEntities;

      console.log(`\n${colors.green}Found ${entities.length} of ${total} total matching entities:${colors.reset}\n`);

      // Get entity type names for display
      const typeIds = [...new Set(entities.map((e: any) => e.entityTypeId))];
      const typesQuery = `
        query GetTypes {
          entityTypes {
            id
            name
          }
        }
      `;
      const typesResult = await schemaHelper.graphqlRequest(typesQuery);
      const typeMap = new Map(typesResult.entityTypes.map((t: any) => [t.id, t.name]));

      // Display results
      entities.forEach((entity: any) => {
        const typeName = typeMap.get(entity.entityTypeId) || 'Unknown';
        console.log(`${colors.bright}[${typeName}] ${entity.id}${colors.reset}`);
        console.log(`  Namespace: ${entity.namespace}`);
        
        // Show first few fields of data
        const dataKeys = Object.keys(entity.data);
        const preview = dataKeys.slice(0, 3).reduce((acc: any, key) => {
          acc[key] = entity.data[key];
          return acc;
        }, {});
        
        console.log(`  Data: ${JSON.stringify(preview, null, 2).split('\n').join('\n  ')}`);
        if (dataKeys.length > 3) {
          console.log(`  ... and ${dataKeys.length - 3} more fields`);
        }
        console.log();
      });

      if (entities.length < total) {
        console.log(`${colors.dim}Showing ${entities.length} of ${total} results. Use --limit and --offset for pagination.${colors.reset}\n`);
      }

    } catch (error: any) {
      console.error(`${colors.red}Search failed:${colors.reset}`, error.message);
    }
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
    case 'show-type':
      await commands.showType(commandArgs);
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
    case 'show':
      await commands.show(commandArgs);
      break;
    case 'search':
      await commands.search(commandArgs);
      break;
    case 'tree':
      await commands.tree(commandArgs);
      break;
    case 'query':
      await commands.query(commandArgs);
      break;
    case 'health':
      await commands.health(commandArgs);
      break;
    case 'create-relation-type':
      await commands.createRelationType(commandArgs);
      break;
    case 'list-relation-types':
      await commands.listRelationTypes(commandArgs);
      break;
    case 'link':
      await commands.link(commandArgs);
      break;
    case 'unlink':
      await commands.unlink(commandArgs);
      break;
    case 'list-relations':
      await commands.listRelations(commandArgs);
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
