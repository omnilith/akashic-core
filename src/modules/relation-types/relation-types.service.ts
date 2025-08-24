// src/modules/relation-types/relation-types.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { RelationTypesRepo } from './relation-types.repo';
import { EntityTypesService } from '../entity-types/entity-types.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class RelationTypesService {
  constructor(
    private repo: RelationTypesRepo,
    private entityTypesService: EntityTypesService,
    private eventsService: EventsService,
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

    // Check for duplicate name in same namespace
    const existing = await this.repo.findByNameAndNamespace(name, namespace);
    if (existing) {
      throw new ConflictException(
        `RelationType with name '${name}' already exists in namespace '${namespace}'`,
      );
    }

    // Validate namespace compatibility between entity types
    if (
      fromEntityType.namespace !== toEntityType.namespace &&
      fromEntityType.namespace !== 'global' &&
      toEntityType.namespace !== 'global'
    ) {
      throw new BadRequestException(
        `Cannot create relation between entities in different namespaces: ` +
          `${fromEntityType.namespace} and ${toEntityType.namespace}`,
      );
    }

    // Validate cardinality format
    const validCardinalities = ['1..1', '1..n', 'n..1', 'n..n'];
    if (!validCardinalities.includes(cardinality)) {
      throw new BadRequestException(
        `Invalid cardinality. Must be one of: ${validCardinalities.join(', ')}`,
      );
    }

    // Validate self-referential relations
    if (fromEntityTypeId === toEntityTypeId && cardinality === '1..1') {
      throw new BadRequestException(
        'Self-referential relations cannot have 1..1 cardinality',
      );
    }

    const relationType = await this.repo.create({
      namespace,
      name,
      fromEntityTypeId,
      toEntityTypeId,
      cardinality,
    });

    await this.eventsService.logEvent({
      eventType: 'relationType.created',
      resourceType: 'relationType',
      resourceId: relationType.id,
      namespace,
      payload: {
        name,
        fromEntityTypeId,
        toEntityTypeId,
        cardinality,
      },
    });

    return relationType;
  }

  async update(id: string, name?: string, cardinality?: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`RelationType with id ${id} not found`);
    }

    const updates: Partial<{
      name: string;
      cardinality: string;
    }> = {};

    if (name !== undefined) {
      // Check for duplicate name in same namespace
      const duplicate = await this.repo.findByNameAndNamespace(
        name,
        existing.namespace,
      );
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(
          `RelationType with name '${name}' already exists in namespace '${existing.namespace}'`,
        );
      }
      updates.name = name;
    }

    if (cardinality !== undefined) {
      // Validate cardinality format
      const validCardinalities = ['1..1', '1..n', 'n..1', 'n..n'];
      if (!validCardinalities.includes(cardinality)) {
        throw new BadRequestException(
          `Invalid cardinality. Must be one of: ${validCardinalities.join(', ')}`,
        );
      }
      updates.cardinality = cardinality;
    }

    const updated = await this.repo.update(id, updates);

    if (!updated) {
      throw new Error('Failed to update relation type');
    }

    await this.eventsService.logEvent({
      eventType: 'relationType.updated',
      resourceType: 'relationType',
      resourceId: id,
      namespace: existing.namespace,
      payload: {
        before: {
          name: existing.name,
          cardinality: existing.cardinality,
        },
        after: {
          name: updated.name,
          cardinality: updated.cardinality,
        },
      },
    });

    return updated;
  }

  async delete(id: string) {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`RelationType with id ${id} not found`);
    }

    const hasRelations = await this.repo.hasRelations(id);
    if (hasRelations) {
      throw new ConflictException(
        `Cannot delete RelationType ${existing.name}: relations of this type exist`,
      );
    }

    const deleted = await this.repo.delete(id);

    if (!deleted) {
      throw new Error('Failed to delete relation type');
    }

    await this.eventsService.logEvent({
      eventType: 'relationType.deleted',
      resourceType: 'relationType',
      resourceId: id,
      namespace: existing.namespace,
      payload: {
        name: existing.name,
        fromEntityTypeId: existing.fromEntityTypeId,
        toEntityTypeId: existing.toEntityTypeId,
        cardinality: existing.cardinality,
      },
    });

    return { id, deleted: true };
  }

  async findAll(namespace?: string, limit?: number, offset?: number) {
    return await this.repo.findAll(namespace, limit, offset);
  }

  async countAll(namespace?: string) {
    return await this.repo.countAll(namespace);
  }

  async findById(id: string) {
    return await this.repo.findById(id);
  }

  async findByNameAndNamespace(name: string, namespace: string) {
    return await this.repo.findByNameAndNamespace(name, namespace);
  }
}
