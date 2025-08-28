import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EntityTypesService } from './entity-types.service';
import { EntityTypesRepo } from './entity-types.repo';
import { ValidationService } from '../../lib/validation.service';
import { EventsService } from '../events/events.service';

describe('EntityTypesService', () => {
  let service: EntityTypesService;
  let repo: jest.Mocked<EntityTypesRepo>;
  let eventsService: jest.Mocked<EventsService>;
  let validationService: jest.Mocked<ValidationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityTypesService,
        {
          provide: EntityTypesRepo,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByNameAndNamespace: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            hasEntities: jest.fn(),
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
            validateSchema: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EntityTypesService>(EntityTypesService);
    repo = module.get(EntityTypesRepo);
    eventsService = module.get(EventsService);
    validationService = module.get(ValidationService);
  });

  describe('create', () => {
    const namespace = 'test-namespace';
    const name = 'TestEntity';
    const validSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    };
    const schemaString = JSON.stringify(validSchema);

    it('should create an entity type with valid schema', async () => {
      const mockEntityType = {
        id: 'uuid-123',
        namespace,
        name,
        schema: validSchema,
        version: 1,
        createdAt: new Date(),
      };

      validationService.validateSchema.mockReturnValue({
        valid: true,
        errors: undefined,
      });
      repo.create.mockResolvedValue(mockEntityType);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'default',
        eventType: 'entity-type.created',
        resourceType: 'entity-type',
        resourceId: mockEntityType.id,
        timestamp: new Date(),
        metadata: {},
        payload: mockEntityType,
      });

      const result = await service.create(namespace, name, schemaString);

      expect(validationService.validateSchema).toHaveBeenCalledWith(
        validSchema,
      );
      expect(repo.create).toHaveBeenCalledWith({
        namespace,
        name,
        schema: validSchema,
      });
      expect(eventsService.logEvent).toHaveBeenCalledWith({
        eventType: 'entity_type.created',
        resourceType: 'entity_type',
        resourceId: mockEntityType.id,
        namespace,
        payload: {
          name,
          schema: validSchema,
          version: 1,
        },
      });
      expect(result).toEqual(mockEntityType);
    });

    it('should throw BadRequestException for invalid schema', async () => {
      const invalidSchemaString = JSON.stringify({ invalid: 'schema' });

      validationService.validateSchema.mockReturnValue({
        valid: false,
        errors: ['Invalid type: undefined'],
      });

      await expect(
        service.create(namespace, name, invalidSchemaString),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw error for invalid JSON', async () => {
      const invalidJson = '{ invalid json }';

      await expect(
        service.create(namespace, name, invalidJson),
      ).rejects.toThrow();

      expect(validationService.validateSchema).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all entity types', async () => {
      const mockEntityTypes = [
        {
          id: 'uuid-1',
          namespace: 'ns1',
          name: 'Entity1',
          schema: {},
          version: 1,
          createdAt: new Date(),
        },
        {
          id: 'uuid-2',
          namespace: 'ns2',
          name: 'Entity2',
          schema: {},
          version: 1,
          createdAt: new Date(),
        },
      ];

      repo.findAll.mockResolvedValue(mockEntityTypes);

      const result = await service.findAll();

      expect(repo.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockEntityTypes);
    });

    it('should filter by namespace when provided', async () => {
      const namespace = 'specific-namespace';
      const mockEntityTypes = [
        {
          id: 'uuid-1',
          namespace,
          name: 'Entity1',
          schema: {},
          version: 1,
          createdAt: new Date(),
        },
      ];

      repo.findAll.mockResolvedValue(mockEntityTypes);

      const result = await service.findAll(namespace);

      expect(repo.findAll).toHaveBeenCalledWith(namespace);
      expect(result).toEqual(mockEntityTypes);
    });
  });

  describe('findById', () => {
    it('should return entity type by id', async () => {
      const mockEntityType = {
        id: 'uuid-123',
        namespace: 'test',
        name: 'TestEntity',
        schema: {},
        version: 1,
        createdAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockEntityType);

      const result = await service.findById('uuid-123');

      expect(repo.findById).toHaveBeenCalledWith('uuid-123');
      expect(result).toEqual(mockEntityType);
    });

    it('should return null when entity type not found', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(repo.findById).toHaveBeenCalledWith('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const mockEntityType = {
      id: 'uuid-123',
      namespace: 'test',
      name: 'TestEntity',
      schema: { type: 'object', properties: { name: { type: 'string' } } },
      version: 1,
      createdAt: new Date(),
    };

    it('should update entity type name', async () => {
      const newName = 'UpdatedEntity';
      const updatedEntityType = {
        ...mockEntityType,
        name: newName,
      };

      repo.findById.mockResolvedValue(mockEntityType);
      repo.update.mockResolvedValue(updatedEntityType);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'test',
        eventType: 'entity_type.updated',
        resourceType: 'entity_type',
        resourceId: mockEntityType.id,
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.update(
        mockEntityType.id,
        newName,
        undefined,
      );

      expect(repo.findById).toHaveBeenCalledWith(mockEntityType.id);
      expect(repo.update).toHaveBeenCalledWith(mockEntityType.id, {
        name: newName,
      });
      expect(eventsService.logEvent).toHaveBeenCalled();
      expect(result).toEqual(updatedEntityType);
    });

    it('should update entity type schema and increment version', async () => {
      const newSchema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      };
      const schemaString = JSON.stringify(newSchema);
      const updatedEntityType = {
        ...mockEntityType,
        schema: newSchema,
        version: 2,
      };

      repo.findById.mockResolvedValue(mockEntityType);
      validationService.validateSchema.mockReturnValue({
        valid: true,
        errors: undefined,
      });
      repo.update.mockResolvedValue(updatedEntityType);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'test',
        eventType: 'entity_type.updated',
        resourceType: 'entity_type',
        resourceId: mockEntityType.id,
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.update(
        mockEntityType.id,
        undefined,
        schemaString,
      );

      expect(repo.findById).toHaveBeenCalledWith(mockEntityType.id);
      expect(validationService.validateSchema).toHaveBeenCalledWith(newSchema);
      expect(repo.update).toHaveBeenCalledWith(mockEntityType.id, {
        schema: newSchema,
      });
      expect(eventsService.logEvent).toHaveBeenCalledWith({
        eventType: 'entity_type.updated',
        resourceType: 'entity_type',
        resourceId: mockEntityType.id,
        namespace: mockEntityType.namespace,
        payload: {
          before: {
            name: mockEntityType.name,
            schema: mockEntityType.schema,
            version: mockEntityType.version,
          },
          after: {
            name: updatedEntityType.name,
            schema: updatedEntityType.schema,
            version: updatedEntityType.version,
          },
        },
      });
      expect(result).toEqual(updatedEntityType);
    });

    it('should update both name and schema', async () => {
      const newName = 'UpdatedEntity';
      const newSchema = {
        type: 'object',
        properties: { updated: { type: 'boolean' } },
      };
      const schemaString = JSON.stringify(newSchema);
      const updatedEntityType = {
        ...mockEntityType,
        name: newName,
        schema: newSchema,
        version: 2,
      };

      repo.findById.mockResolvedValue(mockEntityType);
      validationService.validateSchema.mockReturnValue({
        valid: true,
        errors: undefined,
      });
      repo.update.mockResolvedValue(updatedEntityType);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'test',
        eventType: 'entity_type.updated',
        resourceType: 'entity_type',
        resourceId: mockEntityType.id,
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.update(
        mockEntityType.id,
        newName,
        schemaString,
      );

      expect(repo.update).toHaveBeenCalledWith(mockEntityType.id, {
        name: newName,
        schema: newSchema,
      });
      expect(result).toEqual(updatedEntityType);
    });

    it('should throw NotFoundException when entity type not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', 'NewName', undefined),
      ).rejects.toThrow(NotFoundException);

      expect(repo.update).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid schema', async () => {
      const invalidSchema = { invalid: 'schema' };
      const schemaString = JSON.stringify(invalidSchema);

      repo.findById.mockResolvedValue(mockEntityType);
      validationService.validateSchema.mockReturnValue({
        valid: false,
        errors: ['Invalid type: undefined'],
      });

      await expect(
        service.update(mockEntityType.id, undefined, schemaString),
      ).rejects.toThrow(BadRequestException);

      expect(repo.update).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      repo.findById.mockResolvedValue(mockEntityType);
      repo.update.mockResolvedValue(null);

      await expect(
        service.update(mockEntityType.id, 'NewName', undefined),
      ).rejects.toThrow('Failed to update entity type');

      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const mockEntityType = {
      id: 'uuid-123',
      namespace: 'test',
      name: 'TestEntity',
      schema: { type: 'object', properties: { name: { type: 'string' } } },
      version: 1,
      createdAt: new Date(),
    };

    it('should delete entity type when no entities exist', async () => {
      repo.findById.mockResolvedValue(mockEntityType);
      repo.hasEntities.mockResolvedValue(false);
      repo.delete.mockResolvedValue(true);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'test',
        eventType: 'entity_type.deleted',
        resourceType: 'entity_type',
        resourceId: mockEntityType.id,
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.delete(mockEntityType.id);

      expect(repo.findById).toHaveBeenCalledWith(mockEntityType.id);
      expect(repo.hasEntities).toHaveBeenCalledWith(mockEntityType.id);
      expect(repo.delete).toHaveBeenCalledWith(mockEntityType.id);
      expect(eventsService.logEvent).toHaveBeenCalledWith({
        eventType: 'entity_type.deleted',
        resourceType: 'entity_type',
        resourceId: mockEntityType.id,
        namespace: mockEntityType.namespace,
        payload: {
          name: mockEntityType.name,
          schema: mockEntityType.schema,
          version: mockEntityType.version,
        },
      });
      expect(result).toEqual({ id: mockEntityType.id, deleted: true });
    });

    it('should throw NotFoundException when entity type not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );

      expect(repo.hasEntities).not.toHaveBeenCalled();
      expect(repo.delete).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when entities exist', async () => {
      repo.findById.mockResolvedValue(mockEntityType);
      repo.hasEntities.mockResolvedValue(true);

      await expect(service.delete(mockEntityType.id)).rejects.toThrow(
        ConflictException,
      );

      expect(repo.delete).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw error when deletion fails', async () => {
      repo.findById.mockResolvedValue(mockEntityType);
      repo.hasEntities.mockResolvedValue(false);
      repo.delete.mockResolvedValue(false);

      await expect(service.delete(mockEntityType.id)).rejects.toThrow(
        'Failed to delete entity type',
      );

      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });
  });

  describe('findByNameAndNamespace', () => {
    it('should return entity type by name and namespace', async () => {
      const mockEntityType = {
        id: 'uuid-123',
        namespace: 'test',
        name: 'TestEntity',
        schema: {},
        version: 1,
        createdAt: new Date(),
      };

      repo.findByNameAndNamespace.mockResolvedValue(mockEntityType);

      const result = await service.findByNameAndNamespace('TestEntity', 'test');

      expect(repo.findByNameAndNamespace).toHaveBeenCalledWith(
        'TestEntity',
        'test',
      );
      expect(result).toEqual(mockEntityType);
    });

    it('should return null when entity type not found', async () => {
      repo.findByNameAndNamespace.mockResolvedValue(null);

      const result = await service.findByNameAndNamespace(
        'NonExistent',
        'test',
      );

      expect(repo.findByNameAndNamespace).toHaveBeenCalledWith(
        'NonExistent',
        'test',
      );
      expect(result).toBeNull();
    });
  });
});
