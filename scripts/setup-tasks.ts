#!/usr/bin/env tsx
/**
 * Setup Task Management System
 * Creates Task entity type and registers it with the CLI
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
  console.log('🚀 Setting up Task Management System\n');

  try {
    // 1. Define the task schema (stored in the ontology, not as a file)
    const taskSchema = {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description: 'Task title',
        },
        description: {
          type: 'string',
          maxLength: 2000,
          description: 'Detailed task description',
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done', 'blocked', 'cancelled'],
          description: 'Current task status',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Task priority level',
        },
        assignee: {
          type: 'string',
          description: 'Person assigned to this task',
        },
        dueDate: {
          type: 'string',
          format: 'date-time',
          description: 'Task due date',
        },
        estimatedHours: {
          type: 'number',
          minimum: 0,
          maximum: 1000,
          description: 'Estimated hours to complete',
        },
        actualHours: {
          type: 'number',
          minimum: 0,
          description: 'Actual hours spent',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Task tags/labels',
        },
        blocked: {
          type: 'boolean',
          description: 'Is this task blocked?',
        },
        blockedReason: {
          type: 'string',
          description: 'Reason why task is blocked',
        },
      },
      required: ['title', 'status', 'priority'],
      additionalProperties: false,
    };

    // 2. Create the Task entity type
    console.log('📦 Creating Task entity type...');

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

    const result = await graphqlRequest(mutation, {
      input: {
        namespace: 'tasks',
        name: 'Task',
        schema: JSON.stringify(taskSchema),
      },
    });

    const taskTypeId = result.createEntityType.id;
    console.log(`✅ Created Task entity type: ${taskTypeId}`);

    // 3. Register the alias with the CLI
    console.log('\n📝 Registering Task alias for CLI...');
    console.log(`Run this command to register the alias:`);
    console.log(`\n  npm run akashic -- register Task ${taskTypeId}\n`);

    // 4. Show example usage
    console.log('📚 Example Usage:\n');
    console.log('  # Create a task interactively');
    console.log('  npm run akashic -- create Task\n');
    console.log('  # Quick create with inline data');
    console.log(
      '  npm run akashic -- create Task title="Fix login bug" status=todo priority=high\n',
    );
    console.log('  # List all tasks');
    console.log('  npm run akashic -- list Task\n');
    console.log('  # Update a task');
    console.log('  npm run akashic -- update Task <id> status=done\n');

    // 5. Create some example tasks
    console.log('🎯 Creating example tasks...\n');

    const exampleTasks = [
      {
        title: 'Implement authentication',
        description: 'Add JWT-based authentication to the API',
        status: 'todo',
        priority: 'high',
        estimatedHours: 8,
        tags: ['security', 'backend'],
      },
      {
        title: 'Write API documentation',
        description: 'Document all GraphQL endpoints',
        status: 'in_progress',
        priority: 'medium',
        estimatedHours: 4,
        actualHours: 2,
        tags: ['documentation'],
      },
      {
        title: 'Fix database connection pooling',
        description: 'Connection pool exhaustion under load',
        status: 'done',
        priority: 'urgent',
        estimatedHours: 2,
        actualHours: 3,
        tags: ['bug', 'database'],
      },
      {
        title: 'Design new landing page',
        description: 'Create mockups for the new marketing site',
        status: 'blocked',
        priority: 'low',
        blocked: true,
        blockedReason: 'Waiting for brand guidelines',
        tags: ['design', 'frontend'],
      },
    ];

    const createMutation = `
      mutation CreateEntity($input: CreateEntityInput!) {
        createEntity(input: $input) {
          id
          data
        }
      }
    `;

    for (const task of exampleTasks) {
      await graphqlRequest(createMutation, {
        input: {
          namespace: 'tasks',
          entityTypeId: taskTypeId,
          data: JSON.stringify(task),
        },
      });
      console.log(`✅ Created task: "${task.title}" (${task.status})`);
    }

    console.log('\n🎉 Task Management System setup complete!');
    console.log('\n💡 Next steps:');
    console.log(
      `  1. Register the Task alias: npm run akashic -- register Task ${taskTypeId}`,
    );
    console.log('  2. Try creating a task: npm run akashic -- create Task');
    console.log('  3. List all tasks: npm run akashic -- list Task');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
