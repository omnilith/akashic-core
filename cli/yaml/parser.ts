/**
 * YAML Parser for Ontology Definitions
 * Parses YAML files into structured ontology format
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

// Types for parsed YAML structure
export interface YamlField {
  type: string;
  required?: boolean;
  unique?: boolean;
  default?: any;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  reference?: string;
  description?: string;
}

export interface YamlEntityType {
  namespace?: string;
  fields: Record<string, YamlField | string>;
  extends?: string;
  abstract?: boolean;
  description?: string;
}

export interface YamlRelationType {
  from: string;
  to: string;
  name: string;
  cardinality?: string;
  namespace?: string;
  description?: string;
}

export interface YamlOntology {
  namespace?: string;
  namespaces?: string[];
  imports?: string[];
  types?: Record<string, YamlEntityType>;
  relations?: YamlRelationType[];
  metadata?: Record<string, any>;
}

// Parse field shorthand notation
export function parseFieldShorthand(value: string | YamlField): YamlField {
  if (typeof value !== 'string') {
    return value;
  }

  // Parse shorthand like "string, required, unique"
  const parts = value.split(',').map(p => p.trim());
  const field: YamlField = { type: parts[0] };

  for (const part of parts.slice(1)) {
    if (part === 'required') {
      field.required = true;
    } else if (part === 'unique') {
      field.unique = true;
    } else if (part.startsWith('default:')) {
      field.default = part.substring(8).trim();
    } else if (part.startsWith('min:')) {
      field.min = parseInt(part.substring(4).trim());
    } else if (part.startsWith('max:')) {
      field.max = parseInt(part.substring(4).trim());
    } else if (part.startsWith('enum[')) {
      const enumStr = part.substring(5, part.length - 1);
      field.enum = enumStr.split('|').map(e => e.trim());
    } else if (part.startsWith('reference(')) {
      field.reference = part.substring(10, part.length - 1);
      field.type = 'string'; // References are stored as strings (UUIDs)
    }
  }

  // Handle special types
  if (field.type === 'text') {
    field.type = 'string';
    field.maxLength = field.maxLength || 65535;
  } else if (field.type === 'email') {
    field.type = 'string';
    field.pattern = '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$';
  } else if (field.type === 'url') {
    field.type = 'string';
    field.pattern = '^https?://.*';
  } else if (field.type === 'uuid') {
    field.type = 'string';
    field.pattern = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  } else if (field.type === 'datetime') {
    field.type = 'string';
    field.pattern = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}';
  } else if (field.type === 'date') {
    field.type = 'string';
    field.pattern = '^\\d{4}-\\d{2}-\\d{2}$';
  }

  return field;
}

// Convert parsed YAML to JSON Schema
export function convertToJsonSchema(yamlType: YamlEntityType): any {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [fieldName, fieldDef] of Object.entries(yamlType.fields)) {
    const field = parseFieldShorthand(fieldDef);
    
    const jsonField: any = {
      type: field.type
    };

    if (field.description) jsonField.description = field.description;
    if (field.default !== undefined) jsonField.default = field.default;
    if (field.min !== undefined) jsonField.minimum = field.min;
    if (field.max !== undefined) jsonField.maximum = field.max;
    if (field.minLength !== undefined) jsonField.minLength = field.minLength;
    if (field.maxLength !== undefined) jsonField.maxLength = field.maxLength;
    if (field.pattern) jsonField.pattern = field.pattern;
    if (field.enum) jsonField.enum = field.enum;
    if (field.unique) jsonField.unique = true;
    if (field.reference) jsonField.$ref = field.reference;

    if (field.required) {
      required.push(fieldName);
    }

    properties[fieldName] = jsonField;
  }

  const schema: any = {
    type: 'object',
    properties,
    additionalProperties: false
  };

  if (required.length > 0) {
    schema.required = required;
  }

  if (yamlType.description) {
    schema.description = yamlType.description;
  }

  return schema;
}

// Load and parse YAML file
export function loadYamlFile(filePath: string): YamlOntology {
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content) as YamlOntology;
}

// Load directory of YAML files
export function loadYamlDirectory(dirPath: string): YamlOntology {
  const merged: YamlOntology = {
    types: {},
    relations: [],
    namespaces: []
  };

  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort(); // Ensure consistent order

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const ontology = loadYamlFile(filePath);
    
    // Merge types
    if (ontology.types) {
      Object.assign(merged.types!, ontology.types);
    }

    // Merge relations
    if (ontology.relations) {
      merged.relations!.push(...ontology.relations);
    }

    // Merge namespaces
    if (ontology.namespaces) {
      for (const ns of ontology.namespaces) {
        if (!merged.namespaces!.includes(ns)) {
          merged.namespaces!.push(ns);
        }
      }
    }

    // Use first file's default namespace if not set
    if (!merged.namespace && ontology.namespace) {
      merged.namespace = ontology.namespace;
    }
  }

  return merged;
}

// Process imports
export async function processImports(
  ontology: YamlOntology, 
  basePath: string
): Promise<YamlOntology> {
  if (!ontology.imports || ontology.imports.length === 0) {
    return ontology;
  }

  const merged = { ...ontology };
  delete merged.imports;

  for (const importPath of ontology.imports) {
    const fullPath = path.resolve(basePath, importPath);
    const imported = loadYamlFile(fullPath);
    const processed = await processImports(imported, path.dirname(fullPath));

    // Merge imported content
    if (processed.types) {
      merged.types = { ...processed.types, ...merged.types };
    }
    if (processed.relations) {
      merged.relations = [...(processed.relations || []), ...(merged.relations || [])];
    }
    if (processed.namespaces) {
      merged.namespaces = [...new Set([...(processed.namespaces || []), ...(merged.namespaces || [])])];
    }
  }

  return merged;
}

// Validate ontology structure
export function validateOntology(ontology: YamlOntology): string[] {
  const errors: string[] = [];

  // Check for required fields
  if (!ontology.types && !ontology.relations) {
    errors.push('Ontology must define either types or relations');
  }

  // Validate types
  if (ontology.types) {
    for (const [typeName, typeDef] of Object.entries(ontology.types)) {
      if (!typeDef.fields || Object.keys(typeDef.fields).length === 0) {
        errors.push(`Type '${typeName}' must have at least one field`);
      }

      // Check for circular extends
      if (typeDef.extends && typeDef.extends === typeName) {
        errors.push(`Type '${typeName}' cannot extend itself`);
      }
    }
  }

  // Validate relations
  if (ontology.relations) {
    const typeNames = Object.keys(ontology.types || {});
    
    for (const relation of ontology.relations) {
      if (!relation.from) {
        errors.push('Relation missing "from" field');
      }
      if (!relation.to) {
        errors.push('Relation missing "to" field');
      }
      if (!relation.name) {
        errors.push('Relation missing "name" field');
      }

      // Validate cardinality format
      if (relation.cardinality && !relation.cardinality.match(/^(1|n)\.\.(1|n)$/)) {
        errors.push(`Invalid cardinality '${relation.cardinality}' for relation '${relation.name}'`);
      }
    }
  }

  return errors;
}

// Export parsed ontology for use in other modules
export async function parseOntology(
  source: string,
  options?: {
    validate?: boolean;
    processImports?: boolean;
  }
): Promise<{ ontology: YamlOntology; errors: string[] }> {
  let ontology: YamlOntology;
  
  // Check if source is a file or directory
  const stats = fs.statSync(source);
  if (stats.isDirectory()) {
    ontology = loadYamlDirectory(source);
  } else {
    ontology = loadYamlFile(source);
  }

  // Process imports if requested
  if (options?.processImports !== false) {
    const basePath = stats.isDirectory() ? source : path.dirname(source);
    ontology = await processImports(ontology, basePath);
  }

  // Validate if requested
  const errors = options?.validate !== false ? validateOntology(ontology) : [];

  return { ontology, errors };
}