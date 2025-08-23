import { Test, TestingModule } from '@nestjs/testing';
import { EntitiesService } from './entities.service';
import { EntitiesRepo } from './entities.repo';
import { EntityTypesService } from '../entity-types/entity-types.service';
import { ValidationService } from '../../lib/validation.service';

describe('EntitiesService - Transaction Tests', () => {
  let service: EntitiesService;
  let repo: jest.Mocked<EntitiesRepo>;
  let entityTypesService: jest.Mocked<EntityTypesService>;
  let validationService: jest.Mocked<ValidationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitiesService,
        {
          provide: EntitiesRepo,
          useValue: {
            create: jest.fn(),
            createWithEvent: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            updateWithEvent: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: EntityTypesService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: ValidationService,
          useValue: {
            validateEntityData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EntitiesService>(EntitiesService);
    repo = module.get(EntitiesRepo);
    entityTypesService = module.get(EntityTypesService);
    validationService = module.get(ValidationService);
  });

  describe('Transaction Rollback', () => {
    it('should rollback entity creation when event logging fails', async () => {
      const namespace = 'test';
      const entityTypeId = 'type-id';
      const data = { name: 'Test Entity' };

      const mockEntityType = {
        id: entityTypeId,
        name: 'TestType',
        namespace,
        schemaJson: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: true,
        errors: undefined,
      });

      // Simulate event logging failure within transaction
      repo.createWithEvent.mockRejectedValue(new Error('Event logging failed'));

      await expect(
        service.create(namespace, entityTypeId, data),
      ).rejects.toThrow('Event logging failed');

      // Verify that entity creation was attempted but rolled back
      expect(repo.createWithEvent).toHaveBeenCalled();
    });

    it('should rollback entity update when event logging fails', async () => {
      const entityId = 'entity-id';
      const newData = { name: 'Updated Entity' };

      const mockExistingEntity = {
        id: entityId,
        namespace: 'test',
        entityTypeId: 'type-id',
        entityTypeVersion: 1,
        data: { name: 'Old Entity' },
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockEntityType = {
        id: 'type-id',
        name: 'TestType',
        namespace: 'test',
        schemaJson: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockExistingEntity);
      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: true,
        errors: undefined,
      });

      // Simulate event logging failure within transaction
      repo.updateWithEvent.mockRejectedValue(
        new Error('Event logging failed during update'),
      );

      await expect(service.update(entityId, newData)).rejects.toThrow(
        'Event logging failed during update',
      );

      // Verify that update was attempted but rolled back
      expect(repo.updateWithEvent).toHaveBeenCalled();
    });

    it('should maintain data consistency when concurrent transactions conflict', async () => {
      const namespace = 'test';
      const entityTypeId = 'type-id';
      const data1 = { name: 'Entity 1' };
      const data2 = { name: 'Entity 2' };

      const mockEntityType = {
        id: entityTypeId,
        name: 'TestType',
        namespace,
        schemaJson: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: true,
        errors: undefined,
      });

      // Simulate successful first transaction
      const mockEntity1 = {
        id: 'entity-1',
        namespace,
        entityTypeId,
        entityTypeVersion: 1,
        data: data1,
        createdAt: new Date(),
        updatedAt: null,
      };
      repo.createWithEvent.mockResolvedValueOnce(mockEntity1);

      // Simulate constraint violation for second transaction
      repo.createWithEvent.mockRejectedValueOnce(
        new Error('Unique constraint violation'),
      );

      // First creation should succeed
      const result1 = await service.create(namespace, entityTypeId, data1);
      expect(result1).toEqual(mockEntity1);

      // Second creation should fail and rollback
      await expect(
        service.create(namespace, entityTypeId, data2),
      ).rejects.toThrow('Unique constraint violation');
    });
  });

  describe('Transaction Atomicity', () => {
    it('should ensure entity and event are created atomically', async () => {
      const namespace = 'test';
      const entityTypeId = 'type-id';
      const data = { name: 'Atomic Test' };

      const mockEntityType = {
        id: entityTypeId,
        name: 'TestType',
        namespace,
        schemaJson: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEntity = {
        id: 'entity-id',
        namespace,
        entityTypeId,
        entityTypeVersion: 1,
        data,
        createdAt: new Date(),
        updatedAt: null,
      };

      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: true,
        errors: undefined,
      });
      repo.createWithEvent.mockResolvedValue(mockEntity);

      const result = await service.create(namespace, entityTypeId, data);

      expect(result).toEqual(mockEntity);
      expect(repo.createWithEvent).toHaveBeenCalledWith(
        {
          namespace,
          entityTypeId,
          entityTypeVersion: 1,
          data,
        },
        {
          eventType: 'entity.created',
          resourceType: 'entity',
          namespace,
          payload: {
            entityTypeId,
            entityTypeVersion: 1,
            data,
          },
          metadata: {},
        },
      );
    });

    it('should ensure entity update and event are updated atomically', async () => {
      const entityId = 'entity-id';
      const newData = { name: 'Updated Atomically' };

      const mockExistingEntity = {
        id: entityId,
        namespace: 'test',
        entityTypeId: 'type-id',
        entityTypeVersion: 1,
        data: { name: 'Original' },
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockEntityType = {
        id: 'type-id',
        name: 'TestType',
        namespace: 'test',
        schemaJson: {
          type: 'object',
          properties: { name: { type: 'string' } },
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedEntity = {
        ...mockExistingEntity,
        data: newData,
        updatedAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockExistingEntity);
      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: true,
        errors: undefined,
      });
      repo.updateWithEvent.mockResolvedValue(mockUpdatedEntity);

      const result = await service.update(entityId, newData);

      expect(result).toEqual(mockUpdatedEntity);
      expect(repo.updateWithEvent).toHaveBeenCalledWith(entityId, newData, {
        eventType: 'entity.updated',
        resourceType: 'entity',
        resourceId: entityId,
        namespace: mockExistingEntity.namespace,
        payload: {
          entityTypeId: mockExistingEntity.entityTypeId,
          entityTypeVersion: mockExistingEntity.entityTypeVersion,
          oldData: mockExistingEntity.data,
          newData: newData,
        },
        metadata: {},
      });
    });
  });
});
