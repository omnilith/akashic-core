import { Test, TestingModule } from '@nestjs/testing';
import { EventsService, EventData } from './events.service';
import { EventsRepo } from './events.repo';

describe('EventsService', () => {
  let service: EventsService;
  let repo: jest.Mocked<EventsRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: EventsRepo,
          useValue: {
            create: jest.fn(),
            findEvents: jest.fn(),
            findByResource: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    repo = module.get(EventsRepo);
  });

  describe('logEvent', () => {
    it('should create an event with all required fields', async () => {
      const eventData: EventData = {
        eventType: 'entity.created',
        resourceType: 'entity',
        resourceId: 'uuid-123',
        namespace: 'test-namespace',
        payload: {
          name: 'Test Entity',
          type: 'test',
        },
      };

      const mockEvent = {
        id: 'event-uuid',
        ...eventData,
        metadata: {},
        timestamp: new Date(),
      };

      repo.create.mockResolvedValue(mockEvent);

      const result = await service.logEvent(eventData);

      expect(repo.create).toHaveBeenCalledWith(
        {
          eventType: eventData.eventType,
          resourceType: eventData.resourceType,
          resourceId: eventData.resourceId,
          namespace: eventData.namespace,
          payload: eventData.payload as Record<string, unknown>,
          metadata: {} as Record<string, unknown>,
        },
        undefined, // tx parameter
      );
      expect(result).toEqual(mockEvent);
    });

    it('should include metadata when provided', async () => {
      const eventData: EventData = {
        eventType: 'entity.updated',
        resourceType: 'entity',
        resourceId: 'uuid-456',
        namespace: 'test-namespace',
        payload: { updated: true },
        metadata: {
          userId: 'user-123',
          requestId: 'req-456',
        },
      };

      const mockEvent = {
        id: 'event-uuid',
        ...eventData,
        metadata: (eventData.metadata || {}) as Record<string, unknown>,
        timestamp: new Date(),
      };

      repo.create.mockResolvedValue(mockEvent);

      const result = await service.logEvent(eventData);

      expect(repo.create).toHaveBeenCalledWith(
        {
          eventType: eventData.eventType,
          resourceType: eventData.resourceType,
          resourceId: eventData.resourceId,
          namespace: eventData.namespace,
          payload: eventData.payload as Record<string, unknown>,
          metadata: eventData.metadata as Record<string, unknown>,
        },
        undefined, // tx parameter
      );
      expect(result).toEqual(mockEvent);
    });
  });

  describe('getEvents', () => {
    it('should retrieve all events when no options provided', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          eventType: 'entity.created',
          resourceType: 'entity',
          resourceId: 'uuid-1',
          namespace: 'ns1',
          payload: {},
          metadata: {},
          timestamp: new Date(),
        },
        {
          id: 'event-2',
          eventType: 'entity.updated',
          resourceType: 'entity',
          resourceId: 'uuid-2',
          namespace: 'ns2',
          payload: {},
          metadata: {},
          timestamp: new Date(),
        },
      ];

      repo.findEvents.mockResolvedValue(mockEvents);

      const result = await service.getEvents();

      expect(repo.findEvents).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockEvents);
    });

    it('should filter events by namespace', async () => {
      const namespace = 'specific-namespace';
      const mockEvents = [
        {
          id: 'event-1',
          eventType: 'entity.created',
          resourceType: 'entity',
          resourceId: 'uuid-1',
          namespace,
          payload: {},
          metadata: {},
          timestamp: new Date(),
        },
      ];

      repo.findEvents.mockResolvedValue(mockEvents);

      const result = await service.getEvents({ namespace });

      expect(repo.findEvents).toHaveBeenCalledWith({ namespace });
      expect(result).toEqual(mockEvents);
    });

    it('should filter events by multiple criteria', async () => {
      const options = {
        namespace: 'test-ns',
        resourceType: 'entity',
        eventType: 'entity.created',
        since: new Date('2024-01-01'),
        limit: 10,
      };

      const mockEvents = [
        {
          id: 'event-1',
          eventType: 'entity.created',
          resourceType: 'entity',
          resourceId: 'uuid-1',
          namespace: 'test-ns',
          payload: {},
          metadata: {},
          timestamp: new Date(),
        },
      ];

      repo.findEvents.mockResolvedValue(mockEvents);

      const result = await service.getEvents(options);

      expect(repo.findEvents).toHaveBeenCalledWith(options);
      expect(result).toEqual(mockEvents);
    });

    it('should filter by resourceId', async () => {
      const resourceId = 'specific-resource-id';
      const mockEvents = [
        {
          id: 'event-1',
          eventType: 'entity.created',
          resourceType: 'entity',
          resourceId,
          namespace: 'test',
          payload: {},
          metadata: {},
          timestamp: new Date(),
        },
      ];

      repo.findEvents.mockResolvedValue(mockEvents);

      const result = await service.getEvents({ resourceId });

      expect(repo.findEvents).toHaveBeenCalledWith({ resourceId });
      expect(result).toEqual(mockEvents);
    });
  });

  describe('getEventsByResource', () => {
    it('should retrieve events for a specific resource', async () => {
      const resourceType = 'entity';
      const resourceId = 'uuid-123';
      const mockEvents = [
        {
          id: 'event-1',
          eventType: 'entity.created',
          resourceType,
          resourceId,
          namespace: 'test',
          payload: { action: 'create' },
          metadata: {},
          timestamp: new Date('2024-01-01'),
        },
        {
          id: 'event-2',
          eventType: 'entity.updated',
          resourceType,
          resourceId,
          namespace: 'test',
          payload: { action: 'update' },
          metadata: {},
          timestamp: new Date('2024-01-02'),
        },
      ];

      repo.findByResource.mockResolvedValue(mockEvents);

      const result = await service.getEventsByResource(
        resourceType,
        resourceId,
      );

      expect(repo.findByResource).toHaveBeenCalledWith(
        resourceType,
        resourceId,
      );
      expect(result).toEqual(mockEvents);
    });

    it('should return empty array when no events found for resource', async () => {
      repo.findByResource.mockResolvedValue([]);

      const result = await service.getEventsByResource(
        'entity',
        'non-existent',
      );

      expect(repo.findByResource).toHaveBeenCalledWith(
        'entity',
        'non-existent',
      );
      expect(result).toEqual([]);
    });
  });
});
