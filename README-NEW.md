# Akashic Core

<p align="center">
  <strong>An ontology-first backend platform for building personal and organizational digital twins</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api-documentation">API</a> •
  <a href="#cli">CLI</a> •
  <a href="#examples">Examples</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Overview

Akashic Core is a federated creative engine where personal and organizational digital twins share the same ontology, processes are cultural rituals, and the public history of creation is part of the art. Unlike traditional productivity or digital twin systems, Akashic Core treats data structure as a first-class creative medium.

## ✨ Features

- 🔷 **Ontology-First**: Define your data schemas using JSON Schema
- 📝 **Event Sourcing**: Complete audit trail of all changes
- 🔗 **Typed Relations**: Define and enforce relationships between entities
- 🏢 **Multi-Tenancy**: Namespace isolation for different contexts
- 🚀 **GraphQL & REST**: Dual API support with auto-generated documentation
- 🛠️ **Developer Tools**: CLI, Swagger UI, GraphQL Playground
- ✅ **Validation**: Automatic data validation against schemas
- 🔄 **Process Engine**: Workflow automation (coming soon)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/akashic-core
cd akashic-core

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Your API is now running! 🎉

- 📚 **Swagger Documentation**: http://localhost:3000/api
- 🎮 **GraphQL Playground**: http://localhost:3000/graphql
- 🌐 **REST API**: http://localhost:3000

### Quick Test

```bash
# Check API health
npm run api:health

# Create example data
npm run seed

# Test queries
npm run api:test
```

## 📖 API Documentation

### GraphQL Example

```graphql
# Create an Entity Type (schema definition)
mutation CreateUserType {
  createEntityType(input: {
    namespace: "myapp"
    name: "User"
    schema: "{\"type\":\"object\",\"properties\":{\"username\":{\"type\":\"string\"},\"email\":{\"type\":\"string\",\"format\":\"email\"}},\"required\":[\"username\",\"email\"]}"
  }) {
    id
    name
  }
}

# Create an Entity (instance)
mutation CreateUser {
  createEntity(input: {
    namespace: "myapp"
    entityTypeId: "uuid-here"
    data: "{\"username\":\"alice\",\"email\":\"alice@example.com\"}"
  }) {
    id
    data
  }
}

# Query Entities
query GetUsers {
  entities(namespace: "myapp") {
    id
    data
    createdAt
  }
}
```

### REST API Example

```bash
# Create an entity type
curl -X POST http://localhost:3000/api/entity-types \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "myapp",
    "name": "User",
    "schema": {"type": "object", "properties": {...}}
  }'

# Query entities
curl http://localhost:3000/api/entities?namespace=myapp
```

## 🖥️ CLI

The Akashic CLI provides quick access to common operations:

```bash
# Install CLI globally
npm link

# List entity types
akashic types --namespace myapp

# Create entity type from file
akashic create-type --name User --schema ./schemas/user.json

# Create entity
akashic create --type <type-id> --data ./data/user.json

# View recent events
akashic events --limit 20

# Check API health
akashic health
```

## 📚 Examples

### Building a Blog System

```javascript
// 1. Define Entity Types
const userType = await createEntityType({
  namespace: "blog",
  name: "User",
  schema: {
    type: "object",
    properties: {
      username: { type: "string" },
      email: { type: "string", format: "email" }
    },
    required: ["username", "email"]
  }
});

const postType = await createEntityType({
  namespace: "blog",
  name: "Post",
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      content: { type: "string" },
      published: { type: "boolean" }
    },
    required: ["title", "content"]
  }
});

// 2. Create Relation Type
const authorRelation = await createRelationType({
  namespace: "blog",
  name: "author",
  fromEntityTypeId: userType.id,
  toEntityTypeId: postType.id,
  cardinality: "1..n"  // One user can have many posts
});

// 3. Create Entities
const user = await createEntity({
  namespace: "blog",
  entityTypeId: userType.id,
  data: {
    username: "alice",
    email: "alice@blog.com"
  }
});

const post = await createEntity({
  namespace: "blog",
  entityTypeId: postType.id,
  data: {
    title: "Hello World",
    content: "My first post!",
    published: true
  }
});

// 4. Link them together
const relation = await createRelation({
  namespace: "blog",
  relationTypeId: authorRelation.id,
  fromEntityId: user.id,
  toEntityId: post.id
});
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           GraphQL / REST API            │
├─────────────────────────────────────────┤
│            Service Layer                │
│  ┌──────────┬──────────┬──────────┐    │
│  │ Entities │Relations │  Events  │    │
│  └──────────┴──────────┴──────────┘    │
├─────────────────────────────────────────┤
│         Validation Layer (AJV)          │
├─────────────────────────────────────────┤
│      Repository Layer (Drizzle)         │
├─────────────────────────────────────────┤
│         PostgreSQL Database             │
└─────────────────────────────────────────┘
```

## 📂 Project Structure

```
akashic-core/
├── src/
│   ├── modules/        # Feature modules
│   ├── db/             # Database schema & migrations
│   └── lib/            # Shared utilities
├── scripts/            # Utility scripts
├── cli/                # CLI tool
├── docs/               # Documentation
└── test/               # Test files
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Test API endpoints
npm run api:test
```

## 🛠️ Development

```bash
# Start development server with hot reload
npm run dev

# Reset database and start fresh
npm run dev:clean

# Open database GUI
npm run db:studio

# Format code
npm run format

# Lint code
npm run lint
```

## 📊 Namespaces

Namespaces provide data isolation for different contexts:

- `global` - System-wide data
- `org-{id}` - Organization data
- `user-{id}` - Personal data
- `app-{name}` - Application data

## 🔐 Security (Coming Soon)

- JWT Authentication
- Role-based access control
- API rate limiting
- Field-level encryption

## 🚢 Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "run", "start:prod"]
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/akashic
PORT=3000
NODE_ENV=production
```

## 📈 Roadmap

- [x] Core entity system
- [x] Relations and typing
- [x] Event sourcing
- [x] GraphQL API
- [x] CLI tool
- [x] API documentation
- [ ] Process engine
- [ ] Authentication
- [ ] Federation protocol
- [ ] Real-time subscriptions
- [ ] SDK packages

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Fork and clone the repo
git clone https://github.com/yourusername/akashic-core
cd akashic-core

# Create a branch
git checkout -b feature/amazing-feature

# Make your changes and test
npm test

# Submit a pull request
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Built with:
- [NestJS](https://nestjs.com/) - Progressive Node.js framework
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [GraphQL](https://graphql.org/) - Query language for APIs
- [PostgreSQL](https://www.postgresql.org/) - Database

## 📞 Support

- 📖 [Documentation](./docs)
- 💬 [Discord Community](https://discord.gg/akashic)
- 🐛 [Issue Tracker](https://github.com/akashic-core/issues)
- 📧 Email: support@akashic.dev

---

<p align="center">
  Made with ❤️ by the Akashic Core Team
</p>