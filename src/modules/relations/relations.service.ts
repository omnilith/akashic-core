// src/modules/relations/relations.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RelationsRepo } from './relations.repo';
import { RelationTypesService } from '../relation-types/relation-types.service';
import { EntitiesService } from '../entities/entities.service';

@Injectable()
export class RelationsService {
  constructor(
    private relationsRepo: RelationsRepo,
    private relationTypesService: RelationTypesService,
    private entitiesService: EntitiesService,
  ) {}

  async create(
    namespace: string,
    relationTypeId: string,
    fromEntityId: string,
    toEntityId: string,
    metadata?: any,
  ) {
    // 1. Validate that the relation type exists
    const relationType =
      await this.relationTypesService.findById(relationTypeId);
    if (!relationType) {
      throw new BadRequestException('RelationType not found');
    }

    // 2. Validate that both entities exist
    const fromEntity = await this.entitiesService.findById(fromEntityId);
    if (!fromEntity) {
      throw new BadRequestException('From Entity not found');
    }

    const toEntity = await this.entitiesService.findById(toEntityId);
    if (!toEntity) {
      throw new BadRequestException('To Entity not found');
    }

    // 3. Validate that the entity types match the relation type definition
    if (fromEntity.entityTypeId !== relationType.fromEntityTypeId) {
      throw new BadRequestException(
        'From Entity type does not match RelationType fromEntityTypeId',
      );
    }

    if (toEntity.entityTypeId !== relationType.toEntityTypeId) {
      throw new BadRequestException(
        'To Entity type does not match RelationType toEntityTypeId',
      );
    }

    // 4. Create the relation
    return await this.relationsRepo.create({
      namespace,
      relationTypeId,
      fromEntityId,
      toEntityId,
      metadata,
    });
  }

  async findAll(filters?: {
    namespace?: string;
    relationTypeId?: string;
    fromEntityId?: string;
    toEntityId?: string;
  }) {
    return await this.relationsRepo.findAll(filters);
  }

  async findById(id: string) {
    return await this.relationsRepo.findById(id);
  }

  async delete(id: string) {
    const relation = await this.relationsRepo.findById(id);
    if (!relation) {
      throw new NotFoundException('Relation not found');
    }

    const deleted = await this.relationsRepo.delete(id);
    if (!deleted) {
      throw new BadRequestException('Failed to delete relation');
    }

    return relation;
  }
}
