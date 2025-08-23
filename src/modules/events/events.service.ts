// src/modules/events/events.service.ts
import { Injectable } from '@nestjs/common';
import { EventsRepo } from './events.repo';
import { DrizzleTransaction } from '../../db/drizzle.service';

export interface EventData {
  eventType: string;
  resourceType: string;
  resourceId: string;
  namespace: string;
  payload: any;
  metadata?: any;
}

@Injectable()
export class EventsService {
  constructor(private eventsRepo: EventsRepo) {}

  async logEvent(eventData: EventData, tx?: DrizzleTransaction) {
    return await this.eventsRepo.create(
      {
        eventType: eventData.eventType,
        resourceType: eventData.resourceType,
        resourceId: eventData.resourceId,
        namespace: eventData.namespace,
        payload: eventData.payload,
        metadata: eventData.metadata || {},
      },
      tx,
    );
  }

  async getEvents(options?: {
    namespace?: string;
    resourceType?: string;
    resourceId?: string;
    eventType?: string;
    since?: Date;
    limit?: number;
  }) {
    return await this.eventsRepo.findEvents(options);
  }

  async getEventsByResource(resourceType: string, resourceId: string) {
    return await this.eventsRepo.findByResource(resourceType, resourceId);
  }
}
