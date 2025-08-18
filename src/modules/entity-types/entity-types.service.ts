// src/modules/entity-types/entity-types.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityTypesRepo } from './entity-types.repo';
import { ValidationService } from '../../lib/validation.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class EntityTypesService {
  constructor(
    private repo: EntityTypesRepo,
    private eventsService: EventsService,
    private validationService: ValidationService,
  ) {}

  async create(namespace: string, name: string, schemaString: string) {
    const validationResult = this.validationService.validateSchema(
      JSON.parse(schemaString),
    );

    if (!validationResult.valid) {
      throw new BadRequestException(
        `Invalid schema: ${validationResult.errors?.join(', ')}`,
      );
    }

    const entityType = await this.repo.create({
      namespace,
      name,
      schemaJson: JSON.parse(schemaString),
    });

    await this.eventsService.logEvent({
      eventType: 'entity_type.created',
      resourceType: 'entity_type',
      resourceId: entityType.id,
      namespace,
      payload: {
        name,
        schema: JSON.parse(schemaString) as string,
        version: entityType.version,
      },
    });

    return entityType;
  }

  async findAll(namespace?: string) {
    return await this.repo.findAll(namespace);
  }

  async findById(id: string) {
    return await this.repo.findById(id);
  }
}
