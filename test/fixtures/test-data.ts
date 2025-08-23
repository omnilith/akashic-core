export const testEntityType = {
  name: 'TestPerson',
  description: 'Test person entity type for E2E tests',
  namespaceId: 'test-e2e',
  schemaJson: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Person name',
      },
      age: {
        type: 'number',
        description: 'Person age',
        minimum: 0,
      },
      email: {
        type: 'string',
        format: 'email',
        description: 'Email address',
      },
      active: {
        type: 'boolean',
        description: 'Whether person is active',
        default: true,
      },
    },
    required: ['name'],
    additionalProperties: false,
  },
};

export const testRelationType = {
  name: 'TestFriendOf',
  description: 'Test friend relationship for E2E tests',
  namespaceId: 'test-e2e',
  fromMaxCardinality: null,
  toMaxCardinality: null,
};

export const testProcessDefinition = {
  name: 'TestWorkflow',
  description: 'Test workflow for E2E tests',
  namespaceId: 'test-e2e',
  steps: [
    {
      name: 'Start',
      type: 'start',
      config: {},
    },
    {
      name: 'Process',
      type: 'task',
      config: {
        action: 'log',
        message: 'Processing',
      },
    },
    {
      name: 'End',
      type: 'end',
      config: {},
    },
  ],
};

export const testEntity = {
  data: {
    name: 'John Doe',
    age: 30,
    email: 'john@example.com',
    active: true,
  },
};

export const cleanupTestData = `
  mutation CleanupTestData {
    deleteEntitiesByNamespace(namespaceId: "test-e2e") {
      count
    }
  }
`;
