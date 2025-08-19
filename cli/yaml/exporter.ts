/**
 * YAML Exporter for Ontology
 * Exports database ontology to YAML format
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as schemaHelper from '../schema-helper';
import { YamlOntology, YamlEntityType, YamlRelationType, YamlField } from './parser';

// Convert JSON Schema back to YAML field format
function schemaToYamlField(schema: any): YamlField | string {
  const field: YamlField = { type: schema.type };
  const parts: string[] = [schema.type];
  
  // Check for special patterns that map to our shortcuts
  if (schema.type === 'string' && schema.pattern) {
    // Check for email pattern
    if (schema.pattern.includes('@')) {
      return 'email';
    }
    // Check for URL pattern
    if (schema.pattern.includes('https?://')) {
      return 'url';
    }
    // Check for UUID pattern
    if (schema.pattern.includes('[0-9a-f]{8}-')) {
      return 'uuid';
    }
    // Check for date patterns
    if (schema.pattern.includes('\\d{4}-\\d{2}-\\d{2}T')) {
      return 'datetime';
    }
    if (schema.pattern === '^\\d{4}-\\d{2}-\\d{2}$') {
      return 'date';
    }
    field.pattern = schema.pattern;
  }
  
  // Check for text (large string)
  if (schema.type === 'string' && schema.maxLength && schema.maxLength > 1000) {
    parts[0] = 'text';
  }
  
  // Handle required (this is handled at parent level in JSON Schema)
  // We'll mark it when processing the parent
  
  // Handle unique
  if (schema.unique) {
    parts.push('unique');
  }
  
  // Handle enum
  if (schema.enum) {
    field.enum = schema.enum;
    // For simple enums, use shorthand
    if (schema.enum.length <= 4) {
      parts.push(`enum[${schema.enum.join('|')}]`);
      delete field.enum;
    }
  }
  
  // Handle numeric constraints
  if (schema.minimum !== undefined) {
    field.min = schema.minimum;
    parts.push(`min:${schema.minimum}`);
  }
  if (schema.maximum !== undefined) {
    field.max = schema.maximum;
    parts.push(`max:${schema.maximum}`);
  }
  
  // Handle string constraints
  if (schema.minLength !== undefined) {
    field.minLength = schema.minLength;
  }
  if (schema.maxLength !== undefined && schema.maxLength <= 1000) {
    field.maxLength = schema.maxLength;
  }
  
  // Handle default values
  if (schema.default !== undefined) {
    field.default = schema.default;
    // For simple defaults, use shorthand
    if (typeof schema.default === 'string' || typeof schema.default === 'number' || typeof schema.default === 'boolean') {
      parts.push(`default:${schema.default}`);
      delete field.default;
    }
  }
  
  // Handle references
  if (schema.$ref) {
    return `reference(${schema.$ref})`;
  }
  
  // Handle description
  if (schema.description) {
    field.description = schema.description;
  }
  
  // If we only have basic type info, return as string
  if (parts.length === 1 && Object.keys(field).length === 1) {
    return schema.type;
  }
  
  // If we can express as shorthand, do so
  if (parts.length > 1 && !field.description && !field.enum && !field.pattern) {
    return parts.join(', ');
  }
  
  // Otherwise return full field object
  return field;
}

// Convert JSON Schema to YAML EntityType
function schemaToYamlType(name: string, schema: any, namespace?: string): YamlEntityType {
  const yamlType: YamlEntityType = {
    fields: {}
  };
  
  if (namespace) {
    yamlType.namespace = namespace;
  }
  
  if (schema.description) {
    yamlType.description = schema.description;
  }
  
  // Process properties
  if (schema.properties) {
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      let yamlField = schemaToYamlField(fieldSchema as any);
      
      // Check if field is required
      if (schema.required && schema.required.includes(fieldName)) {
        if (typeof yamlField === 'string') {
          yamlField = yamlField + ', required';
        } else {
          yamlField.required = true;
        }
      }
      
      yamlType.fields[fieldName] = yamlField;
    }
  }
  
  return yamlType;
}

// Fetch and export ontology from database
export async function exportToYaml(options?: {
  namespace?: string;
  includeSystemNamespaces?: boolean;
  splitByNamespace?: boolean;
  outputDir?: string;
}): Promise<string | Map<string, string>> {
  // Fetch entity types
  const typesQuery = `
    query GetAllEntityTypes {
      entityTypes {
        id
        name
        namespace
        schemaJson
        version
      }
    }
  `;
  
  // Fetch relation types
  const relationsQuery = `
    query GetAllRelationTypes {
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
  
  const [typesResult, relationsResult] = await Promise.all([
    schemaHelper.graphqlRequest(typesQuery),
    schemaHelper.graphqlRequest(relationsQuery)
  ]);
  
  // Build type ID to name mapping
  const typeIdToName = new Map<string, { name: string; namespace: string }>();
  for (const type of typesResult.entityTypes) {
    typeIdToName.set(type.id, { name: type.name, namespace: type.namespace });
  }
  
  // Group by namespace
  const ontologiesByNamespace = new Map<string, YamlOntology>();
  
  // Process entity types
  for (const type of typesResult.entityTypes) {
    // Filter by namespace if specified
    if (options?.namespace && type.namespace !== options.namespace) {
      continue;
    }
    
    // Skip system namespaces unless requested
    if (!options?.includeSystemNamespaces && 
        (type.namespace.startsWith('system.') || type.namespace === 'global')) {
      continue;
    }
    
    let ontology = ontologiesByNamespace.get(type.namespace);
    if (!ontology) {
      ontology = {
        namespace: type.namespace,
        types: {},
        relations: []
      };
      ontologiesByNamespace.set(type.namespace, ontology);
    }
    
    const yamlType = schemaToYamlType(type.name, type.schemaJson);
    // Add namespace prefix if different from ontology namespace
    if (type.namespace !== type.namespace) {
      yamlType.namespace = type.namespace;
    }
    ontology.types![type.name] = yamlType;
  }
  
  // Process relation types - deduplicate by creating a unique key
  const seenRelations = new Set<string>();
  
  for (const relation of relationsResult.relationTypes) {
    // Filter by namespace if specified
    if (options?.namespace && relation.namespace !== options.namespace) {
      continue;
    }
    
    // Skip system namespaces unless requested
    if (!options?.includeSystemNamespaces && 
        (relation.namespace.startsWith('system.') || relation.namespace === 'global')) {
      continue;
    }
    
    // Resolve type names
    const fromType = typeIdToName.get(relation.fromEntityTypeId);
    const toType = typeIdToName.get(relation.toEntityTypeId);
    
    if (!fromType || !toType) {
      // Write warnings to stderr to avoid contaminating output
      if (process.stderr.isTTY) {
        console.error(`Warning: Could not resolve types for relation ${relation.name}`);
      }
      continue;
    }
    
    // Create unique key for deduplication
    const relationKey = `${relation.namespace}:${relation.name}:${fromType.name}:${toType.name}`;
    if (seenRelations.has(relationKey)) {
      continue; // Skip duplicate
    }
    seenRelations.add(relationKey);
    
    let ontology = ontologiesByNamespace.get(relation.namespace);
    if (!ontology) {
      ontology = {
        namespace: relation.namespace,
        types: {},
        relations: []
      };
      ontologiesByNamespace.set(relation.namespace, ontology);
    }
    
    const yamlRelation: YamlRelationType = {
      name: relation.name,
      from: fromType.name,
      to: toType.name,
      cardinality: relation.cardinality || 'n..n'
    };
    
    // Note: description field not available in current schema
    // if (relation.description) {
    //   yamlRelation.description = relation.description;
    // }
    
    ontology.relations!.push(yamlRelation);
  }
  
  // Generate YAML output
  if (options?.splitByNamespace) {
    const outputs = new Map<string, string>();
    
    for (const [namespace, ontology] of ontologiesByNamespace) {
      // Clean up empty arrays/objects
      if (ontology.types && Object.keys(ontology.types).length === 0) {
        delete ontology.types;
      }
      if (ontology.relations && ontology.relations.length === 0) {
        delete ontology.relations;
      }
      
      const yamlStr = yaml.dump(ontology, {
        indent: 2,
        lineWidth: 80,
        noRefs: true,
        sortKeys: false
      });
      
      outputs.set(namespace, yamlStr);
      
      // Write to files if output directory specified
      if (options.outputDir) {
        const filename = `${namespace.replace(/\./g, '-')}.yaml`;
        const filepath = path.join(options.outputDir, filename);
        fs.writeFileSync(filepath, yamlStr);
      }
    }
    
    return outputs;
  } else {
    // Merge all into single ontology
    const merged: YamlOntology = {
      types: {},
      relations: []
    };
    
    // Collect all unique namespaces
    const allNamespaces = new Set<string>();
    
    // Group types by namespace for better organization
    const typesByNamespace = new Map<string, Record<string, YamlEntityType>>();
    
    for (const [namespace, ontology] of ontologiesByNamespace) {
      allNamespaces.add(namespace);
      
      if (ontology.types && Object.keys(ontology.types).length > 0) {
        // If we have multiple namespaces, add namespace prefix to type names
        if (ontologiesByNamespace.size > 1 && namespace !== 'default') {
          for (const [typeName, typeData] of Object.entries(ontology.types)) {
            typeData.namespace = namespace;
            merged.types![typeName] = typeData;
          }
        } else {
          Object.assign(merged.types!, ontology.types);
        }
      }
      
      if (ontology.relations && ontology.relations.length > 0) {
        // Add namespace to relations when merging multiple namespaces
        if (ontologiesByNamespace.size > 1 && namespace !== 'default') {
          for (const relation of ontology.relations) {
            // Only add namespace if it's different from the default
            const relationWithNs = { ...relation, namespace };
            merged.relations!.push(relationWithNs);
          }
        } else {
          merged.relations!.push(...ontology.relations);
        }
      }
    }
    
    // Set namespace or namespaces
    if (allNamespaces.size === 1) {
      const singleNamespace = Array.from(allNamespaces)[0];
      if (singleNamespace !== 'default') {
        merged.namespace = singleNamespace;
      }
    } else if (allNamespaces.size > 1) {
      merged.namespaces = Array.from(allNamespaces).sort();
    }
    
    // Clean up empty arrays/objects
    if (merged.types && Object.keys(merged.types).length === 0) {
      delete merged.types;
    }
    if (merged.relations && merged.relations.length === 0) {
      delete merged.relations;
    }
    
    return yaml.dump(merged, {
      indent: 2,
      lineWidth: 80,
      noRefs: true,
      sortKeys: false
    });
  }
}