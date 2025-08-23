import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  describe('validateEntityData', () => {
    it('should validate valid data against a simple schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      };

      const validData = {
        name: 'John Doe',
        age: 30,
      };

      const result = service.validateEntityData(schema, validData);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid data types', () => {
      const schema = {
        type: 'object',
        properties: {
          age: { type: 'number' },
        },
      };

      const invalidData = {
        age: 'not a number',
      };

      const result = service.validateEntityData(schema, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('must be number');
    });

    it('should validate required fields', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['name', 'email'],
      };

      const invalidData = {
        name: 'John Doe',
      };

      const result = service.validateEntityData(schema, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain(
        "must have required property 'email'",
      );
    });

    it('should validate nested objects', () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                },
                required: ['street', 'city'],
              },
            },
            required: ['name', 'address'],
          },
        },
        required: ['user'],
      };

      const validData = {
        user: {
          name: 'John Doe',
          address: {
            street: '123 Main St',
            city: 'New York',
          },
        },
      };

      const result = service.validateEntityData(schema, validData);
      expect(result.valid).toBe(true);
    });

    it('should validate arrays', () => {
      const schema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
            maxItems: 5,
          },
        },
      };

      const validData = {
        tags: ['tag1', 'tag2', 'tag3'],
      };

      const result = service.validateEntityData(schema, validData);
      expect(result.valid).toBe(true);
    });

    it('should reject arrays with invalid items', () => {
      const schema = {
        type: 'object',
        properties: {
          numbers: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      };

      const invalidData = {
        numbers: [1, 2, 'three', 4],
      };

      const result = service.validateEntityData(schema, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('must be number');
    });

    it('should validate format constraints', () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          website: { type: 'string', format: 'uri' },
          birthDate: { type: 'string', format: 'date' },
        },
      };

      const validData = {
        email: 'john@example.com',
        website: 'https://example.com',
        birthDate: '1990-01-01',
      };

      const result = service.validateEntityData(schema, validData);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid formats', () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
      };

      const invalidData = {
        email: 'not-an-email',
      };

      const result = service.validateEntityData(schema, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('must match format "email"');
    });

    it('should validate numeric constraints', () => {
      const schema = {
        type: 'object',
        properties: {
          age: {
            type: 'number',
            minimum: 0,
            maximum: 120,
          },
          score: {
            type: 'number',
            multipleOf: 5,
          },
        },
      };

      const validData = {
        age: 25,
        score: 85,
      };

      const result = service.validateEntityData(schema, validData);
      expect(result.valid).toBe(true);
    });

    it('should reject numbers outside constraints', () => {
      const schema = {
        type: 'object',
        properties: {
          age: {
            type: 'number',
            minimum: 0,
            maximum: 120,
          },
        },
      };

      const invalidData = {
        age: 150,
      };

      const result = service.validateEntityData(schema, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('must be <= 120');
    });

    it('should validate string constraints', () => {
      const schema = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 20,
            pattern: '^[a-zA-Z0-9]+$',
          },
        },
      };

      const validData = {
        username: 'johndoe123',
      };

      const result = service.validateEntityData(schema, validData);
      expect(result.valid).toBe(true);
    });

    it('should reject strings that do not match pattern', () => {
      const schema = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            pattern: '^[a-zA-Z0-9]+$',
          },
        },
      };

      const invalidData = {
        username: 'john-doe',
      };

      const result = service.validateEntityData(schema, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('must match pattern');
    });

    it('should handle schema compilation errors gracefully', () => {
      const invalidSchema = {
        type: 'invalid-type',
      };

      const data = { test: 'data' };

      const result = service.validateEntityData(invalidSchema, data);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Schema compilation error');
    });

    it('should allow additional properties by default', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      };

      const dataWithExtra = {
        name: 'John',
        extraField: 'extra value',
      };

      const result = service.validateEntityData(schema, dataWithExtra);
      expect(result.valid).toBe(true);
    });

    it('should return all validation errors', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
          email: { type: 'string', format: 'email' },
        },
        required: ['name', 'age', 'email'],
      };

      const invalidData = {
        age: 'not a number',
        email: 'not-an-email',
      };

      const result = service.validateEntityData(schema, invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(1);
    });
  });

  describe('validateSchema', () => {
    it('should validate a valid JSON schema', () => {
      const validSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      };

      const result = service.validateSchema(validSchema);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid schema with unknown type', () => {
      const invalidSchema = {
        type: 'invalid-type',
      };

      const result = service.validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('type');
    });

    it('should validate complex nested schemas', () => {
      const complexSchema = {
        type: 'object',
        properties: {
          users: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                roles: {
                  type: 'array',
                  items: { type: 'string', enum: ['admin', 'user', 'guest'] },
                },
              },
              required: ['id', 'name'],
            },
          },
        },
      };

      const result = service.validateSchema(complexSchema);
      expect(result.valid).toBe(true);
    });

    it('should reject schema with invalid property definitions', () => {
      const invalidSchema = {
        type: 'object',
        properties: {
          name: { type: ['string', 'invalid'] },
        },
      };

      const result = service.validateSchema(invalidSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate schemas with references', () => {
      const schemaWithDefs = {
        $defs: {
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
        },
        type: 'object',
        properties: {
          billingAddress: { $ref: '#/$defs/address' },
          shippingAddress: { $ref: '#/$defs/address' },
        },
      };

      const result = service.validateSchema(schemaWithDefs);
      expect(result.valid).toBe(true);
    });
  });
});
