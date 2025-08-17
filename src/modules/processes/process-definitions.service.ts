// src/modules/processes/process-definitions.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ProcessDefinitionsRepo } from './process-definitions.repo';
import { EventsService } from '../events/events.service';

export interface StepDefinition {
  id: string;
  label: string;
  description?: string;
  guard?: string; // CEL expression like "allActiveProjectsHaveNextActions()"
  action?: string; // Action to execute like "markComplete" or "tagFocus(3)"
  optional?: boolean;
}

export interface ProcessDefInput {
  namespace: string;
  name: string;
  description?: string;
  steps: StepDefinition[];
}

@Injectable()
export class ProcessDefinitionsService {
  constructor(
    private repo: ProcessDefinitionsRepo,
    private eventsService: EventsService,
  ) {}

  async create(input: ProcessDefInput) {
    // Validate process definition
    this.validateProcessDefinition(input);

    const processDef = await this.repo.create({
      namespace: input.namespace,
      name: input.name,
      description: input.description,
      steps: input.steps,
    });

    // Log event
    await this.eventsService.logEvent({
      eventType: 'process_definition.created',
      resourceType: 'process_definition',
      resourceId: processDef.id,
      namespace: input.namespace,
      payload: {
        name: input.name,
        description: input.description,
        stepsCount: input.steps.length,
        steps: input.steps,
      },
    });

    return processDef;
  }

  async findAll(namespace?: string) {
    return await this.repo.findAll(namespace);
  }

  async findById(id: string) {
    return await this.repo.findById(id);
  }

  async findByName(namespace: string, name: string) {
    return await this.repo.findByName(namespace, name);
  }

  private validateProcessDefinition(input: ProcessDefInput) {
    if (!input.steps || input.steps.length === 0) {
      throw new BadRequestException('Process must have at least one step');
    }

    // Check for duplicate step IDs
    const stepIds = input.steps.map((s) => s.id);
    const duplicates = stepIds.filter(
      (id, index) => stepIds.indexOf(id) !== index,
    );
    if (duplicates.length > 0) {
      throw new BadRequestException(
        `Duplicate step IDs: ${duplicates.join(', ')}`,
      );
    }

    // Validate each step
    for (const step of input.steps) {
      if (!step.id || !step.label) {
        throw new BadRequestException('Each step must have id and label');
      }

      // TODO: Validate guard expressions (CEL syntax)
      // TODO: Validate action expressions
    }
  }
}
