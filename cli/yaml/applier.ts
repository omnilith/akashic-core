/**
 * Applier for Ontology Changes
 * Applies YAML-defined changes to the database via GraphQL
 */

import { OntologyDiff, EntityTypeDiff, RelationTypeDiff } from './differ';
import { YamlRelationType } from './parser';
import * as schemaHelper from '../schema-helper';

// Track created types for relation resolution
const createdTypes = new Map<string, string>(); // name:namespace -> id

// Apply all changes from a diff
export async function applyDiff(
  diff: OntologyDiff,
  options?: {
    dryRun?: boolean;
    verbose?: boolean;
    allowDeletes?: boolean;
  }
): Promise<{
  success: boolean;
  applied: string[];
  failed: string[];
  errors: any[];
}> {
  const result = {
    success: true,
    applied: [] as string[],
    failed: [] as string[],
    errors: [] as any[]
  };

  if (options?.dryRun) {
    console.log('🔍 Dry run mode - no changes will be applied');
    return result;
  }

  console.log('📝 Applying changes...\n');

  // Apply entity type changes first (creates, then updates, then deletes)
  
  // 1. Create new entity types
  for (const typeDiff of diff.entityTypes.filter(t => t.action === 'create')) {
    try {
      await createEntityType(typeDiff);
      result.applied.push(`Created EntityType: ${typeDiff.namespace}:${typeDiff.name}`);
      if (options?.verbose) {
        console.log(`✅ Created EntityType: ${typeDiff.name}`);
      }
    } catch (error: any) {
      result.failed.push(`Failed to create EntityType: ${typeDiff.name}`);
      result.errors.push({ type: 'EntityType', name: typeDiff.name, error: error.message });
      result.success = false;
      console.error(`❌ Failed to create EntityType ${typeDiff.name}: ${error.message}`);
    }
  }

  // 2. Update existing entity types
  for (const typeDiff of diff.entityTypes.filter(t => t.action === 'update')) {
    try {
      await updateEntityType(typeDiff);
      result.applied.push(`Updated EntityType: ${typeDiff.namespace}:${typeDiff.name}`);
      if (options?.verbose) {
        console.log(`✅ Updated EntityType: ${typeDiff.name}`);
      }
    } catch (error: any) {
      result.failed.push(`Failed to update EntityType: ${typeDiff.name}`);
      result.errors.push({ type: 'EntityType', name: typeDiff.name, error: error.message });
      result.success = false;
      console.error(`❌ Failed to update EntityType ${typeDiff.name}: ${error.message}`);
    }
  }

  // 3. Delete removed entity types (if enabled)
  // Note: Deletion is dangerous and should be opt-in
  if (options?.allowDeletes) {
    for (const typeDiff of diff.entityTypes.filter(t => t.action === 'delete')) {
      try {
        await deleteEntityType(typeDiff);
        result.applied.push(`Deleted EntityType: ${typeDiff.namespace}:${typeDiff.name}`);
        if (options?.verbose) {
          console.log(`✅ Deleted EntityType: ${typeDiff.name}`);
        }
      } catch (error: any) {
        result.failed.push(`Failed to delete EntityType: ${typeDiff.name}`);
        result.errors.push({ type: 'EntityType', name: typeDiff.name, error: error.message });
        result.success = false;
        console.error(`❌ Failed to delete EntityType ${typeDiff.name}: ${error.message}`);
      }
    }
  }

  // Apply relation type changes

  // 4. Create new relation types
  for (const relationDiff of diff.relationTypes.filter(r => r.action === 'create')) {
    try {
      await createRelationType(relationDiff);
      result.applied.push(`Created RelationType: ${relationDiff.namespace}:${relationDiff.name}`);
      if (options?.verbose) {
        console.log(`✅ Created RelationType: ${relationDiff.name}`);
      }
    } catch (error: any) {
      result.failed.push(`Failed to create RelationType: ${relationDiff.name}`);
      result.errors.push({ type: 'RelationType', name: relationDiff.name, error: error.message });
      result.success = false;
      console.error(`❌ Failed to create RelationType ${relationDiff.name}: ${error.message}`);
    }
  }

  // 5. Update existing relation types
  for (const relationDiff of diff.relationTypes.filter(r => r.action === 'update')) {
    try {
      await updateRelationType(relationDiff);
      result.applied.push(`Updated RelationType: ${relationDiff.namespace}:${relationDiff.name}`);
      if (options?.verbose) {
        console.log(`✅ Updated RelationType: ${relationDiff.name}`);
      }
    } catch (error: any) {
      result.failed.push(`Failed to update RelationType: ${relationDiff.name}`);
      result.errors.push({ type: 'RelationType', name: relationDiff.name, error: error.message });
      result.success = false;
      console.error(`❌ Failed to update RelationType ${relationDiff.name}: ${error.message}`);
    }
  }

  // 6. Delete removed relation types
  if (options?.allowDeletes) {
    for (const relationDiff of diff.relationTypes.filter(r => r.action === 'delete')) {
      try {
        await deleteRelationType(relationDiff);
        result.applied.push(`Deleted RelationType: ${relationDiff.namespace}:${relationDiff.name}`);
        if (options?.verbose) {
          console.log(`✅ Deleted RelationType: ${relationDiff.name}`);
        }
      } catch (error: any) {
        result.failed.push(`Failed to delete RelationType: ${relationDiff.name}`);
        result.errors.push({ type: 'RelationType', name: relationDiff.name, error: error.message });
        result.success = false;
        console.error(`❌ Failed to delete RelationType ${relationDiff.name}: ${error.message}`);
      }
    }
  }

  return result;
}

// Create a new entity type
async function createEntityType(typeDiff: EntityTypeDiff): Promise<void> {
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
      namespace: typeDiff.namespace,
      name: typeDiff.name,
      schema: JSON.stringify(typeDiff.desired)
    }
  });

  // Store the created type ID for relation resolution
  const key = `${typeDiff.namespace}:${typeDiff.name}`;
  createdTypes.set(key, result.createEntityType.id);
}

// Update an existing entity type
async function updateEntityType(typeDiff: EntityTypeDiff): Promise<void> {
  // First, we need to get the type ID
  const typeId = await resolveEntityTypeId(typeDiff.name, typeDiff.namespace);
  
  const mutation = `
    mutation UpdateEntityType($input: UpdateEntityTypeInput!) {
      updateEntityType(input: $input) {
        id
        name
        version
      }
    }
  `;

  await schemaHelper.graphqlRequest(mutation, {
    input: {
      id: typeId,
      schema: JSON.stringify(typeDiff.desired)
    }
  });
}

// Delete an entity type
async function deleteEntityType(typeDiff: EntityTypeDiff): Promise<void> {
  const typeId = await resolveEntityTypeId(typeDiff.name, typeDiff.namespace);
  
  const mutation = `
    mutation DeleteEntityType($id: ID!) {
      deleteEntityType(id: $id) {
        id
        deleted
      }
    }
  `;

  await schemaHelper.graphqlRequest(mutation, { id: typeId });
}

// Create a new relation type
async function createRelationType(relationDiff: RelationTypeDiff): Promise<void> {
  const relation = relationDiff.desired as YamlRelationType;
  
  // Resolve entity type IDs
  const fromTypeId = await resolveEntityTypeId(relation.from, relationDiff.namespace);
  const toTypeId = await resolveEntityTypeId(relation.to, relationDiff.namespace);

  const mutation = `
    mutation CreateRelationType($input: CreateRelationTypeInput!) {
      createRelationType(input: $input) {
        id
        name
        namespace
      }
    }
  `;

  await schemaHelper.graphqlRequest(mutation, {
    input: {
      namespace: relationDiff.namespace,
      name: relationDiff.name,
      fromEntityTypeId: fromTypeId,
      toEntityTypeId: toTypeId,
      cardinality: relation.cardinality || 'n..n'
      // Note: description field not available in current schema
    }
  });
}

// Update an existing relation type
async function updateRelationType(relationDiff: RelationTypeDiff): Promise<void> {
  const relationId = await resolveRelationTypeId(relationDiff.name, relationDiff.namespace);
  
  const mutation = `
    mutation UpdateRelationType($input: UpdateRelationTypeInput!) {
      updateRelationType(input: $input) {
        id
        name
        cardinality
      }
    }
  `;

  const relation = relationDiff.desired as YamlRelationType;
  await schemaHelper.graphqlRequest(mutation, {
    input: {
      id: relationId,
      cardinality: relation.cardinality
    }
  });
}

// Delete a relation type
async function deleteRelationType(relationDiff: RelationTypeDiff): Promise<void> {
  const relationId = await resolveRelationTypeId(relationDiff.name, relationDiff.namespace);
  
  const mutation = `
    mutation DeleteRelationType($id: ID!) {
      deleteRelationType(id: $id) {
        id
        deleted
      }
    }
  `;

  await schemaHelper.graphqlRequest(mutation, { id: relationId });
}

// Helper: Resolve entity type name to ID
async function resolveEntityTypeId(name: string, namespace: string): Promise<string> {
  // Check if we just created this type
  const key = `${namespace}:${name}`;
  if (createdTypes.has(key)) {
    return createdTypes.get(key)!;
  }

  // Otherwise, query for it
  const query = `
    query GetEntityType($name: String!, $namespace: String!) {
      entityTypes(name: $name, namespace: $namespace) {
        id
      }
    }
  `;

  const result = await schemaHelper.graphqlRequest(query, { name, namespace });
  
  if (!result.entityTypes || result.entityTypes.length === 0) {
    throw new Error(`EntityType not found: ${namespace}:${name}`);
  }

  return result.entityTypes[0].id;
}

// Helper: Resolve relation type name to ID
async function resolveRelationTypeId(name: string, namespace: string): Promise<string> {
  const query = `
    query GetRelationType($name: String!, $namespace: String!) {
      relationTypes(name: $name, namespace: $namespace) {
        id
      }
    }
  `;

  const result = await schemaHelper.graphqlRequest(query, { name, namespace });
  
  if (!result.relationTypes || result.relationTypes.length === 0) {
    throw new Error(`RelationType not found: ${namespace}:${name}`);
  }

  return result.relationTypes[0].id;
}