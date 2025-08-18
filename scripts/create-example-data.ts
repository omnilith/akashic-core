#!/usr/bin/env tsx
// Script to create example data via GraphQL API

const API_URL = 'http://localhost:3000/graphql';

// GraphQL mutations and queries
const mutations = {
  createEntityType: `
    mutation CreateEntityType($input: CreateEntityTypeInput!) {
      createEntityType(input: $input) {
        id
        namespace
        name
        version
        schemaJson
      }
    }
  `,

  createEntity: `
    mutation CreateEntity($input: CreateEntityInput!) {
      createEntity(input: $input) {
        id
        namespace
        entityTypeId
        data
      }
    }
  `,

  createRelationType: `
    mutation CreateRelationType($input: CreateRelationTypeInput!) {
      createRelationType(input: $input) {
        id
        name
        cardinality
      }
    }
  `,

  createRelation: `
    mutation CreateRelation($input: CreateRelationInput!) {
      createRelation(input: $input) {
        id
        relationTypeId
        fromEntityId
        toEntityId
      }
    }
  `,
};

const queries = {
  getEntityTypes: `
    query GetEntityTypes($namespace: String) {
      entityTypes(namespace: $namespace) {
        id
        name
        namespace
      }
    }
  `,

  getEntities: `
    query GetEntities($namespace: String) {
      entities(namespace: $namespace) {
        id
        data
        entityTypeId
      }
    }
  `,

  getEvents: `
    query GetEvents($namespace: String) {
      events(namespace: $namespace) {
        id
        eventType
        resourceType
        resourceId
        timestamp
      }
    }
  `,
};

// Helper function to make GraphQL requests
async function graphqlRequest(query: string, variables: any = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL Error:', result.errors);
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// Main script
async function main() {
  console.log('🚀 Creating example data for Akashic Core...\n');

  const namespace = 'example';
  const entityTypeIds: Record<string, string> = {};
  const entityIds: Record<string, string[]> = {};

  try {
    // 1. Create Entity Types
    console.log('📦 Creating Entity Types...');

    // User entity type
    const userSchema = {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 30 },
        email: { type: 'string', format: 'email' },
        fullName: { type: 'string' },
        bio: { type: 'string', maxLength: 500 },
        joinedAt: { type: 'string', format: 'date-time' },
      },
      required: ['username', 'email', 'fullName'],
      additionalProperties: false,
    };

    const userType = await graphqlRequest(mutations.createEntityType, {
      input: {
        namespace,
        name: 'User',
        schema: JSON.stringify(userSchema),
      },
    });
    entityTypeIds.User = userType.createEntityType.id;
    console.log(`✅ Created User entity type (${entityTypeIds.User})`);

    // Post entity type
    const postSchema = {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        content: { type: 'string', minLength: 1 },
        published: { type: 'boolean' },
        publishedAt: { type: 'string', format: 'date-time' },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['title', 'content', 'published'],
      additionalProperties: false,
    };

    const postType = await graphqlRequest(mutations.createEntityType, {
      input: {
        namespace,
        name: 'Post',
        schema: JSON.stringify(postSchema),
      },
    });
    entityTypeIds.Post = postType.createEntityType.id;
    console.log(`✅ Created Post entity type (${entityTypeIds.Post})`);

    // Comment entity type
    const commentSchema = {
      type: 'object',
      properties: {
        content: { type: 'string', minLength: 1, maxLength: 1000 },
        createdAt: { type: 'string', format: 'date-time' },
        edited: { type: 'boolean' },
        editedAt: { type: 'string', format: 'date-time' },
      },
      required: ['content', 'createdAt'],
      additionalProperties: false,
    };

    const commentType = await graphqlRequest(mutations.createEntityType, {
      input: {
        namespace,
        name: 'Comment',
        schema: JSON.stringify(commentSchema),
      },
    });
    entityTypeIds.Comment = commentType.createEntityType.id;
    console.log(`✅ Created Comment entity type (${entityTypeIds.Comment})`);

    // 2. Create Entities
    console.log('\n👤 Creating Entities...');

    // Create Users
    const users = [
      {
        username: 'alice',
        email: 'alice@example.com',
        fullName: 'Alice Johnson',
        bio: 'Software engineer and tech enthusiast',
        joinedAt: '2024-01-15T10:00:00Z',
      },
      {
        username: 'bob',
        email: 'bob@example.com',
        fullName: 'Bob Smith',
        bio: 'Writer and creative thinker',
        joinedAt: '2024-02-20T14:30:00Z',
      },
    ];

    entityIds.User = [];
    for (const userData of users) {
      const user = await graphqlRequest(mutations.createEntity, {
        input: {
          namespace,
          entityTypeId: entityTypeIds.User,
          data: JSON.stringify(userData),
        },
      });
      entityIds.User.push(user.createEntity.id);
      console.log(
        `✅ Created user: ${userData.username} (${user.createEntity.id})`,
      );
    }

    // Create Posts
    const posts = [
      {
        title: 'Getting Started with Akashic Core',
        content: 'Akashic Core is an ontology-first backend platform...',
        published: true,
        publishedAt: '2024-03-01T09:00:00Z',
        tags: ['tutorial', 'akashic', 'backend'],
      },
      {
        title: 'Understanding Event Sourcing',
        content:
          'Event sourcing is a powerful pattern for building reliable systems...',
        published: true,
        publishedAt: '2024-03-05T11:00:00Z',
        tags: ['architecture', 'event-sourcing'],
      },
      {
        title: 'Draft: Future of Digital Twins',
        content: 'This is a draft post about digital twins...',
        published: false,
        tags: ['draft', 'digital-twins'],
      },
    ];

    entityIds.Post = [];
    for (const postData of posts) {
      const post = await graphqlRequest(mutations.createEntity, {
        input: {
          namespace,
          entityTypeId: entityTypeIds.Post,
          data: JSON.stringify(postData),
        },
      });
      entityIds.Post.push(post.createEntity.id);
      console.log(
        `✅ Created post: "${postData.title}" (${post.createEntity.id})`,
      );
    }

    // Create Comments
    const comments = [
      {
        content: 'Great introduction to the platform!',
        createdAt: '2024-03-01T10:30:00Z',
        edited: false,
      },
      {
        content: 'Very helpful, thanks for sharing.',
        createdAt: '2024-03-01T15:45:00Z',
        edited: false,
      },
      {
        content: 'Looking forward to more posts on this topic.',
        createdAt: '2024-03-05T12:00:00Z',
        edited: true,
        editedAt: '2024-03-05T12:05:00Z',
      },
    ];

    entityIds.Comment = [];
    for (const commentData of comments) {
      const comment = await graphqlRequest(mutations.createEntity, {
        input: {
          namespace,
          entityTypeId: entityTypeIds.Comment,
          data: JSON.stringify(commentData),
        },
      });
      entityIds.Comment.push(comment.createEntity.id);
      console.log(`✅ Created comment (${comment.createEntity.id})`);
    }

    // 3. Create Relation Types
    console.log('\n🔗 Creating Relation Types...');

    const relationTypeIds: Record<string, string> = {};

    // User -> Post (author relationship)
    const authorRelType = await graphqlRequest(mutations.createRelationType, {
      input: {
        namespace,
        name: 'author',
        fromEntityTypeId: entityTypeIds.User,
        toEntityTypeId: entityTypeIds.Post,
        cardinality: '1..n',
      },
    });
    relationTypeIds.author = authorRelType.createRelationType.id;
    console.log(
      `✅ Created relation type: User -author-> Post (${relationTypeIds.author})`,
    );

    // User -> Comment (commenter relationship)
    const commenterRelType = await graphqlRequest(
      mutations.createRelationType,
      {
        input: {
          namespace,
          name: 'commenter',
          fromEntityTypeId: entityTypeIds.User,
          toEntityTypeId: entityTypeIds.Comment,
          cardinality: '1..n',
        },
      },
    );
    relationTypeIds.commenter = commenterRelType.createRelationType.id;
    console.log(
      `✅ Created relation type: User -commenter-> Comment (${relationTypeIds.commenter})`,
    );

    // Post -> Comment (comments relationship)
    const commentsRelType = await graphqlRequest(mutations.createRelationType, {
      input: {
        namespace,
        name: 'comments',
        fromEntityTypeId: entityTypeIds.Post,
        toEntityTypeId: entityTypeIds.Comment,
        cardinality: '1..n',
      },
    });
    relationTypeIds.comments = commentsRelType.createRelationType.id;
    console.log(
      `✅ Created relation type: Post -comments-> Comment (${relationTypeIds.comments})`,
    );

    // 4. Create Relations
    console.log('\n🔄 Creating Relations...');

    // Alice authored first two posts
    await graphqlRequest(mutations.createRelation, {
      input: {
        namespace,
        relationTypeId: relationTypeIds.author,
        fromEntityId: entityIds.User[0], // Alice
        toEntityId: entityIds.Post[0], // First post
        metadata: JSON.stringify({ role: 'primary_author' }),
      },
    });
    console.log(`✅ Alice authored "Getting Started with Akashic Core"`);

    await graphqlRequest(mutations.createRelation, {
      input: {
        namespace,
        relationTypeId: relationTypeIds.author,
        fromEntityId: entityIds.User[0], // Alice
        toEntityId: entityIds.Post[1], // Second post
        metadata: JSON.stringify({ role: 'primary_author' }),
      },
    });
    console.log(`✅ Alice authored "Understanding Event Sourcing"`);

    // Bob authored the draft post
    await graphqlRequest(mutations.createRelation, {
      input: {
        namespace,
        relationTypeId: relationTypeIds.author,
        fromEntityId: entityIds.User[1], // Bob
        toEntityId: entityIds.Post[2], // Draft post
        metadata: JSON.stringify({ role: 'primary_author' }),
      },
    });
    console.log(`✅ Bob authored "Draft: Future of Digital Twins"`);

    // Link comments to posts
    await graphqlRequest(mutations.createRelation, {
      input: {
        namespace,
        relationTypeId: relationTypeIds.comments,
        fromEntityId: entityIds.Post[0], // First post
        toEntityId: entityIds.Comment[0], // First comment
      },
    });

    await graphqlRequest(mutations.createRelation, {
      input: {
        namespace,
        relationTypeId: relationTypeIds.comments,
        fromEntityId: entityIds.Post[0], // First post
        toEntityId: entityIds.Comment[1], // Second comment
      },
    });
    console.log(`✅ Linked 2 comments to first post`);

    await graphqlRequest(mutations.createRelation, {
      input: {
        namespace,
        relationTypeId: relationTypeIds.comments,
        fromEntityId: entityIds.Post[1], // Second post
        toEntityId: entityIds.Comment[2], // Third comment
      },
    });
    console.log(`✅ Linked 1 comment to second post`);

    // Link comments to users
    await graphqlRequest(mutations.createRelation, {
      input: {
        namespace,
        relationTypeId: relationTypeIds.commenter,
        fromEntityId: entityIds.User[1], // Bob
        toEntityId: entityIds.Comment[0], // First comment
      },
    });

    await graphqlRequest(mutations.createRelation, {
      input: {
        namespace,
        relationTypeId: relationTypeIds.commenter,
        fromEntityId: entityIds.User[0], // Alice
        toEntityId: entityIds.Comment[1], // Second comment
      },
    });

    await graphqlRequest(mutations.createRelation, {
      input: {
        namespace,
        relationTypeId: relationTypeIds.commenter,
        fromEntityId: entityIds.User[1], // Bob
        toEntityId: entityIds.Comment[2], // Third comment
      },
    });
    console.log(`✅ Linked comments to their authors`);

    // 5. Query and display results
    console.log('\n📊 Querying Created Data...');

    const entityTypes = await graphqlRequest(queries.getEntityTypes, {
      namespace,
    });
    console.log(`\n📦 Entity Types in namespace '${namespace}':`);
    entityTypes.entityTypes.forEach((et: any) => {
      console.log(`  - ${et.name} (${et.id})`);
    });

    const entities = await graphqlRequest(queries.getEntities, { namespace });
    console.log(`\n👤 Total entities created: ${entities.entities.length}`);

    const events = await graphqlRequest(queries.getEvents, { namespace });
    console.log(`\n📝 Total events logged: ${events.events.length}`);
    console.log('\nRecent events:');
    events.events.slice(-5).forEach((event: any) => {
      console.log(
        `  - ${event.eventType} on ${event.resourceType} at ${new Date(event.timestamp).toLocaleString()}`,
      );
    });

    console.log('\n✨ Example data created successfully!');
    console.log('🎮 Visit http://localhost:3000/graphql to explore the data');
  } catch (error) {
    console.error('\n❌ Error creating example data:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
