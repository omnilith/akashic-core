/**
 * Schema Helper Utilities
 * Handles fetching, caching, and parsing entity type schemas
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.akashic');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const SCHEMA_CACHE_DIR = path.join(CONFIG_DIR, 'schemas');

interface Config {
  apiUrl: string;
  defaultNamespace: string;
  typeAliases: Record<string, string>; // name -> uuid mapping
  schemaCache: Record<string, {
    schema: any;
    cachedAt: number;
    version: number;
  }>;
}

// Ensure config directory exists
export function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(SCHEMA_CACHE_DIR)) {
    fs.mkdirSync(SCHEMA_CACHE_DIR, { recursive: true });
  }
}

// Load or create config
export function loadConfig(): Config {
  ensureConfigDir();
  
  if (fs.existsSync(CONFIG_FILE)) {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  }
  
  const defaultConfig: Config = {
    apiUrl: process.env.AKASHIC_API_URL || 'http://localhost:3000/graphql',
    defaultNamespace: process.env.AKASHIC_NAMESPACE || 'default',
    typeAliases: {},
    schemaCache: {},
  };
  
  saveConfig(defaultConfig);
  return defaultConfig;
}

// Save config
export function saveConfig(config: Config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Register a type alias
export function registerTypeAlias(name: string, uuid: string) {
  const config = loadConfig();
  config.typeAliases[name.toLowerCase()] = uuid;
  saveConfig(config);
  console.log(`✅ Registered type alias: ${name} -> ${uuid}`);
}

// Get type UUID from name or return as-is if already UUID
export function resolveTypeId(nameOrId: string): string {
  const config = loadConfig();
  const lowercaseName = nameOrId.toLowerCase();
  
  // Check if it's an alias
  if (config.typeAliases[lowercaseName]) {
    return config.typeAliases[lowercaseName];
  }
  
  // Assume it's already a UUID
  return nameOrId;
}

// Smart entity ID resolution - supports partial matching
export async function resolveEntityId(partialId: string): Promise<string | null> {
  // If it's already a full UUID format, return as-is
  if (partialId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return partialId;
  }
  
  // Search for entities with ID starting with the partial
  const query = `
    query GetEntities {
      entities {
        id
        entityTypeId
        data
      }
    }
  `;
  
  const data = await graphqlRequest(query);
  const matches = data.entities.filter((e: any) => 
    e.id.toLowerCase().startsWith(partialId.toLowerCase())
  );
  
  if (matches.length === 0) {
    return null;
  }
  
  if (matches.length === 1) {
    return matches[0].id;
  }
  
  // Multiple matches - show them to the user
  console.log(`Multiple entities found matching "${partialId}":`);
  for (const entity of matches.slice(0, 10)) {
    const preview = entity.data?.name || entity.data?.title || 
                   entity.data?.username || JSON.stringify(entity.data).substring(0, 50);
    console.log(`  ${entity.id.substring(0, 12)}... ${preview}`);
  }
  
  if (matches.length > 10) {
    console.log(`  ... and ${matches.length - 10} more`);
  }
  
  throw new Error(`Ambiguous ID: ${matches.length} entities match "${partialId}". Please be more specific.`);
}

// GraphQL request helper
export async function graphqlRequest(query: string, variables: any = {}) {
  const config = loadConfig();
  
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// Fetch entity type with schema
export async function fetchEntityType(typeId: string) {
  const query = `
    query GetEntityTypes {
      entityTypes {
        id
        name
        namespace
        version
        schemaJson
      }
    }
  `;
  
  const data = await graphqlRequest(query);
  const entityType = data.entityTypes.find((et: any) => et.id === typeId);
  return entityType;
}

// Get schema (from cache or fetch)
export async function getSchema(typeNameOrId: string, forceRefresh = false) {
  const typeId = resolveTypeId(typeNameOrId);
  const config = loadConfig();
  
  // Check cache
  const cacheKey = typeId;
  const cached = config.schemaCache[cacheKey];
  const cacheAge = cached ? Date.now() - cached.cachedAt : Infinity;
  const cacheExpiry = 5 * 60 * 1000; // 5 minutes
  
  if (!forceRefresh && cached && cacheAge < cacheExpiry) {
    return cached.schema;
  }
  
  // Fetch fresh
  const entityType = await fetchEntityType(typeId);
  
  if (!entityType) {
    throw new Error(`Entity type not found: ${typeNameOrId}`);
  }
  
  // Update cache
  config.schemaCache[cacheKey] = {
    schema: entityType.schemaJson,
    cachedAt: Date.now(),
    version: entityType.version,
  };
  saveConfig(config);
  
  // Also save the schema to disk for offline access
  const schemaFile = path.join(SCHEMA_CACHE_DIR, `${typeId}.json`);
  fs.writeFileSync(schemaFile, JSON.stringify({
    id: entityType.id,
    name: entityType.name,
    namespace: entityType.namespace,
    version: entityType.version,
    schema: entityType.schemaJson,
  }, null, 2));
  
  return entityType.schemaJson;
}

// Parse schema to extract field information
export interface FieldInfo {
  name: string;
  type: string;
  required: boolean;
  enum?: string[];
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: any;
  description?: string;
  default?: any;
}

export function parseSchema(schema: any): FieldInfo[] {
  const fields: FieldInfo[] = [];
  const required = schema.required || [];
  
  if (schema.properties) {
    for (const [name, prop] of Object.entries(schema.properties)) {
      const fieldProp = prop as any;
      fields.push({
        name,
        type: fieldProp.type || 'string',
        required: required.includes(name),
        enum: fieldProp.enum,
        format: fieldProp.format,
        minLength: fieldProp.minLength,
        maxLength: fieldProp.maxLength,
        minimum: fieldProp.minimum,
        maximum: fieldProp.maximum,
        items: fieldProp.items,
        description: fieldProp.description,
        default: fieldProp.default,
      });
    }
  }
  
  // Sort: required fields first, then alphabetical
  fields.sort((a, b) => {
    if (a.required !== b.required) {
      return a.required ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
  
  return fields;
}

// List all registered type aliases
export function listTypeAliases() {
  const config = loadConfig();
  const aliases = Object.entries(config.typeAliases);
  
  if (aliases.length === 0) {
    console.log('No type aliases registered yet.');
    console.log('Use "akashic type register <name> <uuid>" to register one.');
    return;
  }
  
  console.log('Registered Type Aliases:');
  for (const [name, uuid] of aliases) {
    console.log(`  ${name} -> ${uuid}`);
  }
}

// Get all entity types from API
export async function fetchAllEntityTypes(namespace?: string) {
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
  return data.entityTypes;
}