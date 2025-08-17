import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import {
  ProcessDefinitionsService,
  StepDefinition,
} from './process-definitions.service';
import { ProcessDefinitionDto } from './dto/process-definition.dto';
import { CreateProcessDefinitionInput } from './dto/create-process-definition.input';

@Resolver(() => ProcessDefinitionDto)
export class ProcessDefinitionsResolver {
  constructor(private processDefinitionsService: ProcessDefinitionsService) {}

  @Mutation(() => ProcessDefinitionDto)
  async createProcessDefinition(
    @Args('input') input: CreateProcessDefinitionInput,
  ) {
    const steps = JSON.parse(input.steps) as StepDefinition[];

    return await this.processDefinitionsService.create({
      namespace: input.namespace,
      name: input.name,
      description: input.description,
      steps,
    });
  }

  @Query(() => [ProcessDefinitionDto])
  async processDefinitions(
    @Args('namespace', { nullable: true }) namespace?: string,
  ) {
    return await this.processDefinitionsService.findAll(namespace);
  }

  @Query(() => ProcessDefinitionDto, { nullable: true })
  async processDefinition(@Args('id') id: string) {
    return await this.processDefinitionsService.findById(id);
  }
}
