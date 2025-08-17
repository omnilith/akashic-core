import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ProcessInstancesService } from './process-instances.service';
import { ProcessInstanceDto } from './dto/process-instance.dto';
import { StartProcessInput } from './dto/start-process.input';
import { AdvanceProcessInput } from './dto/advance-process.input';

@Resolver(() => ProcessInstanceDto)
export class ProcessInstancesResolver {
  constructor(private processInstancesService: ProcessInstancesService) {}

  @Mutation(() => ProcessInstanceDto)
  async startProcess(@Args('input') input: StartProcessInput) {
    const context = input.context
      ? (JSON.parse(input.context) as Record<string, unknown>)
      : {};

    return await this.processInstancesService.startProcess({
      namespace: input.namespace,
      processDefId: input.processDefId,
      context,
      assignees: input.assignees,
    });
  }

  @Mutation(() => ProcessInstanceDto)
  async advanceProcess(@Args('input') input: AdvanceProcessInput) {
    const stepInput = input.stepInput
      ? (JSON.parse(input.stepInput) as Record<string, unknown>)
      : {};

    return await this.processInstancesService.advanceProcess({
      instanceId: input.instanceId,
      stepInput,
    });
  }

  @Query(() => [ProcessInstanceDto])
  async processInstances(
    @Args('namespace', { nullable: true }) namespace?: string,
  ) {
    return await this.processInstancesService.findAll(namespace);
  }

  @Query(() => ProcessInstanceDto, { nullable: true })
  async processInstance(@Args('id', { type: () => ID }) id: string) {
    return await this.processInstancesService.findById(id);
  }

  @Query(() => [ProcessInstanceDto])
  async runningProcesses(@Args('namespace') namespace: string) {
    return await this.processInstancesService.findRunningProcesses(namespace);
  }
}
