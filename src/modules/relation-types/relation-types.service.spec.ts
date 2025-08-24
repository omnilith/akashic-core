import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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
            findByNameAndNamespace: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            hasRelations: jest.fn(),
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
      repo.findByNameAndNamespace.mockResolvedValue(null);
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
        repo.findByNameAndNamespace.mockResolvedValue(null);
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

    it('should throw ConflictException when duplicate name exists in namespace', async () => {
      const existingRelationType = {
        id: 'existing-id',
        namespace,
        name,
        fromEntityTypeId: 'other-from',
        toEntityTypeId: 'other-to',
        cardinality: '1..n',
        version: 1,
        createdAt: new Date(),
      };

      entityTypesService.findById
        .mockResolvedValueOnce(mockFromEntityType)
        .mockResolvedValueOnce(mockToEntityType);
      repo.findByNameAndNamespace.mockResolvedValue(existingRelationType);

      await expect(
        service.create(
          namespace,
          name,
          fromEntityTypeId,
          toEntityTypeId,
          cardinality,
        ),
      ).rejects.toThrow(ConflictException);

      expect(repo.findByNameAndNamespace).toHaveBeenCalledWith(name, namespace);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for cross-namespace relations', async () => {
      const fromEntityInDifferentNamespace = {
        ...mockFromEntityType,
        namespace: 'namespace1',
      };
      const toEntityInDifferentNamespace = {
        ...mockToEntityType,
        namespace: 'namespace2',
      };

      entityTypesService.findById
        .mockResolvedValueOnce(fromEntityInDifferentNamespace)
        .mockResolvedValueOnce(toEntityInDifferentNamespace);
      repo.findByNameAndNamespace.mockResolvedValue(null);

      await expect(
        service.create(
          namespace,
          name,
          fromEntityTypeId,
          toEntityTypeId,
          cardinality,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should allow relations when one entity type is in global namespace', async () => {
      const globalEntityType = {
        ...mockFromEntityType,
        namespace: 'global',
      };
      const localEntityType = {
        ...mockToEntityType,
        namespace: 'local',
      };
      const mockGlobalRelationType = {
        id: 'relation-type-id',
        namespace,
        name,
        fromEntityTypeId,
        toEntityTypeId,
        cardinality,
        version: 1,
        createdAt: new Date(),
      };

      entityTypesService.findById
        .mockResolvedValueOnce(globalEntityType)
        .mockResolvedValueOnce(localEntityType);
      repo.findByNameAndNamespace.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockGlobalRelationType);
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

      expect(result).toEqual(mockGlobalRelationType);
      expect(repo.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for self-referential 1..1 relations', async () => {
      const sameEntityTypeId = 'same-entity-type';

      entityTypesService.findById
        .mockResolvedValueOnce(mockFromEntityType)
        .mockResolvedValueOnce(mockFromEntityType); // Same entity type
      repo.findByNameAndNamespace.mockResolvedValue(null);

      await expect(
        service.create(
          namespace,
          name,
          sameEntityTypeId,
          sameEntityTypeId,
          '1..1',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
    });

    it('should allow self-referential relations with other cardinalities', async () => {
      const sameEntityTypeId = 'same-entity-type';
      const validSelfRefCardinalities = ['1..n', 'n..1', 'n..n'];

      for (const selfRefCardinality of validSelfRefCardinalities) {
        const mockSelfRefRelationType = {
          id: 'relation-type-id',
          namespace,
          name,
          fromEntityTypeId: sameEntityTypeId,
          toEntityTypeId: sameEntityTypeId,
          cardinality: selfRefCardinality,
          version: 1,
          createdAt: new Date(),
        };

        entityTypesService.findById
          .mockResolvedValueOnce(mockFromEntityType)
          .mockResolvedValueOnce(mockFromEntityType);
        repo.findByNameAndNamespace.mockResolvedValue(null);
        repo.create.mockResolvedValue(mockSelfRefRelationType);
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
          sameEntityTypeId,
          sameEntityTypeId,
          selfRefCardinality,
        );

        expect(result.cardinality).toEqual(selfRefCardinality);
        expect(repo.create).toHaveBeenCalled();
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

      expect(repo.findAll).toHaveBeenCalledWith(undefined, undefined, undefined);
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

      expect(repo.findAll).toHaveBeenCalledWith(namespace, undefined, undefined);
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

  describe('update', () => {
    const mockRelationType = {
      id: 'uuid-123',
      namespace: 'test',
      name: 'belongsTo',
      fromEntityTypeId: 'from-type-uuid',
      toEntityTypeId: 'to-type-uuid',
      cardinality: '1..n',
      version: 1,
      createdAt: new Date(),
    };

    it('should update relation type name', async () => {
      const newName = 'hasMany';
      const updatedRelationType = {
        ...mockRelationType,
        name: newName,
      };

      repo.findById.mockResolvedValue(mockRelationType);
      repo.findByNameAndNamespace.mockResolvedValue(null);
      repo.update.mockResolvedValue(updatedRelationType);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'test',
        eventType: 'relationType.updated',
        resourceType: 'relationType',
        resourceId: mockRelationType.id,
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.update(
        mockRelationType.id,
        newName,
        undefined,
      );

      expect(repo.findById).toHaveBeenCalledWith(mockRelationType.id);
      expect(repo.update).toHaveBeenCalledWith(mockRelationType.id, {
        name: newName,
      });
      expect(eventsService.logEvent).toHaveBeenCalled();
      expect(result).toEqual(updatedRelationType);
    });

    it('should update relation type cardinality', async () => {
      const newCardinality = 'n..n';
      const updatedRelationType = {
        ...mockRelationType,
        cardinality: newCardinality,
      };

      repo.findById.mockResolvedValue(mockRelationType);
      repo.update.mockResolvedValue(updatedRelationType);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'test',
        eventType: 'relationType.updated',
        resourceType: 'relationType',
        resourceId: mockRelationType.id,
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.update(
        mockRelationType.id,
        undefined,
        newCardinality,
      );

      expect(repo.findById).toHaveBeenCalledWith(mockRelationType.id);
      expect(repo.update).toHaveBeenCalledWith(mockRelationType.id, {
        cardinality: newCardinality,
      });
      expect(eventsService.logEvent).toHaveBeenCalledWith({
        eventType: 'relationType.updated',
        resourceType: 'relationType',
        resourceId: mockRelationType.id,
        namespace: mockRelationType.namespace,
        payload: {
          before: {
            name: mockRelationType.name,
            cardinality: mockRelationType.cardinality,
          },
          after: {
            name: updatedRelationType.name,
            cardinality: updatedRelationType.cardinality,
          },
        },
      });
      expect(result).toEqual(updatedRelationType);
    });

    it('should update both name and cardinality', async () => {
      const newName = 'hasMany';
      const newCardinality = '1..1';
      const updatedRelationType = {
        ...mockRelationType,
        name: newName,
        cardinality: newCardinality,
      };

      repo.findById.mockResolvedValue(mockRelationType);
      repo.update.mockResolvedValue(updatedRelationType);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'test',
        eventType: 'relationType.updated',
        resourceType: 'relationType',
        resourceId: mockRelationType.id,
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.update(
        mockRelationType.id,
        newName,
        newCardinality,
      );

      expect(repo.update).toHaveBeenCalledWith(mockRelationType.id, {
        name: newName,
        cardinality: newCardinality,
      });
      expect(result).toEqual(updatedRelationType);
    });

    it('should throw NotFoundException when relation type not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.update('non-existent', 'NewName', undefined),
      ).rejects.toThrow(NotFoundException);

      expect(repo.update).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid cardinality', async () => {
      const invalidCardinality = 'invalid';

      repo.findById.mockResolvedValue(mockRelationType);

      await expect(
        service.update(mockRelationType.id, undefined, invalidCardinality),
      ).rejects.toThrow(BadRequestException);

      expect(repo.update).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when updating to duplicate name', async () => {
      const newName = 'existingName';
      const existingRelationType = {
        id: 'other-id',
        namespace: mockRelationType.namespace,
        name: newName,
        fromEntityTypeId: 'other-from',
        toEntityTypeId: 'other-to',
        cardinality: '1..n',
        version: 1,
        createdAt: new Date(),
      };

      repo.findById.mockResolvedValue(mockRelationType);
      repo.findByNameAndNamespace.mockResolvedValue(existingRelationType);

      await expect(
        service.update(mockRelationType.id, newName, undefined),
      ).rejects.toThrow(ConflictException);

      expect(repo.findByNameAndNamespace).toHaveBeenCalledWith(
        newName,
        mockRelationType.namespace,
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('should allow updating to same name (no conflict with self)', async () => {
      const sameName = mockRelationType.name;
      const sameRelationType = {
        ...mockRelationType,
      };

      repo.findById.mockResolvedValue(mockRelationType);
      repo.findByNameAndNamespace.mockResolvedValue(sameRelationType);
      repo.update.mockResolvedValue(mockRelationType);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'test',
        eventType: 'relationType.updated',
        resourceType: 'relationType',
        resourceId: mockRelationType.id,
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.update(
        mockRelationType.id,
        sameName,
        undefined,
      );

      expect(result).toEqual(mockRelationType);
      expect(repo.update).toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      repo.findById.mockResolvedValue(mockRelationType);
      repo.findByNameAndNamespace.mockResolvedValue(null);
      repo.update.mockResolvedValue(null);

      await expect(
        service.update(mockRelationType.id, 'NewName', undefined),
      ).rejects.toThrow('Failed to update relation type');

      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should accept all valid cardinality values', async () => {
      const validCardinalities = ['1..1', '1..n', 'n..1', 'n..n'];

      for (const validCardinality of validCardinalities) {
        const updatedRelationType = {
          ...mockRelationType,
          cardinality: validCardinality,
        };

        repo.findById.mockResolvedValue(mockRelationType);
        repo.update.mockResolvedValue(updatedRelationType);
        eventsService.logEvent.mockResolvedValue({
          id: 'event-id',
          namespace: 'test',
          eventType: 'relationType.updated',
          resourceType: 'relationType',
          resourceId: mockRelationType.id,
          timestamp: new Date(),
          metadata: {},
          payload: {},
        });

        const result = await service.update(
          mockRelationType.id,
          undefined,
          validCardinality,
        );

        expect(result.cardinality).toEqual(validCardinality);
      }
    });
  });

  describe('delete', () => {
    const mockRelationType = {
      id: 'uuid-123',
      namespace: 'test',
      name: 'belongsTo',
      fromEntityTypeId: 'from-type-uuid',
      toEntityTypeId: 'to-type-uuid',
      cardinality: '1..n',
      version: 1,
      createdAt: new Date(),
    };

    it('should delete relation type when no relations exist', async () => {
      repo.findById.mockResolvedValue(mockRelationType);
      repo.hasRelations.mockResolvedValue(false);
      repo.delete.mockResolvedValue(true);
      eventsService.logEvent.mockResolvedValue({
        id: 'event-id',
        namespace: 'test',
        eventType: 'relationType.deleted',
        resourceType: 'relationType',
        resourceId: mockRelationType.id,
        timestamp: new Date(),
        metadata: {},
        payload: {},
      });

      const result = await service.delete(mockRelationType.id);

      expect(repo.findById).toHaveBeenCalledWith(mockRelationType.id);
      expect(repo.hasRelations).toHaveBeenCalledWith(mockRelationType.id);
      expect(repo.delete).toHaveBeenCalledWith(mockRelationType.id);
      expect(eventsService.logEvent).toHaveBeenCalledWith({
        eventType: 'relationType.deleted',
        resourceType: 'relationType',
        resourceId: mockRelationType.id,
        namespace: mockRelationType.namespace,
        payload: {
          name: mockRelationType.name,
          fromEntityTypeId: mockRelationType.fromEntityTypeId,
          toEntityTypeId: mockRelationType.toEntityTypeId,
          cardinality: mockRelationType.cardinality,
        },
      });
      expect(result).toEqual({ id: mockRelationType.id, deleted: true });
    });

    it('should throw NotFoundException when relation type not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );

      expect(repo.hasRelations).not.toHaveBeenCalled();
      expect(repo.delete).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when relations exist', async () => {
      repo.findById.mockResolvedValue(mockRelationType);
      repo.hasRelations.mockResolvedValue(true);

      await expect(service.delete(mockRelationType.id)).rejects.toThrow(
        ConflictException,
      );

      expect(repo.delete).not.toHaveBeenCalled();
      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });

    it('should throw error when deletion fails', async () => {
      repo.findById.mockResolvedValue(mockRelationType);
      repo.hasRelations.mockResolvedValue(false);
      repo.delete.mockResolvedValue(false);

      await expect(service.delete(mockRelationType.id)).rejects.toThrow(
        'Failed to delete relation type',
      );

      expect(eventsService.logEvent).not.toHaveBeenCalled();
    });
  });

  describe('findByNameAndNamespace', () => {
    it('should return relation type by name and namespace', async () => {
      const mockRelationType = {
        id: 'uuid-123',
        namespace: 'test',
        name: 'belongsTo',
        fromEntityTypeId: 'from-type-uuid',
        toEntityTypeId: 'to-type-uuid',
        cardinality: '1..n',
        version: 1,
        createdAt: new Date(),
      };

      repo.findByNameAndNamespace.mockResolvedValue(mockRelationType);

      const result = await service.findByNameAndNamespace('belongsTo', 'test');

      expect(repo.findByNameAndNamespace).toHaveBeenCalledWith(
        'belongsTo',
        'test',
      );
      expect(result).toEqual(mockRelationType);
    });

    it('should return null when relation type not found', async () => {
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
