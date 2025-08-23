import { TestHelper, generateTestId } from './helpers/test-helpers';
import { testEntityType, testEntity, testRelationType } from './fixtures/test-data';

describe('Relations (E2E)', () => {
  let testHelper: TestHelper;
  let entityTypeId: string;
  let relationTypeId: string;
  let fromEntityId: string;
  let toEntityId: string;
  let createdRelationId: string;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestApp();

    // Create entity type
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

    // Create relation type
    const createRelationTypeMutation = `
      mutation CreateRelationType($input: CreateRelationTypeInput!) {
        createRelationType(input: $input) {
          id
        }
      }
    `;

    const relationTypeResult = await testHelper.graphqlMutation(
      createRelationTypeMutation,
      {
        input: {
          ...testRelationType,
          name: `${testRelationType.name}-${generateTestId()}`,
          fromEntityTypeId: entityTypeId,
          toEntityTypeId: entityTypeId,
        },
      }
    );
    relationTypeId = relationTypeResult.createRelationType.id;

    // Create two entities for testing relations
    const createEntityMutation = `
      mutation CreateEntity($input: CreateEntityInput!) {
        createEntity(input: $input) {
          id
        }
      }
    `;

    const fromEntity = await testHelper.graphqlMutation(createEntityMutation, {
      input: {
        entityTypeId,
        data: { name: 'Alice' },
      },
    });
    fromEntityId = fromEntity.createEntity.id;

    const toEntity = await testHelper.graphqlMutation(createEntityMutation, {
      input: {
        entityTypeId,
        data: { name: 'Bob' },
      },
    });
    toEntityId = toEntity.createEntity.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (relationTypeId) {
      await testHelper.graphqlMutation(
        `mutation DeleteRelationType($id: ID!) {
          deleteRelationType(id: $id) {
            success
          }
        }`,
        { id: relationTypeId }
      );
    }

    if (entityTypeId) {
      await testHelper.graphqlMutation(
        `mutation DeleteEntityType($id: ID!) {
          deleteEntityType(id: $id) {
            success
          }
        }`,
        { id: entityTypeId }
      );
    }
    
    await testHelper.teardownTestApp();
  });

  describe('Create Relation', () => {
    it('should create a new relation', async () => {
      const mutation = `
        mutation CreateRelation($input: CreateRelationInput!) {
          createRelation(input: $input) {
            id
            relationTypeId
            fromEntityId
            toEntityId
            properties
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        input: {
          relationTypeId,
          fromEntityId,
          toEntityId,
          properties: {
            since: '2024-01-01',
            strength: 'strong',
          },
        },
      });

      expect(result.createRelation).toBeDefined();
      expect(result.createRelation.relationTypeId).toBe(relationTypeId);
      expect(result.createRelation.fromEntityId).toBe(fromEntityId);
      expect(result.createRelation.toEntityId).toBe(toEntityId);
      expect(result.createRelation.properties).toEqual({
        since: '2024-01-01',
        strength: 'strong',
      });
      
      createdRelationId = result.createRelation.id;
    });

    it('should fail to create duplicate relation', async () => {
      const mutation = `
        mutation CreateRelation($input: CreateRelationInput!) {
          createRelation(input: $input) {
            id
          }
        }
      `;

      await expect(
        testHelper.graphqlMutation(mutation, {
          input: {
            relationTypeId,
            fromEntityId,
            toEntityId,
          },
        })
      ).rejects.toThrow();
    });

    it('should respect cardinality constraints', async () => {
      // Create relation type with max cardinality of 1
      const createConstrainedTypeMutation = `
        mutation CreateRelationType($input: CreateRelationTypeInput!) {
          createRelationType(input: $input) {
            id
          }
        }
      `;

      const constrainedType = await testHelper.graphqlMutation(
        createConstrainedTypeMutation,
        {
          input: {
            name: `ConstrainedType-${generateTestId()}`,
            namespaceId: 'test-e2e',
            fromEntityTypeId: entityTypeId,
            toEntityTypeId: entityTypeId,
            fromMaxCardinality: 1,
            toMaxCardinality: 1,
          },
        }
      );

      const constrainedTypeId = constrainedType.createRelationType.id;

      // Create third entity
      const createEntityMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      const thirdEntity = await testHelper.graphqlMutation(
        createEntityMutation,
        {
          input: {
            entityTypeId,
            data: { name: 'Charlie' },
          },
        }
      );
      const thirdEntityId = thirdEntity.createEntity.id;

      // Create first relation (should succeed)
      const createRelationMutation = `
        mutation CreateRelation($input: CreateRelationInput!) {
          createRelation(input: $input) {
            id
          }
        }
      `;

      await testHelper.graphqlMutation(createRelationMutation, {
        input: {
          relationTypeId: constrainedTypeId,
          fromEntityId,
          toEntityId: thirdEntityId,
        },
      });

      // Try to create second relation from same entity (should fail due to cardinality)
      await expect(
        testHelper.graphqlMutation(createRelationMutation, {
          input: {
            relationTypeId: constrainedTypeId,
            fromEntityId,
            toEntityId,
          },
        })
      ).rejects.toThrow();

      // Clean up
      await testHelper.graphqlMutation(
        `mutation DeleteRelationType($id: ID!) {
          deleteRelationType(id: $id) {
            success
          }
        }`,
        { id: constrainedTypeId }
      );
    });
  });

  describe('Query Relations', () => {
    it('should retrieve all relations', async () => {
      const query = `
        query GetRelations {
          relations {
            id
            relationTypeId
            fromEntityId
            toEntityId
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query);
      
      expect(result.relations).toBeDefined();
      expect(Array.isArray(result.relations)).toBe(true);
      expect(result.relations.length).toBeGreaterThan(0);
    });

    it('should retrieve relation by ID', async () => {
      const query = `
        query GetRelation($id: ID!) {
          relation(id: $id) {
            id
            relationTypeId
            fromEntityId
            toEntityId
            properties
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query, {
        id: createdRelationId,
      });

      expect(result.relation).toBeDefined();
      expect(result.relation.id).toBe(createdRelationId);
      expect(result.relation.relationTypeId).toBe(relationTypeId);
    });

    it('should filter relations by entity', async () => {
      const query = `
        query GetRelationsByEntity($entityId: ID!) {
          relations(filter: { fromEntityId: $entityId }) {
            id
            fromEntityId
            toEntityId
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query, {
        entityId: fromEntityId,
      });

      expect(result.relations).toBeDefined();
      expect(Array.isArray(result.relations)).toBe(true);
      
      result.relations.forEach((relation: any) => {
        expect(relation.fromEntityId).toBe(fromEntityId);
      });
    });

    it('should retrieve relations with expanded entities', async () => {
      const query = `
        query GetRelationWithEntities($id: ID!) {
          relation(id: $id) {
            id
            fromEntity {
              id
              data
            }
            toEntity {
              id
              data
            }
            relationType {
              id
              name
            }
          }
        }
      `;

      const result = await testHelper.graphqlQuery(query, {
        id: createdRelationId,
      });

      expect(result.relation).toBeDefined();
      expect(result.relation.fromEntity).toBeDefined();
      expect(result.relation.fromEntity.data.name).toBe('Alice');
      expect(result.relation.toEntity).toBeDefined();
      expect(result.relation.toEntity.data.name).toBe('Bob');
      expect(result.relation.relationType).toBeDefined();
    });
  });

  describe('Update Relation', () => {
    it('should update relation properties', async () => {
      const updatedProperties = {
        since: '2024-06-01',
        strength: 'very strong',
        notes: 'Best friends',
      };

      const mutation = `
        mutation UpdateRelation($id: ID!, $input: UpdateRelationInput!) {
          updateRelation(id: $id, input: $input) {
            id
            properties
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        id: createdRelationId,
        input: {
          properties: updatedProperties,
        },
      });

      expect(result.updateRelation).toBeDefined();
      expect(result.updateRelation.properties).toEqual(updatedProperties);
    });
  });

  describe('Delete Relation', () => {
    it('should delete relation', async () => {
      const mutation = `
        mutation DeleteRelation($id: ID!) {
          deleteRelation(id: $id) {
            success
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        id: createdRelationId,
      });

      expect(result.deleteRelation).toBeDefined();
      expect(result.deleteRelation.success).toBe(true);

      // Verify deletion
      const query = `
        query GetRelation($id: ID!) {
          relation(id: $id) {
            id
          }
        }
      `;

      const queryResult = await testHelper.graphqlQuery(query, {
        id: createdRelationId,
      });

      expect(queryResult.relation).toBeNull();
    });
  });
});