# Akashic Core API Documentation

## Overview

Akashic Core provides both GraphQL and REST APIs for managing entities, relationships, and workflows. This document covers common operations and best practices.

## Base URLs

- **REST API**: `http://localhost:3000`
- **GraphQL Playground**: `http://localhost:3000/graphql`
- **Swagger Documentation**: `http://localhost:3000/api`

## Authentication

Currently, the API is open for development. Authentication will be added in a future release.

## GraphQL API

### Core Concepts

#### Entity Types
Entity Types define the schema for your data using JSON Schema.

```graphql
# Create an Entity Type
mutation CreateEntityType($input: CreateEntityTypeInput!) {
  createEntityType(input: $input) {
    id
    namespace
    name
    version
    schemaJson
  }
}

# Example Variables:
{
  "input": {
    "namespace": "myapp",
    "name": "User",
    "schema": "{\"type\":\"object\",\"properties\":{\"username\":{\"type\":\"string\"},\"email\":{\"type\":\"string\",\"format\":\"email\"}},\"required\":[\"username\",\"email\"]}"
  }
}
```

#### Entities
Entities are instances of Entity Types with validated data.

```graphql
# Create an Entity
mutation CreateEntity($input: CreateEntityInput!) {
  createEntity(input: $input) {
    id
    namespace
    entityTypeId
    data
  }
}

# Query Entities
query GetEntities($namespace: String, $entityTypeId: String) {
  entities(namespace: $namespace, entityTypeId: $entityTypeId) {
    id
    data
    createdAt
    updatedAt
  }
}
```

#### Relation Types
Define typed relationships between Entity Types.

```graphql
# Create a Relation Type
mutation CreateRelationType($input: CreateRelationTypeInput!) {
  createRelationType(input: $input) {
    id
    name
    fromEntityTypeId
    toEntityTypeId
    cardinality
  }
}

# Cardinality options: "1..1", "1..n", "n..1", "n..n"
```

#### Relations
Create actual links between entities.

```graphql
# Create a Relation
mutation CreateRelation($input: CreateRelationInput!) {
  createRelation(input: $input) {
    id
    relationTypeId
    fromEntityId
    toEntityId
    metadata
  }
}

# Query Relations
query GetRelations($namespace: String, $fromEntityId: String) {
  relations(namespace: $namespace, fromEntityId: $fromEntityId) {
    id
    fromEntityId
    toEntityId
    metadata
  }
}
```

#### Events
Query the event log for audit and debugging.

```graphql
# Query Events
query GetEvents($namespace: String, $resourceType: String, $since: DateTime) {
  events(namespace: $namespace, resourceType: $resourceType, since: $since) {
    id
    eventType
    resourceType
    resourceId
    payload
    timestamp
  }
}
```

## Common Patterns

### 1. Creating a Blog System

```javascript
// 1. Define Entity Types
const userType = {
  namespace: "blog",
  name: "User",
  schema: JSON.stringify({
    type: "object",
    properties: {
      username: { type: "string", minLength: 3 },
      email: { type: "string", format: "email" },
      bio: { type: "string", maxLength: 500 }
    },
    required: ["username", "email"]
  })
};

const postType = {
  namespace: "blog",
  name: "Post",
  schema: JSON.stringify({
    type: "object",
    properties: {
      title: { type: "string", maxLength: 200 },
      content: { type: "string" },
      published: { type: "boolean" },
      tags: { type: "array", items: { type: "string" } }
    },
    required: ["title", "content", "published"]
  })
};

// 2. Create Relation Type (User -> Post)
const authorRelation = {
  namespace: "blog",
  name: "author",
  fromEntityTypeId: userTypeId,
  toEntityTypeId: postTypeId,
  cardinality: "1..n"
};

// 3. Create Entities
const user = {
  namespace: "blog",
  entityTypeId: userTypeId,
  data: JSON.stringify({
    username: "johndoe",
    email: "john@example.com",
    bio: "Tech blogger"
  })
};

const post = {
  namespace: "blog",
  entityTypeId: postTypeId,
  data: JSON.stringify({
    title: "Getting Started with Akashic Core",
    content: "...",
    published: true,
    tags: ["tutorial", "akashic"]
  })
};

// 4. Link User to Post
const relation = {
  namespace: "blog",
  relationTypeId: authorRelationId,
  fromEntityId: userId,
  toEntityId: postId,
  metadata: JSON.stringify({ role: "primary_author" })
};
```

### 2. Querying Related Data

```graphql
# Get all posts with their authors
query GetPostsWithAuthors {
  posts: entities(namespace: "blog", entityTypeId: $postTypeId) {
    id
    data
  }
  
  authorRelations: relations(namespace: "blog", relationTypeId: $authorRelationId) {
    fromEntityId
    toEntityId
  }
  
  users: entities(namespace: "blog", entityTypeId: $userTypeId) {
    id
    data
  }
}
```

### 3. Event Sourcing

Track all changes to your data:

```graphql
# Get recent events for an entity
query GetEntityHistory($entityId: String!) {
  events(resourceId: $entityId) {
    eventType
    payload
    timestamp
  }
}
```

## Namespaces

Namespaces provide data isolation for multi-tenant scenarios:

- **global**: System-wide data
- **org-{id}**: Organization-specific data
- **user-{id}**: Personal data
- **app-{name}**: Application-specific data

Example:
```javascript
// Personal namespace
const personalNamespace = `user-${userId}`;

// Organization namespace
const orgNamespace = `org-${organizationId}`;

// Application namespace
const appNamespace = "blog";
```

## Error Handling

The API returns standard HTTP status codes:

- **200 OK**: Success
- **400 Bad Request**: Validation error or invalid input
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

GraphQL errors include detailed messages:

```json
{
  "errors": [
    {
      "message": "Validation failed: Missing required field: email",
      "extensions": {
        "code": "BAD_REQUEST"
      }
    }
  ]
}
```

## Rate Limiting

Currently no rate limiting is implemented. This will be added before production deployment.

## Pagination

For large datasets, use pagination parameters:

```graphql
query GetEntitiesPaginated {
  entities(namespace: "blog", limit: 10, offset: 0) {
    id
    data
  }
}
```

## Best Practices

1. **Use Namespaces**: Always specify a namespace to isolate your data
2. **Validate Schemas**: Test your JSON Schemas before creating Entity Types
3. **Use Transactions**: Group related operations when possible
4. **Monitor Events**: Use the event log for debugging and auditing
5. **Handle Errors**: Always check for validation errors in responses
6. **Cache Entity Types**: Entity Type definitions rarely change, cache them client-side
7. **Batch Operations**: Use GraphQL's ability to combine multiple queries

## Examples and Scripts

See the `/scripts` directory for example implementations:
- `create-example-data.ts`: Creates a complete blog system
- `test-queries.ts`: Demonstrates various query patterns

## SDK Usage (Coming Soon)

```javascript
import { AkashicClient } from '@akashic/client';

const client = new AkashicClient({
  endpoint: 'http://localhost:3000/graphql',
  namespace: 'myapp'
});

// Create an entity type
const userType = await client.entityTypes.create({
  name: 'User',
  schema: { /* JSON Schema */ }
});

// Create an entity
const user = await client.entities.create({
  typeId: userType.id,
  data: { username: 'john', email: 'john@example.com' }
});

// Query entities
const users = await client.entities.find({
  typeId: userType.id,
  where: { username: 'john' }
});
```

## WebSocket Subscriptions (Coming Soon)

```graphql
subscription OnEntityCreated($namespace: String!) {
  entityCreated(namespace: $namespace) {
    id
    entityTypeId
    data
  }
}
```

## Migration Guide

When updating Entity Type schemas:

1. Create a new version of the Entity Type
2. Migrate existing entities to the new schema
3. Update relations if needed
4. Archive old Entity Type version

## Support

- GitHub Issues: [github.com/akashic-core/issues](https://github.com/akashic-core/issues)
- Documentation: [docs.akashic.dev](https://docs.akashic.dev)
- Discord: [discord.gg/akashic](https://discord.gg/akashic)