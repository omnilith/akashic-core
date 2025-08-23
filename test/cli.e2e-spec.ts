import { exec } from 'child_process';
import { promisify } from 'util';
import { TestHelper, generateTestId } from './helpers/test-helpers';
import { testEntityType } from './fixtures/test-data';

const execAsync = promisify(exec);

describe('CLI Commands (E2E)', () => {
  let testHelper: TestHelper;
  let entityTypeId: string;
  let entityId: string;

  beforeAll(async () => {
    testHelper = new TestHelper();
    await testHelper.setupTestApp();

    // Create test entity type
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
        name: `CLITestType-${generateTestId()}`,
        schema: JSON.stringify(testEntityType.schemaJson),
      },
    });
    entityTypeId = typeResult.createEntityType.id;
  });

  afterAll(async () => {
    // Clean up
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

  describe('List Commands', () => {
    it('should list entity types', async () => {
      const { stdout } = await execAsync('npm run akashic -- list-types --json');
      const types = JSON.parse(stdout);
      
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
      expect(types.some((t: any) => t.id === entityTypeId)).toBe(true);
    });

    it('should list entities with filters', async () => {
      // Create test entity first
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      const entityResult = await testHelper.graphqlMutation(createMutation, {
        input: {
          entityTypeId,
          data: { name: 'CLI Test Entity' },
        },
      });
      entityId = entityResult.createEntity.id;

      // List entities with type filter
      const { stdout } = await execAsync(
        `npm run akashic -- list --type ${entityTypeId} --json`
      );
      const entities = JSON.parse(stdout);
      
      expect(Array.isArray(entities)).toBe(true);
      expect(entities.some((e: any) => e.id === entityId)).toBe(true);
    });
  });

  describe('Show Type Command', () => {
    it('should show detailed type information', async () => {
      const { stdout } = await execAsync(
        `npm run akashic -- show-type ${entityTypeId} --json`
      );
      const typeInfo = JSON.parse(stdout);
      
      expect(typeInfo).toBeDefined();
      expect(typeInfo.id).toBe(entityTypeId);
      expect(typeInfo.schemaJson).toBeDefined();
      expect(typeInfo.statistics).toBeDefined();
    });
  });

  describe('Search Command', () => {
    beforeAll(async () => {
      // Create multiple entities for searching
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      for (let i = 0; i < 3; i++) {
        await testHelper.graphqlMutation(createMutation, {
          input: {
            entityTypeId,
            data: {
              name: `Search Test ${i}`,
              age: 20 + i,
              active: i % 2 === 0,
            },
          },
        });
      }
    });

    it('should search entities by field value', async () => {
      const { stdout } = await execAsync(
        `npm run akashic -- search --type ${entityTypeId} name="Search Test 0" --json`
      );
      const results = JSON.parse(stdout);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].data.name).toBe('Search Test 0');
    });

    it('should search with complex filters', async () => {
      const filter = JSON.stringify({
        data: {
          age: { $gte: 21 },
          active: true,
        },
      });

      const { stdout } = await execAsync(
        `npm run akashic -- search --type ${entityTypeId} --filter '${filter}' --json`
      );
      const results = JSON.parse(stdout);
      
      expect(Array.isArray(results)).toBe(true);
      results.forEach((entity: any) => {
        expect(entity.data.age).toBeGreaterThanOrEqual(21);
        expect(entity.data.active).toBe(true);
      });
    });
  });

  describe('Health Check Command', () => {
    it('should run health checks', async () => {
      const { stdout } = await execAsync(
        'npm run akashic -- health --json'
      );
      const healthResults = JSON.parse(stdout);
      
      expect(healthResults).toBeDefined();
      expect(healthResults.summary).toBeDefined();
      expect(healthResults.results).toBeDefined();
      expect(Array.isArray(healthResults.results)).toBe(true);
    });

    it('should filter health checks by severity', async () => {
      const { stdout } = await execAsync(
        'npm run akashic -- health --severity warning --json'
      );
      const healthResults = JSON.parse(stdout);
      
      expect(healthResults).toBeDefined();
      healthResults.results.forEach((result: any) => {
        expect(['warning', 'critical']).toContain(result.severity);
      });
    });

    it('should export health check results', async () => {
      const exportPath = `/tmp/health-report-${generateTestId()}.json`;
      
      await execAsync(
        `npm run akashic -- health --export ${exportPath}`
      );
      
      // Verify file was created
      const { stdout } = await execAsync(`cat ${exportPath}`);
      const report = JSON.parse(stdout);
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.timestamp).toBeDefined();
      
      // Clean up
      await execAsync(`rm ${exportPath}`);
    });
  });

  describe('Import/Export Commands', () => {
    it('should export entities', async () => {
      const exportPath = `/tmp/export-${generateTestId()}.json`;
      
      await execAsync(
        `npm run akashic -- export --namespace test-e2e --output ${exportPath}`
      );
      
      // Verify export file
      const { stdout } = await execAsync(`cat ${exportPath}`);
      const exportData = JSON.parse(stdout);
      
      expect(exportData).toBeDefined();
      expect(exportData.entityTypes).toBeDefined();
      expect(exportData.entities).toBeDefined();
      expect(exportData.relationTypes).toBeDefined();
      expect(exportData.relations).toBeDefined();
      
      // Clean up
      await execAsync(`rm ${exportPath}`);
    });

    it('should import entities from file', async () => {
      const importData = {
        entityTypes: [
          {
            name: `ImportTestType-${generateTestId()}`,
            description: 'Type for import testing',
            namespaceId: 'test-e2e',
            schemaJson: {
              type: 'object',
              properties: {
                value: { type: 'string' },
              },
              required: ['value'],
            },
          },
        ],
        entities: [],
        relationTypes: [],
        relations: [],
      };

      const importPath = `/tmp/import-${generateTestId()}.json`;
      
      // Create import file
      await execAsync(
        `echo '${JSON.stringify(importData)}' > ${importPath}`
      );
      
      // Import data
      const { stdout } = await execAsync(
        `npm run akashic -- import ${importPath} --json`
      );
      const importResult = JSON.parse(stdout);
      
      expect(importResult).toBeDefined();
      expect(importResult.imported).toBeDefined();
      expect(importResult.imported.entityTypes).toBe(1);
      
      // Clean up
      await execAsync(`rm ${importPath}`);
    });
  });

  describe('Interactive Commands', () => {
    it('should handle create command with provided data', async () => {
      // Create entity with direct data (non-interactive)
      const entityData = {
        name: 'Direct CLI Entity',
        age: 25,
        email: 'cli@example.com',
      };

      const { stdout } = await execAsync(
        `npm run akashic -- create entity --type ${entityTypeId} --data '${JSON.stringify(entityData)}' --json`
      );
      const created = JSON.parse(stdout);
      
      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.data).toEqual(entityData);
    });

    it('should handle update command', async () => {
      // Create entity first
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      const entityResult = await testHelper.graphqlMutation(createMutation, {
        input: {
          entityTypeId,
          data: { name: 'Update Test' },
        },
      });
      const updateId = entityResult.createEntity.id;

      // Update via CLI
      const updateData = {
        name: 'Updated via CLI',
        age: 30,
      };

      const { stdout } = await execAsync(
        `npm run akashic -- update ${updateId} --data '${JSON.stringify(updateData)}' --json`
      );
      const updated = JSON.parse(stdout);
      
      expect(updated).toBeDefined();
      expect(updated.id).toBe(updateId);
      expect(updated.data.name).toBe('Updated via CLI');
      expect(updated.data.age).toBe(30);
    });

    it('should handle delete command', async () => {
      // Create entity first
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      const entityResult = await testHelper.graphqlMutation(createMutation, {
        input: {
          entityTypeId,
          data: { name: 'Delete Test' },
        },
      });
      const deleteId = entityResult.createEntity.id;

      // Delete via CLI
      const { stdout } = await execAsync(
        `npm run akashic -- delete ${deleteId} --confirm --json`
      );
      const deleteResult = JSON.parse(stdout);
      
      expect(deleteResult).toBeDefined();
      expect(deleteResult.success).toBe(true);

      // Verify deletion
      const query = `
        query GetEntity($id: ID!) {
          entity(id: $id) {
            id
          }
        }
      `;

      const queryResult = await testHelper.graphqlQuery(query, {
        id: deleteId,
      });

      expect(queryResult.entity).toBeNull();
    });
  });
});