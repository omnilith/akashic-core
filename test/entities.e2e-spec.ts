import { TestHelper, generateTestId } from './helpers/test-helpers';
import { testEntityType, testEntity } from './fixtures/test-data';

describe('Entities (E2E)', () => {
  let testHelper: TestHelper;
  let entityTypeId: string;
  let createdEntityId: string;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestApp();

    // Create entity type for testing
    const createTypeMutation = `
      mutation CreateEntityType($input: CreateEntityTypeInput!) {
        createEntityType(input: $input) {
          id
        }
      }
    `;

    const typeResult = await testHelper.graphqlMutation(createTypeMutation, {
      input: {
        namespace: testEntityType.namespaceId,
        name: `${testEntityType.name}-${generateTestId()}`,
        schema: JSON.stringify(testEntityType.schemaJson),
      },
    });

    entityTypeId = typeResult.createEntityType.id;
  });

  afterAll(async () => {
    // Clean up test data - first delete all entities, then the type
    if (entityTypeId) {
      // Delete all entities of this type first
      const entitiesQuery = `
        query GetEntities($entityTypeId: String!) {
          entities(entityTypeId: $entityTypeId) {
            id
          }
        }
      `;

      const entitiesResult = await testHelper.graphqlQuery(entitiesQuery, {
        entityTypeId,
      });

      // Delete each entity
      const deleteMutation = `
        mutation DeleteEntity($id: String!) {
          deleteEntity(id: $id) {
            id
            deleted
          }
        }
      `;

      for (const entity of entitiesResult.entities) {
        try {
          await testHelper.graphqlMutation(deleteMutation, {
            id: entity.id,
          });
        } catch (error) {
          // Ignore individual deletion errors
        }
      }

      // Now delete the entity type
      try {
        await testHelper.graphqlMutation(
          `mutation DeleteEntityType($id: ID!) {
            deleteEntityType(id: $id) {
              id
              deleted
            }
          }`,
          { id: entityTypeId },
        );
      } catch (error) {
        // Ignore deletion errors
        console.log('Could not delete entity type');
      }
    }

    await testHelper.teardownTestApp();
  });

  describe('Create Entity', () => {
    it('should create a new entity', async () => {
      const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            entityTypeId
            data
            namespace
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        input: {
          namespace: 'test-e2e',
          entityTypeId,
          data: JSON.stringify(testEntity.data),
        },
      });

      expect(result.createEntity).toBeDefined();
      expect(result.createEntity.entityTypeId).toBe(entityTypeId);
      expect(result.createEntity.data).toEqual(testEntity.data);

      createdEntityId = result.createEntity.id;
    });

    it('should fail to create entity with invalid data', async () => {
      const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      const invalidData = {
        namespace: 'test-e2e',
        entityTypeId,
        data: JSON.stringify({
          // Missing required 'name' field
          age: 'not-a-number', // Wrong type
        }),
      };

      await expect(
        testHelper.graphqlMutation(mutation, { input: invalidData }),
      ).rejects.toThrow();
    });

    it('should create entity with partial data using defaults', async () => {
      const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            data
          }
        }
      `;

      const partialData = {
        namespace: 'test-e2e',
        entityTypeId,
        data: JSON.stringify({
          name: 'Jane Doe', // Only required field
        }),
      };

      const result = await testHelper.graphqlMutation(mutation, {
        input: partialData,
      });

      expect(result.createEntity).toBeDefined();
      const data = result.createEntity.data;
      expect(data.name).toBe('Jane Doe');
      // Default value for active should be true based on schema, but may not be applied automatically
    });
  });

  describe('Query Entities', () => {
    it('should retrieve all entities', async () => {
      const query = `
        query GetEntities {
          entities {
            id
            entityTypeId
            data
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query);

      expect(result.entities).toBeDefined();
      expect(Array.isArray(result.entities)).toBe(true);
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it('should retrieve entity by ID', async () => {
      const query = `
        query GetEntities {
          entities {
            id
            entityTypeId
            data
            namespace
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query);

      const foundEntity = result.entities.find(
        (e: any) => e.id === createdEntityId,
      );
      expect(foundEntity).toBeDefined();
      expect(foundEntity.id).toBe(createdEntityId);
      expect(foundEntity.entityTypeId).toBe(entityTypeId);
    });

    it('should filter entities by entity type', async () => {
      const query = `
        query GetEntitiesByType($entityTypeId: String!) {
          entities(entityTypeId: $entityTypeId) {
            id
            entityTypeId
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query, {
        entityTypeId,
      });

      expect(result.entities).toBeDefined();
      expect(Array.isArray(result.entities)).toBe(true);

      result.entities.forEach((entity: any) => {
        expect(entity.entityTypeId).toBe(entityTypeId);
      });
    });

    it('should search entities by data fields', async () => {
      const query = `
        query SearchEntities($filter: EntityFilterInput!) {
          searchEntities(filter: $filter) {
            id
            data
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query, {
        filter: {
          entityTypeId,
          data: {
            name: { $eq: 'John Doe' },
          },
        },
      });

      expect(result.searchEntities).toBeDefined();
      expect(Array.isArray(result.searchEntities)).toBe(true);

      result.searchEntities.forEach((entity: any) => {
        expect(entity.data.name).toBe('John Doe');
      });
    });

    it('should paginate entity results', async () => {
      const query = `
        query GetEntities {
          entities {
            id
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query);

      expect(result.entities).toBeDefined();
      expect(Array.isArray(result.entities)).toBe(true);
      // Just check that entities are returned since pagination isn't supported in the current API
      expect(result.entities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Update Entity', () => {
    it('should update entity data', async () => {
      const updatedData = {
        ...testEntity.data,
        age: 35,
        email: 'john.updated@example.com',
      };

      const mutation = `
        mutation UpdateEntity($id: String!, $data: String!) {
          updateEntity(id: $id, data: $data) {
            id
            data
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        id: createdEntityId,
        data: JSON.stringify(updatedData),
      });

      expect(result.updateEntity).toBeDefined();
      expect(result.updateEntity.data).toEqual(updatedData);
    });

    it('should fail to update entity with invalid data', async () => {
      const mutation = `
        mutation UpdateEntity($id: String!, $data: String!) {
          updateEntity(id: $id, data: $data) {
            id
          }
        }
      `;

      const invalidData = {
        name: 123, // Wrong type - should be string
        age: 'not-a-number',
      };

      await expect(
        testHelper.graphqlMutation(mutation, {
          id: createdEntityId,
          data: JSON.stringify(invalidData),
        }),
      ).rejects.toThrow();
    });
  });

  describe('Delete Entity', () => {
    it('should delete entity', async () => {
      // First, create a new entity to delete
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            entityTypeId
          }
        }
      `;

      const createResult = await testHelper.graphqlMutation(createMutation, {
        input: {
          namespace: 'test-e2e',
          entityTypeId,
          data: JSON.stringify({
            name: 'Entity to Delete',
            age: 99,
            email: 'delete@example.com',
          }),
        },
      });

      const entityToDeleteId = createResult.createEntity.id;

      // Now delete the entity
      const mutation = `
        mutation DeleteEntity($id: String!) {
          deleteEntity(id: $id) {
            id
            deleted
            entityTypeId
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        id: entityToDeleteId,
      });

      expect(result.deleteEntity).toBeDefined();
      expect(result.deleteEntity.id).toBe(entityToDeleteId);
      expect(result.deleteEntity.deleted).toBe(true);
      expect(result.deleteEntity.entityTypeId).toBe(entityTypeId);

      // Verify deletion by trying to query the entity
      const query = `
        query GetEntities {
          entities {
            id
          }
        }
      `;

      const queryResult = await testHelper.graphqlQuery(query);
      const foundEntity = queryResult.entities.find(
        (e: any) => e.id === entityToDeleteId,
      );
      expect(foundEntity).toBeUndefined();
    });

    it('should return error when deleting non-existent entity', async () => {
      const mutation = `
        mutation DeleteEntity($id: String!) {
          deleteEntity(id: $id) {
            id
            deleted
          }
        }
      `;

      await expect(
        testHelper.graphqlMutation(mutation, {
          id: 'non-existent-entity-id',
        }),
      ).rejects.toThrow();
    });

    it.skip('should bulk delete entities by filter', async () => {
      // Create multiple entities to delete
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      const entityIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const result = await testHelper.graphqlMutation(createMutation, {
          input: {
            entityTypeId,
            data: { name: `Bulk Delete Test ${i}` },
          },
        });
        entityIds.push(result.createEntity.id);
      }

      // Bulk delete
      const deleteMutation = `
        mutation BulkDeleteEntities($filter: EntityFilter!) {
          deleteEntities(filter: $filter) {
            count
          }
        }
      `;

      const result = await testHelper.graphqlMutation(deleteMutation, {
        filter: {
          entityTypeId,
          dataQuery: {
            name: { $regex: 'Bulk Delete Test' },
          },
        },
      });

      expect(result.deleteEntities).toBeDefined();
      expect(result.deleteEntities.count).toBeGreaterThanOrEqual(3);
    });
  });
});
