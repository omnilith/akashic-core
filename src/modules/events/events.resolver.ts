// src/modules/events/events.resolver.ts
import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { EventsService } from './events.service';
import { EventDto } from './dto/event.dto';

@Resolver(() => EventDto)
export class EventsResolver {
  constructor(private eventsService: EventsService) {}

  @Query(() => [EventDto])
  async events(
    @Args('namespace', { nullable: true }) namespace?: string,
    @Args('resourceType', { nullable: true }) resourceType?: string,
    @Args('resourceId', { type: () => ID, nullable: true }) resourceId?: string,
    @Args('eventType', { nullable: true }) eventType?: string,
    @Args('limit', { nullable: true }) limit?: number,
  ) {
    return await this.eventsService.getEvents({
      namespace,
      resourceType,
      resourceId,
      eventType,
      limit: limit || 50,
    });
  }

  @Query(() => [EventDto])
  async resourceHistory(
    @Args('resourceType') resourceType: string,
    @Args('resourceId', { type: () => ID }) resourceId: string,
  ) {
    return await this.eventsService.getEventsByResource(
      resourceType,
      resourceId,
    );
  }
}
