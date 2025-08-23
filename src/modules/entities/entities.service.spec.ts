import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { EntitiesRepo } from './entities.repo';
import { EntityTypesService } from '../entity-types/entity-types.service';
import { ValidationService } from '../../lib/validation.service';

describe('EntitiesService', () => {
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
            search: jest.fn(),
            count: jest.fn(),
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

  describe('create', () => {
    it('should create an entity with valid data', async () => {
      const namespace = 'default';
      const entityTypeId = 'entity-type-uuid-123';
      const validData = { name: 'Test Entity', value: 42 };

      const mockEntityType = {
        id: entityTypeId,
        name: 'TestType',
        namespace,
        schemaJson: {
          type: 'object',
          properties: { name: { type: 'string' }, value: { type: 'number' } },
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockEntity = {
        id: 'entity-uuid-456',
        namespace,
        entityTypeId,
        entityTypeVersion: 1,
        data: validData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: true,
        errors: undefined,
      });
      repo.createWithEvent.mockResolvedValue(mockEntity);

      const result = await service.create(namespace, entityTypeId, validData);

      expect(entityTypesService.findById).toHaveBeenCalledWith(entityTypeId);
      expect(validationService.validateEntityData).toHaveBeenCalledWith(
        mockEntityType.schemaJson,
        validData,
      );
      expect(repo.createWithEvent).toHaveBeenCalledWith(
        {
          namespace,
          entityTypeId,
          entityTypeVersion: 1,
          data: validData,
        },
        {
          eventType: 'entity.created',
          resourceType: 'entity',
          namespace,
          payload: {
            entityTypeId,
            entityTypeVersion: 1,
            data: validData,
          },
          metadata: {},
        },
      );
      expect(result).toEqual(mockEntity);
    });

    it('should throw BadRequestException when entity type not found', async () => {
      const namespace = 'default';
      const entityTypeId = 'non-existent-type';
      const data = { name: 'Test' };

      entityTypesService.findById.mockResolvedValue(null);

      await expect(
        service.create(namespace, entityTypeId, data),
      ).rejects.toThrow(BadRequestException);

      expect(entityTypesService.findById).toHaveBeenCalledWith(entityTypeId);
      expect(validationService.validateEntityData).not.toHaveBeenCalled();
      expect(repo.createWithEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when validation fails', async () => {
      const namespace = 'default';
      const entityTypeId = 'entity-type-uuid-123';
      const invalidData = { wrongField: 'Test' };

      const mockEntityType = {
        id: entityTypeId,
        name: 'TestType',
        namespace,
        schemaJson: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: false,
        errors: ["must have required property 'name'"],
      });

      await expect(
        service.create(namespace, entityTypeId, invalidData),
      ).rejects.toThrow(BadRequestException);

      expect(entityTypesService.findById).toHaveBeenCalledWith(entityTypeId);
      expect(validationService.validateEntityData).toHaveBeenCalledWith(
        mockEntityType.schemaJson,
        invalidData,
      );
      expect(repo.createWithEvent).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const mockEntities = [
        {
          id: '1',
          namespace: 'default',
          entityTypeId: 'type1',
          entityTypeVersion: 1,
          data: {},
          createdAt: new Date(),
          updatedAt: null,
        },
        {
          id: '2',
          namespace: 'default',
          entityTypeId: 'type2',
          entityTypeVersion: 1,
          data: {},
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      repo.findAll.mockResolvedValue(mockEntities);

      const result = await service.findAll();

      expect(repo.findAll).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(mockEntities);
    });

    it('should filter by namespace and entityTypeId', async () => {
      const namespace = 'test';
      const entityTypeId = 'type1';
      const mockEntities = [
        {
          id: '1',
          namespace,
          entityTypeId,
          entityTypeVersion: 1,
          data: {},
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      repo.findAll.mockResolvedValue(mockEntities);

      const result = await service.findAll(namespace, entityTypeId);

      expect(repo.findAll).toHaveBeenCalledWith(namespace, entityTypeId);
      expect(result).toEqual(mockEntities);
    });
  });

  describe('findById', () => {
    it('should return entity by id', async () => {
      const mockEntity = {
        id: 'entity-id',
        namespace: 'default',
        entityTypeId: 'type1',
        entityTypeVersion: 1,
        data: { name: 'Test' },
        createdAt: new Date(),
        updatedAt: null,
      };

      repo.findById.mockResolvedValue(mockEntity);

      const result = await service.findById('entity-id');

      expect(repo.findById).toHaveBeenCalledWith('entity-id');
      expect(result).toEqual(mockEntity);
    });

    it('should return null when entity not found', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(repo.findById).toHaveBeenCalledWith('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an entity with valid data', async () => {
      const entityId = 'entity-uuid-456';
      const newData = { name: 'Updated Entity', value: 100 };

      const mockExistingEntity = {
        id: entityId,
        namespace: 'default',
        entityTypeId: 'entity-type-uuid-123',
        entityTypeVersion: 1,
        data: { name: 'Old Entity', value: 42 },
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockEntityType = {
        id: 'entity-type-uuid-123',
        name: 'TestType',
        namespace: 'default',
        schemaJson: {
          type: 'object',
          properties: { name: { type: 'string' }, value: { type: 'number' } },
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

      expect(repo.findById).toHaveBeenCalledWith(entityId);
      expect(entityTypesService.findById).toHaveBeenCalledWith(
        mockExistingEntity.entityTypeId,
      );
      expect(validationService.validateEntityData).toHaveBeenCalledWith(
        mockEntityType.schemaJson,
        newData,
      );
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
      expect(result).toEqual(mockUpdatedEntity);
    });

    it('should throw BadRequestException when entity not found', async () => {
      const entityId = 'non-existent';
      const newData = { name: 'Updated' };

      repo.findById.mockResolvedValue(null);

      await expect(service.update(entityId, newData)).rejects.toThrow(
        BadRequestException,
      );

      expect(repo.findById).toHaveBeenCalledWith(entityId);
      expect(entityTypesService.findById).not.toHaveBeenCalled();
      expect(repo.updateWithEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when entity type not found', async () => {
      const entityId = 'entity-id';
      const newData = { name: 'Updated' };

      const mockExistingEntity = {
        id: entityId,
        namespace: 'default',
        entityTypeId: 'type-id',
        entityTypeVersion: 1,
        data: { name: 'Old' },
        createdAt: new Date(),
        updatedAt: null,
      };

      repo.findById.mockResolvedValue(mockExistingEntity);
      entityTypesService.findById.mockResolvedValue(null);

      await expect(service.update(entityId, newData)).rejects.toThrow(
        BadRequestException,
      );

      expect(repo.findById).toHaveBeenCalledWith(entityId);
      expect(entityTypesService.findById).toHaveBeenCalledWith(
        mockExistingEntity.entityTypeId,
      );
      expect(repo.updateWithEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when validation fails', async () => {
      const entityId = 'entity-id';
      const invalidData = { wrongField: 'Test' };

      const mockExistingEntity = {
        id: entityId,
        namespace: 'default',
        entityTypeId: 'type-id',
        entityTypeVersion: 1,
        data: { name: 'Old' },
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockEntityType = {
        id: 'type-id',
        name: 'TestType',
        namespace: 'default',
        schemaJson: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockExistingEntity);
      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: false,
        errors: ["must have required property 'name'"],
      });

      await expect(service.update(entityId, invalidData)).rejects.toThrow(
        BadRequestException,
      );

      expect(repo.updateWithEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when update fails', async () => {
      const entityId = 'entity-id';
      const newData = { name: 'Updated' };

      const mockExistingEntity = {
        id: entityId,
        namespace: 'default',
        entityTypeId: 'type-id',
        entityTypeVersion: 1,
        data: { name: 'Old' },
        createdAt: new Date(),
        updatedAt: null,
      };

      const mockEntityType = {
        id: 'type-id',
        name: 'TestType',
        namespace: 'default',
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
      repo.updateWithEvent.mockResolvedValue(null);

      await expect(service.update(entityId, newData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('search', () => {
    it('should search entities with filter', async () => {
      const filter = {
        namespace: 'default',
        entityTypeId: 'type1',
        limit: 10,
      };

      const mockEntities = [
        {
          id: '1',
          namespace: 'default',
          entityTypeId: 'type1',
          entityTypeVersion: 1,
          data: {},
          createdAt: new Date(),
          updatedAt: null,
        },
      ];

      repo.search.mockResolvedValue(mockEntities);

      const result = await service.search(filter);

      expect(repo.search).toHaveBeenCalledWith(filter);
      expect(result).toEqual(mockEntities);
    });

    it('should handle empty search results', async () => {
      const filter = {
        namespace: 'non-existent',
      };

      repo.search.mockResolvedValue([]);

      const result = await service.search(filter);

      expect(repo.search).toHaveBeenCalledWith(filter);
      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('should count entities with filter', async () => {
      const filter = {
        namespace: 'default',
        entityTypeId: 'type1',
      };

      repo.count.mockResolvedValue(5);

      const result = await service.count(filter);

      expect(repo.count).toHaveBeenCalledWith(filter);
      expect(result).toBe(5);
    });

    it('should return 0 for no matching entities', async () => {
      const filter = {
        namespace: 'non-existent',
      };

      repo.count.mockResolvedValue(0);

      const result = await service.count(filter);

      expect(repo.count).toHaveBeenCalledWith(filter);
      expect(result).toBe(0);
    });
  });
});
