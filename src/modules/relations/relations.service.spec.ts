import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RelationsService } from './relations.service';
import { RelationsRepo } from './relations.repo';
import { RelationTypesService } from '../relation-types/relation-types.service';
import { EntitiesService } from '../entities/entities.service';
import { EventsService } from '../events/events.service';
import { DrizzleService } from '../../db/drizzle.service';

describe('RelationsService', () => {
  let service: RelationsService;
  let repo: jest.Mocked<RelationsRepo>;
  let relationTypesService: jest.Mocked<RelationTypesService>;
  let entitiesService: jest.Mocked<EntitiesService>;
  let eventsService: jest.Mocked<EventsService>;

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
            transaction: jest
              .fn()
              .mockImplementation(
                async <T>(callback: (tx: any) => Promise<T>): Promise<T> => {
                  return await callback({});
                },
              ),
            db: {},
          },
        },
      ],
    }).compile();

    service = module.get<RelationsService>(RelationsService);
    repo = module.get(RelationsRepo);
    relationTypesService = module.get(RelationTypesService);
    entitiesService = module.get(EntitiesService);
    eventsService = module.get(EventsService);
  });

  describe('create', () => {
    const namespace = 'test-namespace';
    const relationTypeId = 'relation-type-uuid';
    const fromEntityId = 'from-entity-uuid';
    const toEntityId = 'to-entity-uuid';
    const metadata = { description: 'Test relation' };

    const mockRelationType = {
      id: relationTypeId,
      namespace,
      name: 'belongsTo',
      fromEntityTypeId: 'user-type-uuid',
      toEntityTypeId: 'post-type-uuid',
      cardinality: '1..n',
      version: 1,
      createdAt: new Date(),
    };

    const mockFromEntity = {
      id: fromEntityId,
      namespace,
      entityTypeId: 'user-type-uuid',
      entityTypeVersion: 1,
      data: { name: 'User 1' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockToEntity = {
      id: toEntityId,
      namespace,
      entityTypeId: 'post-type-uuid',
      entityTypeVersion: 1,
      data: { title: 'Post 1' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a relation with valid data', async () => {
      const mockRelation = {
        id: 'relation-uuid',
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
      repo.create.mockResolvedValue(mockRelation);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'default',
        eventType: 'relation.created',
        resourceType: 'relation',
        resourceId: 'relation-id',
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.create(
        namespace,
        relationTypeId,
        fromEntityId,
        toEntityId,
        metadata,
      );

      expect(relationTypesService.findById).toHaveBeenCalledWith(
        relationTypeId,
      );
      expect(entitiesService.findById).toHaveBeenCalledWith(fromEntityId);
      expect(entitiesService.findById).toHaveBeenCalledWith(toEntityId);
      expect(repo.create).toHaveBeenCalledWith(
        {
          namespace,
          relationTypeId,
          fromEntityId,
          toEntityId,
          metadata,
        },
        {}, // tx parameter from mock
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
        {}, // tx parameter from mock
      );
      expect(result).toEqual(mockRelation);
    });

    it('should create a relation without metadata', async () => {
      const mockRelation = {
        id: 'relation-uuid',
        namespace,
        relationTypeId,
        fromEntityId,
        toEntityId,
        metadata: undefined,
        createdAt: new Date(),
      };

      relationTypesService.findById.mockResolvedValue(mockRelationType);
      entitiesService.findById
        .mockResolvedValueOnce(mockFromEntity)
        .mockResolvedValueOnce(mockToEntity);
      repo.create.mockResolvedValue(mockRelation);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'default',
        eventType: 'relation.created',
        resourceType: 'relation',
        resourceId: 'relation-id',
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.create(
        namespace,
        relationTypeId,
        fromEntityId,
        toEntityId,
      );

      expect(repo.create).toHaveBeenCalledWith(
        {
          namespace,
          relationTypeId,
          fromEntityId,
          toEntityId,
          metadata: undefined,
        },
        {}, // tx parameter from mock
      );
      expect(result).toEqual(mockRelation);
    });

    it('should throw BadRequestException when relation type not found', async () => {
      relationTypesService.findById.mockResolvedValue(null);

      await expect(
        service.create(namespace, relationTypeId, fromEntityId, toEntityId),
      ).rejects.toThrow(BadRequestException);

      expect(entitiesService.findById).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when fromEntity not found', async () => {
      relationTypesService.findById.mockResolvedValue(mockRelationType);
      entitiesService.findById.mockResolvedValueOnce(null);

      await expect(
        service.create(namespace, relationTypeId, fromEntityId, toEntityId),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when toEntity not found', async () => {
      relationTypesService.findById.mockResolvedValue(mockRelationType);
      entitiesService.findById
        .mockResolvedValueOnce(mockFromEntity)
        .mockResolvedValueOnce(null);

      await expect(
        service.create(namespace, relationTypeId, fromEntityId, toEntityId),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when fromEntity type does not match', async () => {
      const wrongFromEntity = {
        ...mockFromEntity,
        entityTypeId: 'wrong-type-uuid',
      };

      relationTypesService.findById.mockResolvedValue(mockRelationType);
      entitiesService.findById
        .mockResolvedValueOnce(wrongFromEntity)
        .mockResolvedValueOnce(mockToEntity);

      await expect(
        service.create(namespace, relationTypeId, fromEntityId, toEntityId),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when toEntity type does not match', async () => {
      const wrongToEntity = {
        ...mockToEntity,
        entityTypeId: 'wrong-type-uuid',
      };

      relationTypesService.findById.mockResolvedValue(mockRelationType);
      entitiesService.findById
        .mockResolvedValueOnce(mockFromEntity)
        .mockResolvedValueOnce(wrongToEntity);

      await expect(
        service.create(namespace, relationTypeId, fromEntityId, toEntityId),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all relations without filters', async () => {
      const mockRelations = [
        {
          id: 'relation-1',
          namespace: 'ns1',
          relationTypeId: 'type-1',
          fromEntityId: 'entity-1',
          toEntityId: 'entity-2',
          metadata: null,
          createdAt: new Date(),
        },
        {
          id: 'relation-2',
          namespace: 'ns2',
          relationTypeId: 'type-2',
          fromEntityId: 'entity-3',
          toEntityId: 'entity-4',
          metadata: { info: 'test' },
          createdAt: new Date(),
        },
      ];

      repo.findAll.mockResolvedValue(mockRelations);

      const result = await service.findAll();

      expect(repo.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockRelations);
    });

    it('should filter relations by namespace', async () => {
      const filters = { namespace: 'specific-namespace' };
      const mockRelations = [
        {
          id: 'relation-1',
          namespace: 'specific-namespace',
          relationTypeId: 'type-1',
          fromEntityId: 'entity-1',
          toEntityId: 'entity-2',
          metadata: null,
          createdAt: new Date(),
        },
      ];

      repo.findAll.mockResolvedValue(mockRelations);

      const result = await service.findAll(filters);

      expect(repo.findAll).toHaveBeenCalledWith(filters, undefined, undefined);
      expect(result).toEqual(mockRelations);
    });

    it('should filter relations by multiple criteria', async () => {
      const filters = {
        namespace: 'test-ns',
        relationTypeId: 'type-uuid',
        fromEntityId: 'from-uuid',
        toEntityId: 'to-uuid',
      };

      const mockRelations = [
        {
          id: 'relation-1',
          namespace: 'test-ns',
          relationTypeId: 'type-uuid',
          fromEntityId: 'from-uuid',
          toEntityId: 'to-uuid',
          metadata: null,
          createdAt: new Date(),
        },
      ];

      repo.findAll.mockResolvedValue(mockRelations);

      const result = await service.findAll(filters);

      expect(repo.findAll).toHaveBeenCalledWith(filters, undefined, undefined);
      expect(result).toEqual(mockRelations);
    });
  });

  describe('findById', () => {
    it('should return relation by id', async () => {
      const mockRelation = {
        id: 'relation-uuid',
        namespace: 'test',
        relationTypeId: 'type-uuid',
        fromEntityId: 'from-uuid',
        toEntityId: 'to-uuid',
        metadata: { test: true },
        createdAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockRelation);

      const result = await service.findById('relation-uuid');

      expect(repo.findById).toHaveBeenCalledWith('relation-uuid');
      expect(result).toEqual(mockRelation);
    });

    it('should return null when relation not found', async () => {
      repo.findById.mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(repo.findById).toHaveBeenCalledWith('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    const relationId = 'relation-uuid';
    const mockRelation = {
      id: relationId,
      namespace: 'test',
      relationTypeId: 'type-uuid',
      fromEntityId: 'from-uuid',
      toEntityId: 'to-uuid',
      metadata: null,
      createdAt: new Date(),
    };

    it('should delete an existing relation', async () => {
      repo.findById.mockResolvedValue(mockRelation);
      repo.delete.mockResolvedValue(true);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'default',
        eventType: 'relation.created',
        resourceType: 'relation',
        resourceId: 'relation-id',
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.delete(relationId);

      expect(repo.findById).toHaveBeenCalledWith(relationId);
      expect(repo.delete).toHaveBeenCalledWith(relationId, {}); // tx parameter from mock
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
        {}, // tx parameter from mock
      );
      expect(result).toEqual(mockRelation);
    });

    it('should throw NotFoundException when relation not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete(relationId)).rejects.toThrow(
        NotFoundException,
      );

      expect(repo.delete).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when delete fails', async () => {
      repo.findById.mockResolvedValue(mockRelation);
      repo.delete.mockResolvedValue(false);

      await expect(service.delete(relationId)).rejects.toThrow(
        BadRequestException,
      );

      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });
  });
});
