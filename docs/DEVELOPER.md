# Akashic Core Developer Guide

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/akashic-core
cd akashic-core

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Set up database
npm run db:migrate

# Seed example data (optional)
npm run seed

# Start development server
npm run dev
```

## Available Scripts

### Development

```bash
npm run dev              # Start development server with hot reload
npm run dev:clean        # Reset DB, migrate, seed, and start
npm run build            # Build for production
npm run start:prod       # Start production server
```

### Database

```bash
npm run db:generate      # Generate migration from schema changes
npm run db:migrate       # Run pending migrations
npm run db:studio        # Open Drizzle Studio (DB GUI)
npm run db:reset         # Reset database (WARNING: deletes all data)
```

### Testing

```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:cov         # Generate coverage report
npm run api:test         # Test API queries
npm run api:health       # Check API health
```

### Utilities

```bash
npm run seed             # Create example data
npm run cli              # Run CLI tool
npm run format           # Format code with Prettier
npm run lint             # Lint and fix code
```

## CLI Usage

The Akashic CLI provides quick access to common operations:

```bash
# Make CLI globally available
npm link

# Or use directly
npm run cli -- <command>
```

### Examples

```bash
# List entity types
akashic types

# Create an entity type
akashic create-type --name User --schema ./schemas/user.json

# Create an entity
akashic create --type <type-id> --data ./data/user.json

# View events
akashic events --limit 20
```

## API Endpoints

### REST API Documentation
- Swagger UI: http://localhost:3000/api
- OpenAPI JSON: http://localhost:3000/api-json

### GraphQL
- Playground: http://localhost:3000/graphql
- Endpoint: http://localhost:3000/graphql

## Project Structure

```
akashic-core/
├── src/
│   ├── modules/           # Feature modules
│   │   ├── entities/      # Entity management
│   │   ├── entity-types/  # Schema definitions
│   │   ├── relations/     # Relationships
│   │   ├── events/        # Event sourcing
│   │   └── processes/     # Workflow engine
│   ├── db/                # Database layer
│   │   ├── schema.ts      # Drizzle schema
│   │   └── migrations/    # SQL migrations
│   ├── lib/               # Shared utilities
│   └── main.ts            # Application entry
├── scripts/               # Utility scripts
├── cli/                   # CLI tool
├── docs/                  # Documentation
└── test/                  # E2E tests
```

## Development Workflow

### 1. Adding a New Entity Type

```typescript
// 1. Define the JSON Schema
const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    email: { type: "string", format: "email" }
  },
  required: ["name", "email"]
};

// 2. Create via CLI
akashic create-type --name User --schema ./user-schema.json

// 3. Or via GraphQL
mutation {
  createEntityType(input: {
    namespace: "myapp",
    name: "User",
    schema: "{...}"
  }) {
    id
  }
}
```

### 2. Working with Entities

```typescript
// Create an entity
const user = await client.entities.create({
  namespace: "myapp",
  entityTypeId: "type-uuid",
  data: JSON.stringify({
    name: "John Doe",
    email: "john@example.com"
  })
});

// Query entities
const users = await client.entities.find({
  namespace: "myapp",
  entityTypeId: "type-uuid"
});
```

### 3. Creating Relationships

```typescript
// Define relation type
const relationType = await client.relationTypes.create({
  namespace: "myapp",
  name: "author",
  fromEntityTypeId: "user-type",
  toEntityTypeId: "post-type",
  cardinality: "1..n"
});

// Create relation
const relation = await client.relations.create({
  namespace: "myapp",
  relationTypeId: relationType.id,
  fromEntityId: "user-uuid",
  toEntityId: "post-uuid"
});
```

## Testing

### Unit Tests

```bash
# Run specific test file
npm test -- entities.service.spec.ts

# Run with coverage
npm run test:cov
```

### Integration Tests

```bash
# Start server
npm run dev

# In another terminal
npm run api:test
```

### Writing Tests

```typescript
import { Test } from '@nestjs/testing';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MyService],
    }).compile();

    service = module.get<MyService>(MyService);
  });

  it('should work', () => {
    expect(service.doSomething()).toBe('result');
  });
});
```

## Database Management

### Migrations

```bash
# After modifying schema.ts
npm run db:generate

# Apply migrations
npm run db:migrate

# View database
npm run db:studio
```

### Schema Changes

1. Edit `src/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Review generated SQL in `src/db/migrations/`
4. Apply: `npm run db:migrate`

## Debugging

### VS Code Launch Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Nest",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Common Issues

**Port already in use:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Database connection errors:**
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**Migration errors:**
```bash
# Reset and start fresh
npm run db:reset
npm run db:migrate
```

## Environment Variables

```bash
# .env file
DATABASE_URL=postgresql://user:pass@localhost:5432/akashic
PORT=3000
NODE_ENV=development

# CLI specific
AKASHIC_API_URL=http://localhost:3000/graphql
AKASHIC_NAMESPACE=default
```

## Performance Tips

1. **Use pagination** for large datasets
2. **Cache entity types** - they rarely change
3. **Use indexes** on frequently queried fields
4. **Batch operations** when possible
5. **Monitor event log size** - consider archiving old events

## Security Considerations

1. **Validate all inputs** against JSON Schema
2. **Use namespaces** for multi-tenancy
3. **Implement rate limiting** before production
4. **Add authentication** (coming soon)
5. **Sanitize metadata** in relations
6. **Review event log** for sensitive data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

### Code Style

- Use Prettier for formatting
- Follow NestJS conventions
- Write descriptive commit messages
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/main"]
```

### Environment Setup

```bash
# Production
NODE_ENV=production
DATABASE_URL=postgresql://...
PORT=3000
```

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [JSON Schema Reference](https://json-schema.org)
- [Drizzle ORM Docs](https://orm.drizzle.team)

## Support

- GitHub Issues: Report bugs and request features
- Discord: Join our community
- Documentation: Check `/docs` folder

## License

MIT