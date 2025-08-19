/**
 * Diff Engine for Ontology Changes
 * Compares YAML definitions with database state
 */

import { YamlOntology, convertToJsonSchema } from './parser';
import * as schemaHelper from '../schema-helper';

// Types for diff results
export interface EntityTypeDiff {
  action: 'create' | 'update' | 'delete' | 'unchanged';
  name: string;
  namespace: string;
  current?: any;
  desired?: any;
  changes?: {
    field: string;
    action: 'add' | 'modify' | 'remove';
    current?: any;
    desired?: any;
  }[];
}

export interface RelationTypeDiff {
  action: 'create' | 'update' | 'delete' | 'unchanged';
  name: string;
  namespace: string;
  current?: any;
  desired?: any;
  changes?: string[];
}

export interface OntologyDiff {
  entityTypes: EntityTypeDiff[];
  relationTypes: RelationTypeDiff[];
  namespaces: {
    toCreate: string[];
    existing: string[];
  };
  summary: {
    typesToCreate: number;
    typesToUpdate: number;
    typesToDelete: number;
    relationsToCreate: number;
    relationsToUpdate: number;
    relationsToDelete: number;
    totalChanges: number;
  };
}

// Fetch current state from database
export async function fetchCurrentState(): Promise<{
  entityTypes: any[];
  relationTypes: any[];
  namespaces: string[];
}> {
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

  try {
    const [typesResult, relationsResult] = await Promise.all([
      schemaHelper.graphqlRequest(typesQuery),
      schemaHelper.graphqlRequest(relationsQuery),
    ]);

    const namespaces = new Set<string>();

    for (const type of typesResult.entityTypes) {
      namespaces.add(type.namespace);
    }
    for (const relation of relationsResult.relationTypes) {
      namespaces.add(relation.namespace);
    }

    return {
      entityTypes: typesResult.entityTypes,
      relationTypes: relationsResult.relationTypes,
      namespaces: Array.from(namespaces),
    };
  } catch (error) {
    // If server is not running, return empty state
    console.warn('Could not fetch current state from server:', error);
    return {
      entityTypes: [],
      relationTypes: [],
      namespaces: [],
    };
  }
}

// Compare JSON schemas for differences
function compareSchemas(current: any, desired: any): any[] {
  const changes: any[] = [];

  // Check for added fields
  if (desired.properties) {
    for (const [field, schema] of Object.entries(desired.properties)) {
      if (!current.properties || !current.properties[field]) {
        changes.push({
          field,
          action: 'add',
          desired: schema,
        });
      } else if (
        JSON.stringify(current.properties[field]) !== JSON.stringify(schema)
      ) {
        changes.push({
          field,
          action: 'modify',
          current: current.properties[field],
          desired: schema,
        });
      }
    }
  }

  // Check for removed fields
  if (current.properties) {
    for (const field of Object.keys(current.properties)) {
      if (!desired.properties || !desired.properties[field]) {
        changes.push({
          field,
          action: 'remove',
          current: current.properties[field],
        });
      }
    }
  }

  // Check required fields
  const currentRequired = current.required || [];
  const desiredRequired = desired.required || [];

  if (
    JSON.stringify(currentRequired.sort()) !==
    JSON.stringify(desiredRequired.sort())
  ) {
    changes.push({
      field: 'required',
      action: 'modify',
      current: currentRequired,
      desired: desiredRequired,
    });
  }

  return changes;
}

// Compute differences between YAML and DB
export async function computeDiff(
  yamlOntology: YamlOntology,
  currentState?: any,
): Promise<OntologyDiff> {
  // Fetch current state if not provided
  if (!currentState) {
    currentState = await fetchCurrentState();
  }

  const diff: OntologyDiff = {
    entityTypes: [],
    relationTypes: [],
    namespaces: {
      toCreate: [],
      existing: [],
    },
    summary: {
      typesToCreate: 0,
      typesToUpdate: 0,
      typesToDelete: 0,
      relationsToCreate: 0,
      relationsToUpdate: 0,
      relationsToDelete: 0,
      totalChanges: 0,
    },
  };

  // Process namespaces
  const desiredNamespaces = new Set<string>();
  if (yamlOntology.namespace) {
    desiredNamespaces.add(yamlOntology.namespace);
  }
  if (yamlOntology.namespaces) {
    yamlOntology.namespaces.forEach((ns) => desiredNamespaces.add(ns));
  }
  if (yamlOntology.types) {
    Object.values(yamlOntology.types).forEach((type) => {
      if (type.namespace) desiredNamespaces.add(type.namespace);
    });
  }

  for (const ns of desiredNamespaces) {
    if (currentState.namespaces.includes(ns)) {
      diff.namespaces.existing.push(ns);
    } else {
      diff.namespaces.toCreate.push(ns);
    }
  }

  // Process entity types
  const currentTypesByName = new Map<string, any>();
  for (const type of currentState.entityTypes) {
    const key = `${type.namespace}:${type.name}`;
    currentTypesByName.set(key, type);
  }

  if (yamlOntology.types) {
    for (const [typeName, typeDef] of Object.entries(yamlOntology.types)) {
      const namespace =
        typeDef.namespace || yamlOntology.namespace || 'default';
      const key = `${namespace}:${typeName}`;
      const currentType = currentTypesByName.get(key);

      if (!currentType) {
        // Type doesn't exist - create it
        diff.entityTypes.push({
          action: 'create',
          name: typeName,
          namespace,
          desired: convertToJsonSchema(typeDef),
        });
        diff.summary.typesToCreate++;
      } else {
        // Type exists - check for changes
        const desiredSchema = convertToJsonSchema(typeDef);
        const changes = compareSchemas(currentType.schemaJson, desiredSchema);

        if (changes.length > 0) {
          diff.entityTypes.push({
            action: 'update',
            name: typeName,
            namespace,
            current: currentType.schemaJson,
            desired: desiredSchema,
            changes,
          });
          diff.summary.typesToUpdate++;
        } else {
          diff.entityTypes.push({
            action: 'unchanged',
            name: typeName,
            namespace,
            current: currentType.schemaJson,
            desired: desiredSchema,
          });
        }

        // Mark as processed
        currentTypesByName.delete(key);
      }
    }
  }

  // Check for types to delete (exist in DB but not in YAML)
  // Note: We might want to make this optional with a --prune flag
  for (const [key, type] of currentTypesByName) {
    diff.entityTypes.push({
      action: 'delete',
      name: type.name,
      namespace: type.namespace,
      current: type.schemaJson,
    });
    diff.summary.typesToDelete++;
  }

  // Process relation types
  const currentRelationsByName = new Map<string, any>();
  for (const relation of currentState.relationTypes) {
    const key = `${relation.namespace}:${relation.name}`;
    currentRelationsByName.set(key, relation);
  }

  if (yamlOntology.relations) {
    for (const relationDef of yamlOntology.relations) {
      const namespace =
        relationDef.namespace || yamlOntology.namespace || 'default';
      const key = `${namespace}:${relationDef.name}`;
      const currentRelation = currentRelationsByName.get(key);

      if (!currentRelation) {
        // Relation doesn't exist - create it
        diff.relationTypes.push({
          action: 'create',
          name: relationDef.name,
          namespace,
          desired: relationDef,
        });
        diff.summary.relationsToCreate++;
      } else {
        // Check if relation has changed
        const changes: string[] = [];

        if (
          currentRelation.cardinality !== (relationDef.cardinality || 'n..n')
        ) {
          changes.push(
            `cardinality: ${currentRelation.cardinality} → ${relationDef.cardinality || 'n..n'}`,
          );
        }

        // Note: We can't easily check from/to changes without resolving type names to IDs
        // This would require additional lookups

        if (changes.length > 0) {
          diff.relationTypes.push({
            action: 'update',
            name: relationDef.name,
            namespace,
            current: currentRelation,
            desired: relationDef,
            changes,
          });
          diff.summary.relationsToUpdate++;
        } else {
          diff.relationTypes.push({
            action: 'unchanged',
            name: relationDef.name,
            namespace,
            current: currentRelation,
            desired: relationDef,
          });
        }

        // Mark as processed
        currentRelationsByName.delete(key);
      }
    }
  }

  // Check for relations to delete
  for (const [key, relation] of currentRelationsByName) {
    diff.relationTypes.push({
      action: 'delete',
      name: relation.name,
      namespace: relation.namespace,
      current: relation,
    });
    diff.summary.relationsToDelete++;
  }

  // Calculate total changes
  diff.summary.totalChanges =
    diff.summary.typesToCreate +
    diff.summary.typesToUpdate +
    diff.summary.typesToDelete +
    diff.summary.relationsToCreate +
    diff.summary.relationsToUpdate +
    diff.summary.relationsToDelete;

  return diff;
}

// Format diff for display
export function formatDiff(diff: OntologyDiff): string {
  const lines: string[] = [];
  const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    dim: '\x1b[2m',
  };

  // Header
  lines.push(`\n${colors.cyan}Ontology Changes:${colors.reset}\n`);

  // Namespaces
  if (diff.namespaces.toCreate.length > 0) {
    lines.push(`${colors.green}+ Namespaces to create:${colors.reset}`);
    for (const ns of diff.namespaces.toCreate) {
      lines.push(`  ${colors.green}+ ${ns}${colors.reset}`);
    }
    lines.push('');
  }

  // Entity types
  for (const typeDiff of diff.entityTypes) {
    if (typeDiff.action === 'unchanged') continue;

    if (typeDiff.action === 'create') {
      lines.push(
        `${colors.green}+ Create EntityType "${typeDiff.name}" in namespace "${typeDiff.namespace}"${colors.reset}`,
      );
      const fields = Object.keys(typeDiff.desired?.properties || {});
      if (fields.length > 0) {
        lines.push(
          `  ${colors.dim}Fields: ${fields.join(', ')}${colors.reset}`,
        );
      }
    } else if (typeDiff.action === 'update') {
      lines.push(
        `${colors.yellow}~ Update EntityType "${typeDiff.name}" in namespace "${typeDiff.namespace}"${colors.reset}`,
      );
      if (typeDiff.changes) {
        for (const change of typeDiff.changes) {
          if (change.action === 'add') {
            lines.push(
              `  ${colors.green}+ Add field "${change.field}"${colors.reset}`,
            );
          } else if (change.action === 'modify') {
            lines.push(
              `  ${colors.yellow}~ Modify field "${change.field}"${colors.reset}`,
            );
          } else if (change.action === 'remove') {
            lines.push(
              `  ${colors.red}- Remove field "${change.field}"${colors.reset}`,
            );
          }
        }
      }
    } else if (typeDiff.action === 'delete') {
      lines.push(
        `${colors.red}- Delete EntityType "${typeDiff.name}" in namespace "${typeDiff.namespace}"${colors.reset}`,
      );
    }
  }

  // Relation types
  for (const relationDiff of diff.relationTypes) {
    if (relationDiff.action === 'unchanged') continue;

    if (relationDiff.action === 'create') {
      lines.push(
        `${colors.green}+ Create RelationType "${relationDiff.name}" in namespace "${relationDiff.namespace}"${colors.reset}`,
      );
      if (relationDiff.desired) {
        lines.push(
          `  ${colors.dim}${relationDiff.desired.from} → ${relationDiff.desired.to} (${relationDiff.desired.cardinality || 'n..n'})${colors.reset}`,
        );
      }
    } else if (relationDiff.action === 'update') {
      lines.push(
        `${colors.yellow}~ Update RelationType "${relationDiff.name}" in namespace "${relationDiff.namespace}"${colors.reset}`,
      );
      if (relationDiff.changes) {
        for (const change of relationDiff.changes) {
          lines.push(`  ${colors.yellow}~ ${change}${colors.reset}`);
        }
      }
    } else if (relationDiff.action === 'delete') {
      lines.push(
        `${colors.red}- Delete RelationType "${relationDiff.name}" in namespace "${relationDiff.namespace}"${colors.reset}`,
      );
    }
  }

  // Summary
  lines.push('');
  lines.push(`${colors.cyan}Summary:${colors.reset}`);
  if (diff.summary.typesToCreate > 0) {
    lines.push(
      `  ${colors.green}+ ${diff.summary.typesToCreate} entity types to create${colors.reset}`,
    );
  }
  if (diff.summary.typesToUpdate > 0) {
    lines.push(
      `  ${colors.yellow}~ ${diff.summary.typesToUpdate} entity types to update${colors.reset}`,
    );
  }
  if (diff.summary.typesToDelete > 0) {
    lines.push(
      `  ${colors.red}- ${diff.summary.typesToDelete} entity types to delete${colors.reset}`,
    );
  }
  if (diff.summary.relationsToCreate > 0) {
    lines.push(
      `  ${colors.green}+ ${diff.summary.relationsToCreate} relation types to create${colors.reset}`,
    );
  }
  if (diff.summary.relationsToUpdate > 0) {
    lines.push(
      `  ${colors.yellow}~ ${diff.summary.relationsToUpdate} relation types to update${colors.reset}`,
    );
  }
  if (diff.summary.relationsToDelete > 0) {
    lines.push(
      `  ${colors.red}- ${diff.summary.relationsToDelete} relation types to delete${colors.reset}`,
    );
  }

  if (diff.summary.totalChanges === 0) {
    lines.push(`  ${colors.dim}No changes detected${colors.reset}`);
  } else {
    lines.push(
      `  ${colors.cyan}Total: ${diff.summary.totalChanges} changes${colors.reset}`,
    );
  }

  return lines.join('\n');
}
