// src/modules/relation-types/relation-types.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { RelationTypesRepo } from './relation-types.repo';
import { EntityTypesService } from '../entity-types/entity-types.service';

@Injectable()
export class RelationTypesService {
  constructor(
    private repo: RelationTypesRepo,
    private entityTypesService: EntityTypesService,
  ) {}

  async create(
    namespace: string,
    name: string,
    fromEntityTypeId: string,
    toEntityTypeId: string,
    cardinality: string,
  ) {
    // Validate that both entity types exist
    const fromEntityType =
      await this.entityTypesService.findById(fromEntityTypeId);
    if (!fromEntityType) {
      throw new BadRequestException('From EntityType not found');
    }

    const toEntityType = await this.entityTypesService.findById(toEntityTypeId);
    if (!toEntityType) {
      throw new BadRequestException('To EntityType not found');
    }

    // Validate cardinality format
    const validCardinalities = ['1..1', '1..n', 'n..1', 'n..n'];
    if (!validCardinalities.includes(cardinality)) {
      throw new BadRequestException(
        `Invalid cardinality. Must be one of: ${validCardinalities.join(', ')}`,
      );
    }

    return await this.repo.create({
      namespace,
      name,
      fromEntityTypeId,
      toEntityTypeId,
      cardinality,
    });
  }

  async findAll(namespace?: string) {
    return await this.repo.findAll(namespace);
  }

  async findById(id: string) {
    return await this.repo.findById(id);
  }
}
