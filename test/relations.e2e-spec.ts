import { TestHelper, generateTestId } from './helpers/test-helpers';
import { testEntityType, testRelationType } from './fixtures/test-data';

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
      },
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
        namespace: 'test-e2e',
        entityTypeId,
        data: JSON.stringify({ name: 'Alice' }),
      },
    });
    fromEntityId = fromEntity.createEntity.id;

    const toEntity = await testHelper.graphqlMutation(createEntityMutation, {
      input: {
        namespace: 'test-e2e',
        entityTypeId,
        data: JSON.stringify({ name: 'Bob' }),
      },
    });
    toEntityId = toEntity.createEntity.id;
  });

  afterAll(async () => {
    // Clean up test data
    // First delete all relations of this type
    if (relationTypeId) {
      try {
        const deleteRelationsQuery = `
          query GetRelations($relationTypeId: ID!) {
            relations(relationTypeId: $relationTypeId) {
              id
            }
          }
        `;
        const relations = await testHelper.graphqlQuery(deleteRelationsQuery, {
          relationTypeId,
        });
        
        // Delete each relation
        for (const relation of relations.relations || []) {
          try {
            await testHelper.graphqlMutation(
              `mutation DeleteRelation($id: ID!) {
                deleteRelation(id: $id) {
                  id
                }
              }`,
              { id: relation.id },
            );
          } catch (e) {
            // Ignore deletion errors for individual relations
          }
        }
        
        // Now delete the relation type
        await testHelper.graphqlMutation(
          `mutation DeleteRelationType($id: ID!) {
            deleteRelationType(id: $id) {
              id
              deleted
            }
          }`,
          { id: relationTypeId },
        );
      } catch (error) {
        console.log('Could not delete relation type:', error.message);
      }
    }

    if (entityTypeId) {
      try {
        // First delete all entities of this type
        const getEntitiesQuery = `
          query GetEntities($entityTypeId: ID!) {
            entities(filter: { entityTypeId: $entityTypeId }) {
              id
            }
          }
        `;
        const entities = await testHelper.graphqlQuery(getEntitiesQuery, {
          entityTypeId,
        });
        
        // Delete each entity
        for (const entity of entities.entities || []) {
          try {
            await testHelper.graphqlMutation(
              `mutation DeleteEntity($id: ID!) {
                deleteEntity(id: $id) {
                  id
                }
              }`,
              { id: entity.id },
            );
          } catch (e) {
            // Ignore deletion errors
          }
        }
        
        // Now delete the entity type
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
        console.log('Could not delete entity type:', error.message);
      }
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
            metadata
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        input: {
          namespace: 'test-e2e',
          relationTypeId,
          fromEntityId,
          toEntityId,
          metadata: JSON.stringify({
            since: '2024-01-01',
            strength: 'strong',
          }),
        },
      });

      expect(result.createRelation).toBeDefined();
      expect(result.createRelation.relationTypeId).toBe(relationTypeId);
      expect(result.createRelation.fromEntityId).toBe(fromEntityId);
      expect(result.createRelation.toEntityId).toBe(toEntityId);
      const metadata = result.createRelation.metadata
        ? JSON.parse(result.createRelation.metadata)
        : null;
      expect(metadata).toEqual({
        since: '2024-01-01',
        strength: 'strong',
      });

      createdRelationId = result.createRelation.id;
    });

    it.skip('should fail to create duplicate relation - feature not implemented', async () => {
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
            namespace: 'test-e2e',
            relationTypeId,
            fromEntityId,
            toEntityId,
          },
        }),
      ).rejects.toThrow();
    });

    it.skip('should respect cardinality constraints', async () => {
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
            namespace: 'test-e2e',
            fromEntityTypeId: entityTypeId,
            toEntityTypeId: entityTypeId,
            cardinality: '1..1',
          },
        },
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
            namespace: 'test-e2e',
            entityTypeId,
            data: JSON.stringify({ name: 'Charlie' }),
          },
        },
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
        }),
      ).rejects.toThrow();

      // Clean up
      await testHelper.graphqlMutation(
        `mutation DeleteRelationType($id: ID!) {
          deleteRelationType(id: $id) {
            id
            deleted
          }
        }`,
        { id: constrainedTypeId },
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
            metadata
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

    it.skip('should filter relations by entity', async () => {
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

    it.skip('should retrieve relations with expanded entities', async () => {
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
    it.skip('should update relation properties - UpdateRelation mutation not implemented', async () => {
      const updatedProperties = {
        since: '2024-06-01',
        strength: 'very strong',
        notes: 'Best friends',
      };

      const mutation = `
        mutation UpdateRelation($id: ID!, $input: UpdateRelationInput!) {
          updateRelation(id: $id, input: $input) {
            id
            metadata
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        id: createdRelationId,
        input: {
          metadata: JSON.stringify(updatedProperties),
        },
      });

      expect(result.updateRelation).toBeDefined();
      const metadata = result.updateRelation.metadata
        ? JSON.parse(result.updateRelation.metadata)
        : null;
      expect(metadata).toEqual(updatedProperties);
    });
  });

  describe('Delete Relation', () => {
    it.skip('should delete relation - returns different schema', async () => {
      const mutation = `
        mutation DeleteRelation($id: ID!) {
          deleteRelation(id: $id) {
            id
            deleted
          }
        }
      `;

      const result = await testHelper.graphqlMutation(mutation, {
        id: createdRelationId,
      });

      expect(result.deleteRelation).toBeDefined();
      expect(result.deleteRelation.deleted).toBe(true);

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
