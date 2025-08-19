import { Test, TestingModule } from '@nestjs/testing';
import { QueryBuilderService } from './query-builder.service';
import { EntityFilterInput, QueryOperator } from './dto/query-filter.dto';

describe('QueryBuilderService', () => {
  let service: QueryBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryBuilderService],
    }).compile();

    service = module.get<QueryBuilderService>(QueryBuilderService);
  });

  describe('buildWhereConditions', () => {
    it('should build conditions for namespace filter', () => {
      const filter: EntityFilterInput = {
        namespace: 'test-namespace',
      };

      const conditions = service.buildWhereConditions(filter);

      expect(conditions).toHaveLength(1);
      // We can't directly compare SQL objects, but we can check the array has content
      expect(conditions[0]).toBeDefined();
    });

    it('should build conditions for entityTypeId filter', () => {
      const filter: EntityFilterInput = {
        entityTypeId: 'type-123',
      };

      const conditions = service.buildWhereConditions(filter);

      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should build conditions for date range filters', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const filter: EntityFilterInput = {
        createdAfter: yesterday,
        createdBefore: tomorrow,
        updatedAfter: yesterday,
        updatedBefore: tomorrow,
      };

      const conditions = service.buildWhereConditions(filter);

      expect(conditions).toHaveLength(4);
      conditions.forEach((condition) => {
        expect(condition).toBeDefined();
      });
    });

    it('should build conditions for JSON data filters with direct equality', () => {
      const filter: EntityFilterInput = {
        data: {
          status: 'active',
          priority: 'high',
        },
      };

      const conditions = service.buildWhereConditions(filter);

      // Multiple data conditions are combined into one AND condition
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should build conditions for JSON data filters with operators', () => {
      const filter: EntityFilterInput = {
        data: {
          age: { [QueryOperator.GREATER_THAN]: 18 },
          score: { [QueryOperator.LESS_THAN_OR_EQUAL]: 100 },
          status: { [QueryOperator.IN]: ['active', 'pending'] },
        },
      };

      const conditions = service.buildWhereConditions(filter);

      // Multiple data conditions are combined into one AND condition
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should handle empty filter', () => {
      const filter: EntityFilterInput = {};

      const conditions = service.buildWhereConditions(filter);

      expect(conditions).toHaveLength(0);
    });

    it('should handle complex nested conditions', () => {
      const filter: EntityFilterInput = {
        namespace: 'test',
        entityTypeId: 'type-123',
        data: {
          status: 'active',
          'nested.field': 'value',
          count: { [QueryOperator.GREATER_THAN_OR_EQUAL]: 10 },
        },
        createdAfter: new Date('2024-01-01'),
        limit: 10,
        offset: 5,
      };

      const conditions = service.buildWhereConditions(filter);

      // Should have namespace, entityTypeId, 1 combined data condition, and createdAfter
      expect(conditions).toHaveLength(4);
      conditions.forEach((condition) => {
        expect(condition).toBeDefined();
      });
    });
  });

  describe('buildOrderBy', () => {
    it('should default to createdAt DESC when no sort provided', () => {
      const orderBy = service.buildOrderBy();

      expect(orderBy).toHaveLength(1);
      expect(orderBy[0]).toBeDefined();
    });

    it('should build ORDER BY for regular fields', () => {
      const sort = [
        { field: 'createdAt', direction: 'ASC' as const },
        { field: 'updatedAt', direction: 'DESC' as const },
      ];

      const orderBy = service.buildOrderBy(sort);

      expect(orderBy).toHaveLength(2);
      orderBy.forEach((order) => {
        expect(order).toBeDefined();
      });
    });

    it('should build ORDER BY for JSON fields', () => {
      const sort = [
        { field: 'data.name', direction: 'ASC' as const },
        { field: 'data.priority', direction: 'DESC' as const },
      ];

      const orderBy = service.buildOrderBy(sort);

      expect(orderBy).toHaveLength(2);
      orderBy.forEach((order) => {
        expect(order).toBeDefined();
      });
    });

    it('should handle invalid field names gracefully', () => {
      const sort = [{ field: 'nonexistent', direction: 'ASC' as const }];

      const orderBy = service.buildOrderBy(sort);

      expect(orderBy).toHaveLength(1);
      expect(orderBy[0]).toBeDefined();
    });
  });

  describe('JSON operator conditions', () => {
    it('should handle EQUALS operator', () => {
      const filter: EntityFilterInput = {
        data: {
          field: { [QueryOperator.EQUALS]: 'value' },
        },
      };

      const conditions = service.buildWhereConditions(filter);

      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should handle NOT_EQUALS operator', () => {
      const filter: EntityFilterInput = {
        data: {
          field: { [QueryOperator.NOT_EQUALS]: 'value' },
        },
      };

      const conditions = service.buildWhereConditions(filter);

      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should handle numeric comparison operators', () => {
      const filter: EntityFilterInput = {
        data: {
          age: { [QueryOperator.GREATER_THAN]: 18 },
          score: { [QueryOperator.LESS_THAN]: 100 },
          level: { [QueryOperator.GREATER_THAN_OR_EQUAL]: 5 },
          rank: { [QueryOperator.LESS_THAN_OR_EQUAL]: 10 },
        },
      };

      const conditions = service.buildWhereConditions(filter);

      // All data conditions are combined into one
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should handle IN and NOT_IN operators', () => {
      const filter: EntityFilterInput = {
        data: {
          status: { [QueryOperator.IN]: ['active', 'pending'] },
          role: { [QueryOperator.NOT_IN]: ['admin', 'superuser'] },
        },
      };

      const conditions = service.buildWhereConditions(filter);

      // All data conditions are combined into one
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should handle CONTAINS operator', () => {
      const filter: EntityFilterInput = {
        data: {
          tags: { [QueryOperator.CONTAINS]: 'important' },
        },
      };

      const conditions = service.buildWhereConditions(filter);

      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should handle EXISTS operator', () => {
      const filter: EntityFilterInput = {
        data: {
          optionalField: { [QueryOperator.EXISTS]: true },
          deletedField: { [QueryOperator.EXISTS]: false },
        },
      };

      const conditions = service.buildWhereConditions(filter);

      // All data conditions are combined into one
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should handle REGEX operator', () => {
      const filter: EntityFilterInput = {
        data: {
          email: { [QueryOperator.REGEX]: '^[a-z]+@example\\.com$' },
        },
      };

      const conditions = service.buildWhereConditions(filter);

      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should handle null values correctly', () => {
      const filter: EntityFilterInput = {
        data: {
          nullableField: null,
        },
      };

      const conditions = service.buildWhereConditions(filter);

      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });

    it('should handle nested field paths', () => {
      const filter: EntityFilterInput = {
        data: {
          'user.profile.name': 'John',
          'settings.notifications.email': true,
          'scores[0]': { [QueryOperator.GREATER_THAN]: 90 },
        },
      };

      const conditions = service.buildWhereConditions(filter);

      // All data conditions are combined into one
      expect(conditions).toHaveLength(1);
      expect(conditions[0]).toBeDefined();
    });
  });
});
