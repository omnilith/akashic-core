// src/modules/entities/entities.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { EntitiesRepo } from './entities.repo';
import { EntityTypesService } from '../entity-types/entity-types.service';
import { ValidationService } from '../../lib/validation.service';
import { EventsService } from '../events/events.service';
import { EntityFilterInput } from '../query-builder/dto/query-filter.dto';

@Injectable()
export class EntitiesService {
  constructor(
    private entitiesRepo: EntitiesRepo,
    private entityTypesService: EntityTypesService,
    private eventsService: EventsService,
    private validationService: ValidationService,
  ) {}

  async create(namespace: string, entityTypeId: string, data: unknown) {
    // 1. Get the entity type and its schema
    const entityType = await this.entityTypesService.findById(entityTypeId);
    if (!entityType) {
      throw new BadRequestException('EntityType not found');
    }

    // 2. Validate the data against the schema
    const validation = this.validationService.validateEntityData(
      entityType.schemaJson as Record<string, unknown>,
      data,
    );

    if (!validation.valid) {
      throw new BadRequestException(
        `Validation failed: ${validation.errors?.join(', ')}`,
      );
    }

    // 3. Create the entity
    const entity = await this.entitiesRepo.create({
      namespace,
      entityTypeId,
      entityTypeVersion: entityType.version,
      data,
    });

    await this.eventsService.logEvent({
      eventType: 'entity.created',
      resourceType: 'entity',
      resourceId: entity.id,
      namespace,
      payload: {
        entityTypeId,
        entityTypeVersion: entityType.version,
        data,
      },
    });

    return entity;
  }

  async findAll(namespace?: string, entityTypeId?: string) {
    return await this.entitiesRepo.findAll(namespace, entityTypeId);
  }

  async search(filter: EntityFilterInput) {
    return await this.entitiesRepo.search(filter);
  }

  async count(filter: EntityFilterInput) {
    return await this.entitiesRepo.count(filter);
  }

  async findById(id: string) {
    return await this.entitiesRepo.findById(id);
  }

  async update(id: string, data: unknown) {
    // 1. Find the existing entity
    const existingEntity = await this.entitiesRepo.findById(id);
    if (!existingEntity) {
      throw new BadRequestException('Entity not found');
    }

    // 2. Get the entity type and its schema
    const entityType = await this.entityTypesService.findById(
      existingEntity.entityTypeId!,
    );
    if (!entityType) {
      throw new BadRequestException('EntityType not found');
    }

    // 3. Validate the new data against the schema
    const validation = this.validationService.validateEntityData(
      entityType.schemaJson as Record<string, unknown>,
      data,
    );

    if (!validation.valid) {
      throw new BadRequestException(
        `Validation failed: ${validation.errors?.join(', ')}`,
      );
    }

    // 4. Update the entity
    const updatedEntity = await this.entitiesRepo.update(id, data);

    if (!updatedEntity) {
      throw new BadRequestException('Failed to update entity');
    }

    // 5. Log the update event
    await this.eventsService.logEvent({
      eventType: 'entity.updated',
      resourceType: 'entity',
      resourceId: id,
      namespace: existingEntity.namespace,
      payload: {
        entityTypeId: existingEntity.entityTypeId,
        entityTypeVersion: existingEntity.entityTypeVersion,
        oldData: existingEntity.data,
        newData: data,
      },
    });

    return updatedEntity;
  }
}
