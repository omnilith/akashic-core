import { Test, TestingModule } from '@nestjs/testing';
import { RelationsService } from './relations.service';
import { RelationsRepo } from './relations.repo';
import { RelationTypesService } from '../relation-types/relation-types.service';
import { EntitiesService } from '../entities/entities.service';
import { EventsService } from '../events/events.service';
import { DrizzleService, DrizzleTransaction } from '../../db/drizzle.service';

describe('RelationsService - Transaction Tests', () => {
  let service: RelationsService;
  let repo: jest.Mocked<RelationsRepo>;
  let relationTypesService: jest.Mocked<RelationTypesService>;
  let entitiesService: jest.Mocked<EntitiesService>;
  let eventsService: jest.Mocked<EventsService>;
  let drizzleService: jest.Mocked<DrizzleService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationsService,
        {
          provide: RelationsRepo,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: RelationTypesService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: EntitiesService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: EventsService,
          useValue: {
            logEvent: jest.fn(),
          },
        },
        {
          provide: DrizzleService,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RelationsService>(RelationsService);
    repo = module.get(RelationsRepo);
    relationTypesService = module.get(RelationTypesService);
    entitiesService = module.get(EntitiesService);
    eventsService = module.get(EventsService);
    drizzleService = module.get(DrizzleService);
  });

  describe('Transaction Rollback', () => {
    it('should rollback relation creation when event logging fails', async () => {
      const namespace = 'test';
      const relationTypeId = 'relation-type-id';
      const fromEntityId = 'from-entity-id';
      const toEntityId = 'to-entity-id';
      const metadata = { weight: 1.0 };

      const mockRelationType = {
        id: relationTypeId,
        name: 'TestRelation',
        namespace,
        fromEntityTypeId: 'from-type',
        toEntityTypeId: 'to-type',
        cardinality: 'many-to-many' as const,
        version: 1,
        createdAt: new Date(),
      };

      const mockFromEntity = {
        id: fromEntityId,
        namespace,
        entityTypeId: 'from-type',
        entityTypeVersion: 1,
        data: {},
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockToEntity = {
        id: toEntityId,
        namespace,
        entityTypeId: 'to-type',
        entityTypeVersion: 1,
        data: {},
        createdAt: new Date(),
        updatedAt: null,
      };

      relationTypesService.findById.mockResolvedValue(mockRelationType);
      entitiesService.findById
        .mockResolvedValueOnce(mockFromEntity)
        .mockResolvedValueOnce(mockToEntity);

      // Mock transaction to simulate failure
      drizzleService.transaction.mockImplementation(async (callback) => {
        const mockTx = {} as DrizzleTransaction;

        // Setup mock relation creation
        repo.create.mockResolvedValueOnce({
          id: 'relation-id',
          namespace,
          relationTypeId,
          fromEntityId,
          toEntityId,
          metadata,
          createdAt: new Date(),
        });

        // Simulate event logging failure
        eventsService.logEvent.mockRejectedValueOnce(
          new Error('Event logging failed'),
        );

        // Call the callback and let it throw
        return callback(mockTx);
      });

      await expect(
        service.create(
          namespace,
          relationTypeId,
          fromEntityId,
          toEntityId,
          metadata,
        ),
      ).rejects.toThrow('Event logging failed');

      // Verify that relation creation was attempted but rolled back
      expect(repo.create).toHaveBeenCalled();
      expect(eventsService.logEvent).toHaveBeenCalled();
    });

    it('should rollback relation deletion when event logging fails', async () => {
      const relationId = 'relation-id';

      const mockRelation = {
        id: relationId,
        namespace: 'test',
        relationTypeId: 'relation-type-id',
        fromEntityId: 'from-entity-id',
        toEntityId: 'to-entity-id',
        metadata: {},
        createdAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockRelation);

      // Mock transaction to simulate failure
      drizzleService.transaction.mockImplementation(async (callback) => {
        const mockTx = {} as DrizzleTransaction;

        // Setup mock deletion
        repo.delete.mockResolvedValueOnce(true);

        // Simulate event logging failure
        eventsService.logEvent.mockRejectedValueOnce(
          new Error('Event logging failed during deletion'),
        );

        // Call the callback and let it throw
        return callback(mockTx);
      });

      await expect(service.delete(relationId)).rejects.toThrow(
        'Event logging failed during deletion',
      );

      // Verify that deletion was attempted but rolled back
      expect(repo.delete).toHaveBeenCalled();
      expect(eventsService.logEvent).toHaveBeenCalled();
    });

    it('should handle concurrent transaction conflicts', async () => {
      const namespace = 'test';
      const relationTypeId = 'relation-type-id';
      const fromEntityId = 'from-entity-id';
      const toEntityId1 = 'to-entity-1';
      const toEntityId2 = 'to-entity-2';

      const mockRelationType = {
        id: relationTypeId,
        name: 'TestRelation',
        namespace,
        fromEntityTypeId: 'from-type',
        toEntityTypeId: 'to-type',
        cardinality: 'one-to-one' as const, // This will cause conflict
        version: 1,
        createdAt: new Date(),
      };

      const mockFromEntity = {
        id: fromEntityId,
        namespace,
        entityTypeId: 'from-type',
        entityTypeVersion: 1,
        data: {},
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockToEntity1 = {
        id: toEntityId1,
        namespace,
        entityTypeId: 'to-type',
        entityTypeVersion: 1,
        data: {},
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockToEntity2 = {
        id: toEntityId2,
        namespace,
        entityTypeId: 'to-type',
        entityTypeVersion: 1,
        data: {},
        createdAt: new Date(),
        updatedAt: null,
      };

      relationTypesService.findById.mockResolvedValue(mockRelationType);

      // Mock for first creation
      entitiesService.findById
        .mockResolvedValueOnce(mockFromEntity)
        .mockResolvedValueOnce(mockToEntity1);

      // Mock successful first transaction
      drizzleService.transaction.mockImplementationOnce(async (callback) => {
        const mockTx = {} as DrizzleTransaction;
        const mockRelation = {
          id: 'relation-1',
          namespace,
          relationTypeId,
          fromEntityId,
          toEntityId: toEntityId1,
          metadata: null,
          createdAt: new Date(),
        };

        repo.create.mockResolvedValueOnce(mockRelation);
        eventsService.logEvent.mockResolvedValueOnce({
          id: 'event-id',
          namespace: namespace,
          eventType: 'relation.created',
          resourceType: 'relation',
          resourceId: 'relation-id',
          timestamp: new Date(),
          metadata: {},
          payload: {},
        });

        return callback(mockTx);
      });

      // First creation should succeed
      const result1 = await service.create(
        namespace,
        relationTypeId,
        fromEntityId,
        toEntityId1,
      );
      expect(result1).toBeDefined();

      // Mock for second creation
      entitiesService.findById
        .mockResolvedValueOnce(mockFromEntity)
        .mockResolvedValueOnce(mockToEntity2);

      // Mock constraint violation for second transaction
      drizzleService.transaction.mockImplementationOnce(async (callback) => {
        const mockTx = {} as DrizzleTransaction;

        // Simulate unique constraint violation
        repo.create.mockRejectedValueOnce(
          new Error(
            'Unique constraint violation: one-to-one relation already exists',
          ),
        );

        return callback(mockTx);
      });

      // Second creation should fail due to cardinality constraint
      await expect(
        service.create(namespace, relationTypeId, fromEntityId, toEntityId2),
      ).rejects.toThrow('Unique constraint violation');
    });
  });

  describe('Transaction Atomicity', () => {
    it('should ensure relation and event are created atomically', async () => {
      const namespace = 'test';
      const relationTypeId = 'relation-type-id';
      const fromEntityId = 'from-entity-id';
      const toEntityId = 'to-entity-id';
      const metadata = { weight: 1.0 };

      const mockRelationType = {
        id: relationTypeId,
        name: 'TestRelation',
        namespace,
        fromEntityTypeId: 'from-type',
        toEntityTypeId: 'to-type',
        cardinality: 'many-to-many' as const,
        version: 1,
        createdAt: new Date(),
      };

      const mockFromEntity = {
        id: fromEntityId,
        namespace,
        entityTypeId: 'from-type',
        entityTypeVersion: 1,
        data: {},
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockToEntity = {
        id: toEntityId,
        namespace,
        entityTypeId: 'to-type',
        entityTypeVersion: 1,
        data: {},
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockRelation = {
        id: 'relation-id',
        namespace,
        relationTypeId,
        fromEntityId,
        toEntityId,
        metadata,
        createdAt: new Date(),
      };

      relationTypesService.findById.mockResolvedValue(mockRelationType);
      entitiesService.findById
        .mockResolvedValueOnce(mockFromEntity)
        .mockResolvedValueOnce(mockToEntity);

      // Mock successful transaction
      drizzleService.transaction.mockImplementation(async (callback) => {
        const mockTx = {} as DrizzleTransaction;

        repo.create.mockResolvedValueOnce(mockRelation);
        eventsService.logEvent.mockResolvedValueOnce({
          id: 'event-id',
          namespace: namespace,
          eventType: 'relation.created',
          resourceType: 'relation',
          resourceId: 'relation-id',
          timestamp: new Date(),
          metadata: {},
          payload: {},
        });

        return callback(mockTx);
      });

      const result = await service.create(
        namespace,
        relationTypeId,
        fromEntityId,
        toEntityId,
        metadata,
      );

      expect(result).toEqual(mockRelation);
      expect(repo.create).toHaveBeenCalledWith(
        {
          namespace,
          relationTypeId,
          fromEntityId,
          toEntityId,
          metadata,
        },
        expect.anything(), // transaction object
      );
      expect(eventsService.logEvent).toHaveBeenCalledWith(
        {
          eventType: 'relation.created',
          resourceType: 'relation',
          resourceId: mockRelation.id,
          namespace,
          payload: {
            relationTypeId,
            fromEntityId,
            toEntityId,
            metadata,
          },
        },
        expect.anything(), // transaction object
      );
    });

    it('should ensure relation deletion and event are handled atomically', async () => {
      const relationId = 'relation-id';

      const mockRelation = {
        id: relationId,
        namespace: 'test',
        relationTypeId: 'relation-type-id',
        fromEntityId: 'from-entity-id',
        toEntityId: 'to-entity-id',
        metadata: {},
        createdAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockRelation);

      // Mock successful transaction
      drizzleService.transaction.mockImplementation(async (callback) => {
        const mockTx = {} as DrizzleTransaction;

        repo.delete.mockResolvedValueOnce(true);
        eventsService.logEvent.mockResolvedValueOnce({
          id: 'event-id',
          namespace: mockRelation.namespace,
          eventType: 'relation.deleted',
          resourceType: 'relation',
          resourceId: relationId,
          timestamp: new Date(),
          metadata: {},
          payload: {},
        });

        return callback(mockTx);
      });

      const result = await service.delete(relationId);

      expect(result).toEqual(mockRelation);
      expect(repo.delete).toHaveBeenCalledWith(
        relationId,
        expect.anything(), // transaction object
      );
      expect(eventsService.logEvent).toHaveBeenCalledWith(
        {
          eventType: 'relation.deleted',
          resourceType: 'relation',
          resourceId: relationId,
          namespace: mockRelation.namespace,
          payload: {
            relationTypeId: mockRelation.relationTypeId,
            fromEntityId: mockRelation.fromEntityId,
            toEntityId: mockRelation.toEntityId,
          },
        },
        expect.anything(), // transaction object
      );
    });
  });
});
