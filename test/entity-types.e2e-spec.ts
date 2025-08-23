import { TestHelper, generateTestId } from './helpers/test-helpers';
import { testEntityType } from './fixtures/test-data';

describe('EntityTypes (E2E)', () => {
  let testHelper: TestHelper;
  let createdEntityTypeId: string;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestApp();
  });

  afterAll(async () => {
    await testHelper.teardownTestApp();
  });

  describe('Create EntityType', () => {
    it('should create a new entity type', async () => {
      const testName = `${testEntityType.name}-${generateTestId()}`;

      const mutation = `
        mutation CreateEntityType($input: CreateEntityTypeInput!) {
          createEntityType(input: $input) {
            id
            name
            namespace
            schemaJson
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        input: {
          namespace: testEntityType.namespaceId,
          name: testName,
          schema: JSON.stringify(testEntityType.schemaJson),
        },
      });

      expect(result.createEntityType).toBeDefined();
      expect(result.createEntityType.name).toBe(testName);
      expect(result.createEntityType.namespace).toBe(
        testEntityType.namespaceId,
      );
      expect(result.createEntityType.schemaJson).toEqual(
        testEntityType.schemaJson,
      );

      createdEntityTypeId = result.createEntityType.id;
    });

    it('should fail to create entity type with invalid schema', async () => {
      const mutation = `
        mutation CreateEntityType($input: CreateEntityTypeInput!) {
          createEntityType(input: $input) {
            id
          }
        }
      `;

      const invalidSchema = {
        namespace: 'test-e2e',
        name: 'InvalidType',
        schema: JSON.stringify({
          type: 'invalid-type', // Invalid JSON Schema type
        }),
      };

      await expect(
        testHelper.graphqlMutation(mutation, { input: invalidSchema }),
      ).rejects.toThrow();
    });
  });

  describe('Query EntityTypes', () => {
    it('should retrieve all entity types', async () => {
      const query = `
        query GetEntityTypes {
          entityTypes {
            id
            name
            namespace
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query);

      expect(result.entityTypes).toBeDefined();
      expect(Array.isArray(result.entityTypes)).toBe(true);
      expect(result.entityTypes.length).toBeGreaterThan(0);
    });

    it('should retrieve entity type by ID', async () => {
      const query = `
        query GetEntityTypes {
          entityTypes {
            id
            name
            namespace
            schemaJson
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query);

      const foundType = result.entityTypes.find(
        (t: any) => t.id === createdEntityTypeId,
      );
      expect(foundType).toBeDefined();
      expect(foundType.id).toBe(createdEntityTypeId);
    });

    it('should filter entity types by namespace', async () => {
      const query = `
        query GetEntityTypesByNamespace {
          entityTypes {
            id
            name
            namespace
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query);

      expect(result.entityTypes).toBeDefined();
      expect(Array.isArray(result.entityTypes)).toBe(true);

      const testTypes = result.entityTypes.filter(
        (type: any) => type.namespace === 'test-e2e',
      );
      expect(testTypes.length).toBeGreaterThan(0);
    });
  });

  describe('Update EntityType', () => {
    it('should update entity type description', async () => {
      if (!createdEntityTypeId) {
        // Create a type for this test
        const createMutation = `
          mutation CreateEntityType($input: CreateEntityTypeInput!) {
            createEntityType(input: $input) {
              id
            }
          }
        `;
        const created = await testHelper.graphqlMutation(createMutation, {
          input: {
            namespace: testEntityType.namespaceId,
            name: `UpdateTest-${generateTestId()}`,
            schema: JSON.stringify(testEntityType.schemaJson),
          },
        });
        createdEntityTypeId = created.createEntityType.id;
      }

      const newName = 'UpdatedTestPerson';

      const mutation = `
        mutation UpdateEntityType($input: UpdateEntityTypeInput!) {
          updateEntityType(input: $input) {
            id
            name
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        input: {
          id: createdEntityTypeId,
          name: newName,
        },
      });

      expect(result.updateEntityType).toBeDefined();
      expect(result.updateEntityType.name).toBe(newName);
    });

    it('should update entity type schema', async () => {
      if (!createdEntityTypeId) {
        // Create a type for this test
        const createMutation = `
          mutation CreateEntityType($input: CreateEntityTypeInput!) {
            createEntityType(input: $input) {
              id
            }
          }
        `;
        const created = await testHelper.graphqlMutation(createMutation, {
          input: {
            namespace: testEntityType.namespaceId,
            name: `SchemaTest-${generateTestId()}`,
            schema: JSON.stringify(testEntityType.schemaJson),
          },
        });
        createdEntityTypeId = created.createEntityType.id;
      }

      const updatedSchema = {
        ...testEntityType.schemaJson,
        properties: {
          ...testEntityType.schemaJson.properties,
          nickname: {
            type: 'string',
            description: 'Nickname',
          },
        },
      };

      const mutation = `
        mutation UpdateEntityType($input: UpdateEntityTypeInput!) {
          updateEntityType(input: $input) {
            id
            schemaJson
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        input: {
          id: createdEntityTypeId,
          schema: JSON.stringify(updatedSchema),
        },
      });

      expect(result.updateEntityType).toBeDefined();
      expect(result.updateEntityType.schemaJson).toEqual(updatedSchema);
    });
  });

  describe('Delete EntityType', () => {
    it('should delete entity type', async () => {
      if (!createdEntityTypeId) {
        // Create a type for this test
        const createMutation = `
          mutation CreateEntityType($input: CreateEntityTypeInput!) {
            createEntityType(input: $input) {
              id
            }
          }
        `;
        const created = await testHelper.graphqlMutation(createMutation, {
          input: {
            namespace: testEntityType.namespaceId,
            name: `DeleteTest-${generateTestId()}`,
            schema: JSON.stringify(testEntityType.schemaJson),
          },
        });
        createdEntityTypeId = created.createEntityType.id;
      }

      const mutation = `
        mutation DeleteEntityType($id: ID!) {
          deleteEntityType(id: $id) {
            id
            deleted
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        id: createdEntityTypeId,
      });

      expect(result.deleteEntityType).toBeDefined();
      expect(result.deleteEntityType.deleted).toBe(true);

      // Verify deletion
      const query = `
        query GetEntityTypes {
          entityTypes {
            id
          }
        }
      `;

      const queryResult = await testHelper.graphqlQuery(query);

      const deletedType = queryResult.entityTypes.find(
        (t: any) => t.id === createdEntityTypeId,
      );
      expect(deletedType).toBeUndefined();
    });
  });
});
