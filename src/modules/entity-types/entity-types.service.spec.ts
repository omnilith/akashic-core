import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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
        schemaJson: validSchema,
        version: 1,
        createdAt: new Date(),
      };

      validationService.validateSchema.mockReturnValue({
        valid: true,
        errors: null,
      });
      repo.create.mockResolvedValue(mockEntityType);
      eventsService.logEvent.mockResolvedValue(undefined);

      const result = await service.create(namespace, name, schemaString);

      expect(validationService.validateSchema).toHaveBeenCalledWith(
        validSchema,
      );
      expect(repo.create).toHaveBeenCalledWith({
        namespace,
        name,
        schemaJson: validSchema,
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
          schemaJson: {},
          version: 1,
          createdAt: new Date(),
        },
        {
          id: 'uuid-2',
          namespace: 'ns2',
          name: 'Entity2',
          schemaJson: {},
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
          schemaJson: {},
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
        schemaJson: {},
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
});
