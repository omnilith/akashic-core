#!/usr/bin/env tsx
/**
 * Test script for relationships
 */

const API_URL = process.env.AKASHIC_API_URL || 'http://localhost:3000/graphql';

async function graphqlRequest(query: string, variables: any = {}) {
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
}

async function main() {
  console.log('🔗 Testing Relationship Features\n');

  try {
    // 1. Create a relation type between Task and User (assigned_to)
    console.log('1️⃣ Creating relation type: Task -> User (assigned_to)');
    
    const createRTMutation = `
      mutation CreateRelationType($input: CreateRelationTypeInput!) {
        createRelationType(input: $input) {
          id
          name
          namespace
          cardinality
        }
      }
    `;
    
    const taskTypeId = '016b5cfe-bc93-45c6-b6c9-1155c13c299c'; // Task type
    const userTypeId = '45fb9abb-09ef-4446-91ab-ac41d1b0cbd4'; // User type
    
    const rtResult = await graphqlRequest(createRTMutation, {
      input: {
        namespace: 'tasks',
        name: 'assigned_to',
        fromEntityTypeId: taskTypeId,
        toEntityTypeId: userTypeId,
        cardinality: 'n..1', // Many tasks to one user
      },
    });
    
    console.log(`✅ Created relation type: ${rtResult.createRelationType.name}`);
    console.log(`   ID: ${rtResult.createRelationType.id}`);
    
    // 2. Get a task and user to link
    console.log('\n2️⃣ Finding entities to link...');
    
    const entitiesQuery = `
      query GetEntities {
        tasks: entities(namespace: "tasks", entityTypeId: "${taskTypeId}") {
          id
          data
        }
        users: entities(namespace: "example", entityTypeId: "${userTypeId}") {
          id
          data
        }
      }
    `;
    
    const entities = await graphqlRequest(entitiesQuery);
    
    if (entities.tasks.length === 0 || entities.users.length === 0) {
      console.log('❌ Need at least one task and one user to create relation');
      return;
    }
    
    const task = entities.tasks[0];
    const user = entities.users[0];
    
    console.log(`Found Task: ${task.data.title} (${task.id})`);
    console.log(`Found User: ${user.data.username} (${user.id})`);
    
    // 3. Create a relation
    console.log('\n3️⃣ Creating relation...');
    
    const createRelMutation = `
      mutation CreateRelation($input: CreateRelationInput!) {
        createRelation(input: $input) {
          id
          relationTypeId
          fromEntityId
          toEntityId
        }
      }
    `;
    
    const relResult = await graphqlRequest(createRelMutation, {
      input: {
        namespace: 'tasks',
        relationTypeId: rtResult.createRelationType.id,
        fromEntityId: task.id,
        toEntityId: user.id,
      },
    });
    
    console.log(`✅ Created relation!`);
    console.log(`   Task "${task.data.title}" is assigned to "${user.data.username}"`);
    console.log(`   Relation ID: ${relResult.createRelation.id}`);
    
    // 4. Query relations for the task
    console.log('\n4️⃣ Querying relations for the task...');
    
    const relationsQuery = `
      query GetRelations($fromEntityId: ID) {
        relations(fromEntityId: $fromEntityId) {
          id
          relationTypeId
          toEntityId
        }
      }
    `;
    
    const relations = await graphqlRequest(relationsQuery, {
      fromEntityId: task.id,
    });
    
    console.log(`Found ${relations.relations.length} relation(s) for task "${task.data.title}"`);
    
    // 5. CLI commands to run
    console.log('\n📝 Try these CLI commands:');
    console.log(`\n# List all relation types:`);
    console.log('npm run akashic -- list-relation-types');
    console.log(`\n# List relations for this task:`);
    console.log(`npm run akashic -- list-relations --from ${task.id}`);
    console.log(`\n# Create a new relation interactively:`);
    console.log('npm run akashic -- link');
    console.log(`\n# Delete the relation:`);
    console.log(`npm run akashic -- unlink ${relResult.createRelation.id}`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    // If relation type already exists, just continue
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Relation type already exists, continuing with existing one...');
    } else {
      process.exit(1);
    }
  }
}

main().catch(console.error);