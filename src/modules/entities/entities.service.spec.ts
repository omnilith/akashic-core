import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EntitiesService } from './entities.service';
import { EntitiesRepo } from './entities.repo';
import { EntityTypesService } from '../entity-types/entity-types.service';
import { ValidationService } from '../../lib/validation.service';
import { EventsService } from '../events/events.service';

describe('EntitiesService', () => {
  let service: EntitiesService;
  let repo: jest.Mocked<EntitiesRepo>;
  let entityTypesService: jest.Mocked<EntityTypesService>;
  let eventsService: jest.Mocked<EventsService>;
  let validationService: jest.Mocked<ValidationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntitiesService,
        {
          provide: EntitiesRepo,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
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
          provide: EventsService,
          useValue: {
            logEvent: jest.fn(),
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
    eventsService = module.get(EventsService);
    validationService = module.get(ValidationService);
  });

  describe('create', () => {
    const namespace = 'test-namespace';
    const entityTypeId = 'type-uuid-123';
    const validData = {
      name: 'John Doe',
      age: 30,
    };

    it('should create an entity with valid data', async () => {
      const mockEntityType = {
        id: entityTypeId,
        namespace,
        name: 'Person',
        version: 1,
        schemaJson: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name'],
        },
        createdAt: new Date(),
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
        errors: null,
      });
      repo.create.mockResolvedValue(mockEntity);
      eventsService.logEvent.mockResolvedValue(undefined);

      const result = await service.create(namespace, entityTypeId, validData);

      expect(entityTypesService.findById).toHaveBeenCalledWith(entityTypeId);
      expect(validationService.validateEntityData).toHaveBeenCalledWith(
        mockEntityType.schemaJson,
        validData,
      );
      expect(repo.create).toHaveBeenCalledWith({
        namespace,
        entityTypeId,
        entityTypeVersion: 1,
        data: validData,
      });
      expect(eventsService.logEvent).toHaveBeenCalledWith({
        eventType: 'entity.created',
        resourceType: 'entity',
        resourceId: mockEntity.id,
        namespace,
        payload: {
          entityTypeId,
          entityTypeVersion: 1,
          data: validData,
        },
      });
      expect(result).toEqual(mockEntity);
    });

    it('should throw BadRequestException when entity type not found', async () => {
      entityTypesService.findById.mockResolvedValue(null);

      await expect(
        service.create(namespace, entityTypeId, validData),
      ).rejects.toThrow(BadRequestException);

      expect(validationService.validateEntityData).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when validation fails', async () => {
      const mockEntityType = {
        id: entityTypeId,
        namespace,
        name: 'Person',
        version: 1,
        schemaJson: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name', 'age'],
        },
        createdAt: new Date(),
      };

      const invalidData = { name: 'John' }; // Missing required age

      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: false,
        errors: ['Missing required field: age'],
      });

      await expect(
        service.create(namespace, entityTypeId, invalidData),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all entities', async () => {
      const mockEntities = [
        {
          id: 'entity-1',
          namespace: 'ns1',
          entityTypeId: 'type-1',
          entityTypeVersion: 1,
          data: { name: 'Entity 1' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'entity-2',
          namespace: 'ns2',
          entityTypeId: 'type-2',
          entityTypeVersion: 1,
          data: { name: 'Entity 2' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      repo.findAll.mockResolvedValue(mockEntities);

      const result = await service.findAll();

      expect(repo.findAll).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(mockEntities);
    });

    it('should filter by namespace and entityTypeId', async () => {
      const namespace = 'specific-ns';
      const entityTypeId = 'specific-type';
      const mockEntities = [
        {
          id: 'entity-1',
          namespace,
          entityTypeId,
          entityTypeVersion: 1,
          data: { name: 'Filtered Entity' },
          createdAt: new Date(),
          updatedAt: new Date(),
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
        id: 'entity-uuid-123',
        namespace: 'test',
        entityTypeId: 'type-uuid',
        entityTypeVersion: 1,
        data: { name: 'Test Entity' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockEntity);

      const result = await service.findById('entity-uuid-123');

      expect(repo.findById).toHaveBeenCalledWith('entity-uuid-123');
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
    const entityId = 'entity-uuid-123';
    const entityTypeId = 'type-uuid-456';
    const namespace = 'test-namespace';
    const newData = {
      name: 'Jane Doe',
      age: 35,
    };

    const mockExistingEntity = {
      id: entityId,
      namespace,
      entityTypeId,
      entityTypeVersion: 1,
      data: { name: 'John Doe', age: 30 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockEntityType = {
      id: entityTypeId,
      namespace,
      name: 'Person',
      version: 1,
      schemaJson: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      },
      createdAt: new Date(),
    };

    it('should update an entity with valid data', async () => {
      const mockUpdatedEntity = {
        ...mockExistingEntity,
        data: newData,
        updatedAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockExistingEntity);
      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: true,
        errors: null,
      });
      repo.update.mockResolvedValue(mockUpdatedEntity);
      eventsService.logEvent.mockResolvedValue(undefined);

      const result = await service.update(entityId, newData);

      expect(repo.findById).toHaveBeenCalledWith(entityId);
      expect(entityTypesService.findById).toHaveBeenCalledWith(entityTypeId);
      expect(validationService.validateEntityData).toHaveBeenCalledWith(
        mockEntityType.schemaJson,
        newData,
      );
      expect(repo.update).toHaveBeenCalledWith(entityId, newData);
      expect(eventsService.logEvent).toHaveBeenCalledWith({
        eventType: 'entity.updated',
        resourceType: 'entity',
        resourceId: entityId,
        namespace,
        payload: {
          entityTypeId,
          entityTypeVersion: 1,
          oldData: mockExistingEntity.data,
          newData,
        },
      });
      expect(result).toEqual(mockUpdatedEntity);
    });

    it('should throw BadRequestException when entity not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.update(entityId, newData)).rejects.toThrow(
        new BadRequestException('Entity not found'),
      );

      expect(entityTypesService.findById).not.toHaveBeenCalled();
      expect(validationService.validateEntityData).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when entity type not found', async () => {
      repo.findById.mockResolvedValue(mockExistingEntity);
      entityTypesService.findById.mockResolvedValue(null);

      await expect(service.update(entityId, newData)).rejects.toThrow(
        new BadRequestException('EntityType not found'),
      );

      expect(validationService.validateEntityData).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when validation fails', async () => {
      const invalidData = { name: 123 }; // Name should be string

      repo.findById.mockResolvedValue(mockExistingEntity);
      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: false,
        errors: ['name: must be string'],
      });

      await expect(service.update(entityId, invalidData)).rejects.toThrow(
        new BadRequestException('Validation failed: name: must be string'),
      );

      expect(repo.update).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when update fails', async () => {
      repo.findById.mockResolvedValue(mockExistingEntity);
      entityTypesService.findById.mockResolvedValue(mockEntityType);
      validationService.validateEntityData.mockReturnValue({
        valid: true,
        errors: null,
      });
      repo.update.mockResolvedValue(null);

      await expect(service.update(entityId, newData)).rejects.toThrow(
        new BadRequestException('Failed to update entity'),
      );

      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });
  });
});
