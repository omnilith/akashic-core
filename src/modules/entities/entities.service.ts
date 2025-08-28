// src/modules/entities/entities.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { EntitiesRepo } from './entities.repo';
import { EntityTypesService } from '../entity-types/entity-types.service';
import { ValidationService } from '../../lib/validation.service';
import { EntityFilterInput } from '../query-builder/dto/query-filter.dto';

@Injectable()
export class EntitiesService {
  constructor(
    private entitiesRepo: EntitiesRepo,
    private entityTypesService: EntityTypesService,
    private validationService: ValidationService,
  ) {}

  async create(namespace: string, entityTypeId: string, data: unknown) {
    // 1. Get the entity type and its schema (outside transaction)
    const entityType = await this.entityTypesService.findById(entityTypeId);
    if (!entityType) {
      throw new BadRequestException('EntityType not found');
    }

    // 2. Validate the data against the schema (outside transaction)
    const validation = this.validationService.validateEntityData(
      entityType.schema as Record<string, unknown>,
      data,
    );

    if (!validation.valid) {
      throw new BadRequestException(
        `Validation failed: ${validation.errors?.join(', ')}`,
      );
    }

    // 3. Create entity with event logging in transaction
    return await this.entitiesRepo.createWithEvent(
      {
        namespace,
        entityTypeId,
        entityTypeVersion: entityType.version,
        data,
      },
      {
        eventType: 'entity.created',
        resourceType: 'entity',
        namespace,
        payload: {
          entityTypeId,
          entityTypeVersion: entityType.version,
          data,
        },
        metadata: {},
      },
    );
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
    // 1. Find the existing entity (outside transaction)
    const existingEntity = await this.entitiesRepo.findById(id);
    if (!existingEntity) {
      throw new BadRequestException('Entity not found');
    }

    // 2. Get the entity type and its schema (outside transaction)
    const entityType = await this.entityTypesService.findById(
      existingEntity.entityTypeId!,
    );
    if (!entityType) {
      throw new BadRequestException('EntityType not found');
    }

    // 3. Validate the new data against the schema (outside transaction)
    const validation = this.validationService.validateEntityData(
      entityType.schema as Record<string, unknown>,
      data,
    );

    if (!validation.valid) {
      throw new BadRequestException(
        `Validation failed: ${validation.errors?.join(', ')}`,
      );
    }

    // 4. Update entity with event logging in transaction
    const updatedEntity = await this.entitiesRepo.updateWithEvent(id, data, {
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
      metadata: {},
    });

    if (!updatedEntity) {
      throw new BadRequestException('Failed to update entity');
    }

    return updatedEntity;
  }

  async delete(id: string) {
    // 1. Find the existing entity (outside transaction)
    const existingEntity = await this.entitiesRepo.findById(id);
    if (!existingEntity) {
      throw new BadRequestException('Entity not found');
    }

    // 2. Delete entity with event logging in transaction
    const deletedEntity = await this.entitiesRepo.deleteWithEvent(id, {
      eventType: 'entity.deleted',
      resourceType: 'entity',
      resourceId: id,
      namespace: existingEntity.namespace,
      payload: {
        entityTypeId: existingEntity.entityTypeId,
        entityTypeVersion: existingEntity.entityTypeVersion,
        data: existingEntity.data,
      },
      metadata: {},
    });

    if (!deletedEntity) {
      throw new BadRequestException('Failed to delete entity');
    }

    return {
      id: deletedEntity.id,
      deleted: true,
      entityTypeId: deletedEntity.entityTypeId!,
    };
  }
}
