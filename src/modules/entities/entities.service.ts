// src/modules/entities/entities.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { EntitiesRepo } from './entities.repo';
import { EntityTypesService } from '../entity-types/entity-types.service';
import { ValidationService } from '../../lib/validation.service';

@Injectable()
export class EntitiesService {
  constructor(
    private entitiesRepo: EntitiesRepo,
    private entityTypesService: EntityTypesService,
    private validationService: ValidationService,
  ) {}

  async create(namespace: string, entityTypeId: string, data: any) {
    // 1. Get the entity type and its schema
    const entityType = await this.entityTypesService.findById(entityTypeId);
    if (!entityType) {
      throw new BadRequestException('EntityType not found');
    }

    // 2. Validate the data against the schema
    const validation = this.validationService.validateEntityData(
      entityType.schemaJson,
      data,
    );

    if (!validation.valid) {
      throw new BadRequestException(
        `Validation failed: ${validation.errors?.join(', ')}`,
      );
    }

    // 3. Create the entity
    return await this.entitiesRepo.create({
      namespace,
      entityTypeId,
      entityTypeVersion: entityType.version,
      data,
    });
  }

  async findAll(namespace?: string) {
    return await this.entitiesRepo.findAll(namespace);
  }

  async findById(id: string) {
    return await this.entitiesRepo.findById(id);
  }
}
