// src/modules/entity-types/entity-types.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
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
      schema: JSON.parse(schemaString) as Record<string, unknown>,
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

  async update(id: string, name?: string, schemaString?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`EntityType with id ${id} not found`);
    }

    const updates: Partial<{
      name: string;
      schema: unknown;
    }> = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (schemaString !== undefined) {
      const schemaJson = JSON.parse(schemaString) as unknown;
      const validationResult =
        this.validationService.validateSchema(schemaJson);

      if (!validationResult.valid) {
        throw new BadRequestException(
          `Invalid schema: ${validationResult.errors?.join(', ')}`,
        );
      }

      updates.schema = schemaJson;
    }

    const updated = await this.repo.update(id, updates);

    if (!updated) {
      throw new Error('Failed to update entity type');
    }

    await this.eventsService.logEvent({
      eventType: 'entity_type.updated',
      resourceType: 'entity_type',
      resourceId: id,
      namespace: existing.namespace,
      payload: {
        before: {
          name: existing.name,
          schema: existing.schema as Record<string, unknown>,
          version: existing.version,
        },
        after: {
          name: updated.name,
          schema: updated.schema as Record<string, unknown>,
          version: updated.version,
        },
      },
    });

    return updated;
  }

  async delete(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`EntityType with id ${id} not found`);
    }

    const hasEntities = await this.repo.hasEntities(id);
    if (hasEntities) {
      throw new ConflictException(
        `Cannot delete EntityType ${existing.name}: entities of this type exist`,
      );
    }

    const deleted = await this.repo.delete(id);

    if (!deleted) {
      throw new Error('Failed to delete entity type');
    }

    await this.eventsService.logEvent({
      eventType: 'entity_type.deleted',
      resourceType: 'entity_type',
      resourceId: id,
      namespace: existing.namespace,
      payload: {
        name: existing.name,
        schema: existing.schema as Record<string, unknown>,
        version: existing.version,
      },
    });

    return { id, deleted: true };
  }

  async findAll(namespace?: string) {
    return await this.repo.findAll(namespace);
  }

  async findById(id: string) {
    return await this.repo.findById(id);
  }

  async findByNameAndNamespace(name: string, namespace: string) {
    return await this.repo.findByNameAndNamespace(name, namespace);
  }
}
