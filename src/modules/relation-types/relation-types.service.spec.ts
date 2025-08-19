import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RelationTypesService } from './relation-types.service';
import { RelationTypesRepo } from './relation-types.repo';
import { EntityTypesService } from '../entity-types/entity-types.service';
import { EventsService } from '../events/events.service';

describe('RelationTypesService', () => {
  let service: RelationTypesService;
  let repo: jest.Mocked<RelationTypesRepo>;
  let entityTypesService: jest.Mocked<EntityTypesService>;
  let eventsService: jest.Mocked<EventsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationTypesService,
        {
          provide: RelationTypesRepo,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
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
      ],
    }).compile();

    service = module.get<RelationTypesService>(RelationTypesService);
    repo = module.get(RelationTypesRepo);
    entityTypesService = module.get(EntityTypesService);
    eventsService = module.get(EventsService);
  });

  describe('create', () => {
    const namespace = 'test-namespace';
    const name = 'belongsTo';
    const fromEntityTypeId = 'from-type-uuid';
    const toEntityTypeId = 'to-type-uuid';
    const cardinality = '1..n';

    const mockFromEntityType = {
      id: fromEntityTypeId,
      namespace,
      name: 'User',
      version: 1,
      schemaJson: {},
      createdAt: new Date(),
    };

    const mockToEntityType = {
      id: toEntityTypeId,
      namespace,
      name: 'Post',
      version: 1,
      schemaJson: {},
      createdAt: new Date(),
    };

    it('should create a relation type with valid data', async () => {
      const mockRelationType = {
        id: 'relation-type-uuid',
        namespace,
        name,
        fromEntityTypeId,
        toEntityTypeId,
        cardinality,
        version: 1,
        createdAt: new Date(),
      };

      entityTypesService.findById
        .mockResolvedValueOnce(mockFromEntityType)
        .mockResolvedValueOnce(mockToEntityType);
      repo.create.mockResolvedValue(mockRelationType);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'default',
        eventType: 'relation-type.created',
        resourceType: 'relation-type',
        resourceId: 'relation-type-id',
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.create(
        namespace,
        name,
        fromEntityTypeId,
        toEntityTypeId,
        cardinality,
      );

      expect(entityTypesService.findById).toHaveBeenCalledWith(
        fromEntityTypeId,
      );
      expect(entityTypesService.findById).toHaveBeenCalledWith(toEntityTypeId);
      expect(repo.create).toHaveBeenCalledWith({
        namespace,
        name,
        fromEntityTypeId,
        toEntityTypeId,
        cardinality,
      });
      expect(eventsService.logEvent).toHaveBeenCalledWith({
        eventType: 'relationType.created',
        resourceType: 'relationType',
        resourceId: mockRelationType.id,
        namespace,
        payload: {
          name,
          fromEntityTypeId,
          toEntityTypeId,
          cardinality,
        },
      });
      expect(result).toEqual(mockRelationType);
    });

    it('should throw BadRequestException when fromEntityType not found', async () => {
      entityTypesService.findById.mockResolvedValueOnce(null);

      await expect(
        service.create(
          namespace,
          name,
          fromEntityTypeId,
          toEntityTypeId,
          cardinality,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(entityTypesService.findById).toHaveBeenCalledWith(
        fromEntityTypeId,
      );
      expect(repo.create).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when toEntityType not found', async () => {
      entityTypesService.findById
        .mockResolvedValueOnce(mockFromEntityType)
        .mockResolvedValueOnce(null);

      await expect(
        service.create(
          namespace,
          name,
          fromEntityTypeId,
          toEntityTypeId,
          cardinality,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(entityTypesService.findById).toHaveBeenCalledWith(
        fromEntityTypeId,
      );
      expect(entityTypesService.findById).toHaveBeenCalledWith(toEntityTypeId);
      expect(repo.create).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid cardinality', async () => {
      const invalidCardinality = 'invalid';

      entityTypesService.findById
        .mockResolvedValueOnce(mockFromEntityType)
        .mockResolvedValueOnce(mockToEntityType);

      await expect(
        service.create(
          namespace,
          name,
          fromEntityTypeId,
          toEntityTypeId,
          invalidCardinality,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should accept all valid cardinality values', async () => {
      const validCardinalities = ['1..1', '1..n', 'n..1', 'n..n'];

      for (const validCardinality of validCardinalities) {
        const mockRelationType = {
          id: `relation-type-${validCardinality}`,
          namespace,
          name,
          fromEntityTypeId,
          toEntityTypeId,
          cardinality: validCardinality,
          version: 1,
          createdAt: new Date(),
        };

        entityTypesService.findById
          .mockResolvedValueOnce(mockFromEntityType)
          .mockResolvedValueOnce(mockToEntityType);
        repo.create.mockResolvedValue(mockRelationType);
        eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'default',
        eventType: 'relation-type.created',
        resourceType: 'relation-type',
        resourceId: 'relation-type-id',
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

        const result = await service.create(
          namespace,
          name,
          fromEntityTypeId,
          toEntityTypeId,
          validCardinality,
        );

        expect(result.cardinality).toEqual(validCardinality);
      }
    });
  });

  describe('findAll', () => {
    it('should return all relation types', async () => {
      const mockRelationTypes = [
        {
          id: 'uuid-1',
          namespace: 'ns1',
          name: 'belongsTo',
          fromEntityTypeId: 'type-1',
          toEntityTypeId: 'type-2',
          cardinality: '1..n',
          version: 1,
          createdAt: new Date(),
        },
        {
          id: 'uuid-2',
          namespace: 'ns2',
          name: 'hasMany',
          fromEntityTypeId: 'type-3',
          toEntityTypeId: 'type-4',
          cardinality: 'n..n',
          version: 1,
          createdAt: new Date(),
        },
      ];

      repo.findAll.mockResolvedValue(mockRelationTypes);

      const result = await service.findAll();

      expect(repo.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockRelationTypes);
    });

    it('should filter by namespace when provided', async () => {
      const namespace = 'specific-namespace';
      const mockRelationTypes = [
        {
          id: 'uuid-1',
          namespace,
          name: 'belongsTo',
          fromEntityTypeId: 'type-1',
          toEntityTypeId: 'type-2',
          cardinality: '1..1',
          version: 1,
          createdAt: new Date(),
        },
      ];

      repo.findAll.mockResolvedValue(mockRelationTypes);

      const result = await service.findAll(namespace);

      expect(repo.findAll).toHaveBeenCalledWith(namespace);
      expect(result).toEqual(mockRelationTypes);
    });
  });

  describe('findById', () => {
    it('should return relation type by id', async () => {
      const mockRelationType = {
        id: 'uuid-123',
        namespace: 'test',
        name: 'belongsTo',
        fromEntityTypeId: 'type-1',
        toEntityTypeId: 'type-2',
        cardinality: 'n..1',
        version: 1,
        createdAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockRelationType);

      const result = await service.findById('uuid-123');

      expect(repo.findById).toHaveBeenCalledWith('uuid-123');
      expect(result).toEqual(mockRelationType);
    });

    it('should return null when relation type not found', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(repo.findById).toHaveBeenCalledWith('non-existent');
      expect(result).toBeNull();
    });
  });
});
