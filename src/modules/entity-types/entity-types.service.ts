// src/modules/entity-types/entity-types.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityTypesRepo } from './entity-types.repo';
import { ValidationService } from 'src/lib/validation.service';

@Injectable()
export class EntityTypesService {
  constructor(
    private repo: EntityTypesRepo,
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

    return await this.repo.create({
      namespace,
      name,
      schemaJson: JSON.parse(schemaString),
    });
  }

  async findAll(namespace?: string) {
    return await this.repo.findAll(namespace);
  }

  async findById(id: string) {
    return await this.repo.findById(id);
  }
}
