/**
 * YAML Exporter for Ontology
 * Exports database ontology to YAML format
 */

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as schemaHelper from '../schema-helper';
import {
  YamlOntology,
  YamlEntityType,
  YamlRelationType,
  YamlField,
} from './parser';

// Convert JSON Schema back to YAML field format
function schemaToYamlField(schema: any): YamlField | string {
  const field: YamlField = { type: schema.type };

  // Check for special patterns that map to our shortcuts
  if (schema.type === 'string' && schema.pattern) {
    // Check for email pattern
    if (schema.pattern.includes('@')) {
      return { type: 'email' };
    }
    // Check for URL pattern
    if (schema.pattern.includes('https?://')) {
      return { type: 'url' };
    }
    // Check for UUID pattern
    if (schema.pattern.includes('[0-9a-f]{8}-')) {
      return { type: 'uuid' };
    }
    // Check for date patterns
    if (schema.pattern.includes('\\d{4}-\\d{2}-\\d{2}T')) {
      return { type: 'datetime' };
    }
    if (schema.pattern === '^\\d{4}-\\d{2}-\\d{2}$') {
      return { type: 'date' };
    }
    field.pattern = schema.pattern;
  }

  // Check for text (large string)
  if (schema.type === 'string' && schema.maxLength && schema.maxLength > 1000) {
    field.type = 'text';
  }

  // Handle format for dates
  if (schema.format === 'date-time') {
    field.type = 'datetime';
  } else if (schema.format === 'date') {
    field.type = 'date';
  }

  // Handle unique
  if (schema.unique) {
    field.unique = true;
  }

  // Handle enum - always use expanded format
  if (schema.enum) {
    field.enum = schema.enum;
  }

  // Handle numeric constraints
  if (schema.minimum !== undefined) {
    field.min = schema.minimum;
  }
  if (schema.maximum !== undefined) {
    field.max = schema.maximum;
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
  }

  // Handle references
  if (schema.$ref) {
    return { type: 'reference', reference: schema.$ref };
  }

  // Handle description
  if (schema.description) {
    field.description = schema.description;
  }

  // Handle arrays
  if (schema.type === 'array') {
    field.type = 'array';
    // For arrays, we need to handle items differently
    // since YamlField doesn't have an items property
    if (schema.items) {
      // Just return array type - the items schema gets lost
      // This is a limitation of the current YamlField interface
    }
  }

  // If we only have type, return simple object
  if (Object.keys(field).length === 1 && field.type) {
    return { type: field.type };
  }

  // Otherwise return full field object
  return field;
}

// Convert JSON Schema to YAML EntityType
function schemaToYamlType(
  _name: string,
  schema: any,
  namespace?: string,
): YamlEntityType {
  const yamlType: YamlEntityType = {
    fields: {},
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
        // Always use object format for consistency
        if (typeof yamlField === 'object' && !Array.isArray(yamlField)) {
          yamlField.required = true;
        } else {
          // Convert to object if it was a string
          yamlField = { type: yamlField as string, required: true };
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
    schemaHelper.graphqlRequest(relationsQuery),
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
    if (
      !options?.includeSystemNamespaces &&
      (type.namespace.startsWith('system.') || type.namespace === 'global')
    ) {
      continue;
    }

    let ontology = ontologiesByNamespace.get(type.namespace);
    if (!ontology) {
      ontology = {
        namespace: type.namespace,
        types: {},
        relations: [],
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
    if (
      !options?.includeSystemNamespaces &&
      (relation.namespace.startsWith('system.') ||
        relation.namespace === 'global')
    ) {
      continue;
    }

    // Resolve type names
    const fromType = typeIdToName.get(relation.fromEntityTypeId);
    const toType = typeIdToName.get(relation.toEntityTypeId);

    if (!fromType || !toType) {
      // Write warnings to stderr to avoid contaminating output
      if (process.stderr.isTTY) {
        console.error(
          `Warning: Could not resolve types for relation ${relation.name}`,
        );
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
        relations: [],
      };
      ontologiesByNamespace.set(relation.namespace, ontology);
    }

    const yamlRelation: YamlRelationType = {
      name: relation.name,
      from: fromType.name,
      to: toType.name,
      cardinality: relation.cardinality || 'n..n',
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
        sortKeys: false,
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
      relations: [],
    };

    // Collect all unique namespaces
    const allNamespaces = new Set<string>();

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
      sortKeys: false,
    });
  }
}
