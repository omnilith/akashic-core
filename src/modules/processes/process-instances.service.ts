import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProcessInstancesRepo } from './process-instances.repo';
import {
  ProcessDefinitionsService,
  StepDefinition,
} from './process-definitions.service';
import { EventsService } from '../events/events.service';

export interface StartProcessInput {
  namespace: string;
  processDefId: string;
  context?: Record<string, unknown>;
  assignees?: string[];
}

export interface AdvanceProcessInput {
  instanceId: string;
  stepInput?: Record<string, unknown>;
}

interface CompletedStep {
  stepId: string;
  completedAt: Date;
  input?: Record<string, unknown>;
}

@Injectable()
export class ProcessInstancesService {
  constructor(
    private repo: ProcessInstancesRepo,
    private processDefinitionsService: ProcessDefinitionsService,
    private eventsService: EventsService,
  ) {}

  async startProcess(input: StartProcessInput) {
    const processDef = await this.processDefinitionsService.findById(
      input.processDefId,
    );
    if (!processDef) {
      throw new BadRequestException('Process definition not found');
    }

    const steps = processDef.steps as StepDefinition[];
    if (!steps || steps.length === 0) {
      throw new BadRequestException('Process definition has no steps');
    }

    const instance = await this.repo.create({
      processDefId: input.processDefId,
      namespace: input.namespace,
      status: 'running',
      currentStep: steps[0].id,
      currentStepIndex: 0,
      context: input.context || {},
      completedSteps: [],
      assignees: input.assignees || [],
    });

    await this.eventsService.logEvent({
      eventType: 'process_instance.started',
      resourceType: 'process_instance',
      resourceId: instance.id,
      namespace: input.namespace,
      payload: {
        processDefId: input.processDefId,
        processName: processDef.name,
        currentStep: steps[0].id,
        assignees: input.assignees,
      },
    });

    return instance;
  }

  async advanceProcess(input: AdvanceProcessInput) {
    const instance = await this.repo.findById(input.instanceId);
    if (!instance) {
      throw new NotFoundException('Process instance not found');
    }

    if (instance.status !== 'running') {
      throw new BadRequestException('Process is not running');
    }

    const processDef = await this.processDefinitionsService.findById(
      instance.processDefId,
    );
    if (!processDef) {
      throw new NotFoundException('Process definition not found');
    }

    const steps = processDef.steps as StepDefinition[];

    const completedSteps = [...(instance.completedSteps as CompletedStep[])];
    const currentStep = steps[instance.currentStepIndex];

    completedSteps.push({
      stepId: currentStep.id,
      completedAt: new Date(),
      input: input.stepInput,
    });

    const nextStepIndex = instance.currentStepIndex + 1;
    const isCompleted = nextStepIndex >= steps.length;

    const updates = {
      completedSteps,
      currentStepIndex: nextStepIndex,
      currentStep: isCompleted ? null : steps[nextStepIndex].id,
      status: isCompleted ? 'completed' : 'running',
      completedAt: isCompleted ? new Date() : null,
    };

    const updatedInstance = await this.repo.update(instance.id, updates);

    await this.eventsService.logEvent({
      eventType: isCompleted
        ? 'process_instance.completed'
        : 'process_instance.advanced',
      resourceType: 'process_instance',
      resourceId: instance.id,
      namespace: instance.namespace,
      payload: {
        processName: processDef.name,
        completedStep: currentStep.id,
        nextStep: isCompleted ? null : steps[nextStepIndex].id,
        totalSteps: steps.length,
        completedSteps: completedSteps.length,
      },
    });

    return updatedInstance;
  }

  async findAll(namespace?: string) {
    return await this.repo.findAll(namespace);
  }

  async findById(id: string) {
    return await this.repo.findById(id);
  }

  async findRunningProcesses(namespace: string) {
    return await this.repo.findByStatus(namespace, 'running');
  }
}
