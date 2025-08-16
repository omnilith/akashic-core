// src/modules/entity-types/entity-types.service.ts
import { Injectable } from '@nestjs/common';
import { EntityTypesRepo } from './entity-types.repo';

@Injectable()
export class EntityTypesService {
  constructor(private repo: EntityTypesRepo) {}

  async create(namespace: string, name: string, schema: any) {
    // TODO: Validate JSON schema format
    return await this.repo.create({
      namespace,
      name,
      schemaJson: schema,
    });
  }

  async findAll(namespace?: string) {
    return await this.repo.findAll(namespace);
  }
}
