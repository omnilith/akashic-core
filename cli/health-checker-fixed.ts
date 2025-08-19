/**
 * Health Check Engine
 * Executes data integrity checks based on health check entity definitions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as schemaHelper from './schema-helper';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export interface HealthCheckDefinition {
  id: string;
  type: string;
  data: {
    name: string;
    displayName: string;
    category: string;
    severity: 'critical' | 'warning' | 'info';
    description: string;
    checkType: string;
    enabled: boolean;
    autoFixAvailable?: boolean;
    autoFixRisk?: 'safe' | 'moderate' | 'dangerous';
    autoFixDescription?: string;
  };
}

export interface HealthCheckResult {
  checkId: string;
  checkName: string;
  displayName: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  passed: boolean;
  issues: HealthIssue[];
  stats: {
    totalChecked: number;
    issuesFound: number;
  };
  autoFixAvailable: boolean;
  autoFixRisk?: 'safe' | 'moderate' | 'dangerous';
}

export interface HealthIssue {
  entityId?: string;
  relationId?: string;
  typeId?: string;
  description: string;
  details?: any;
}

export class HealthChecker {
  private healthChecks: HealthCheckDefinition[] = [];

  constructor() {
    this.loadHealthChecks();
  }

  private loadHealthChecks() {
    const healthChecksPath = path.join(
      process.cwd(),
      'data',
      'health-checks.json',
    );
    if (fs.existsSync(healthChecksPath)) {
      const data = JSON.parse(fs.readFileSync(healthChecksPath, 'utf-8'));
      this.healthChecks = data.entities.filter(
        (e: any) => e.type === 'HealthCheck',
      );
    }
  }

  async runAllChecks(options?: {
    category?: string;
    severity?: string;
  }): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    // Filter checks based on options
    let checksToRun = this.healthChecks.filter((check) => check.data.enabled);

    if (options?.category) {
      checksToRun = checksToRun.filter(
        (check) => check.data.category === options.category,
      );
    }

    if (options?.severity) {
      checksToRun = checksToRun.filter(
        (check) => check.data.severity === options.severity,
      );
    }

    // Run each check
    for (const checkDef of checksToRun) {
      const result = await this.runCheck(checkDef);
      results.push(result);
    }

    return results;
  }

  async runCheck(checkDef: HealthCheckDefinition): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      checkId: checkDef.id,
      checkName: checkDef.data.name,
      displayName: checkDef.data.displayName,
      category: checkDef.data.category,
      severity: checkDef.data.severity,
      passed: true,
      issues: [],
      stats: {
        totalChecked: 0,
        issuesFound: 0,
      },
      autoFixAvailable: checkDef.data.autoFixAvailable || false,
      autoFixRisk: checkDef.data.autoFixRisk,
    };

    try {
      switch (checkDef.data.name) {
        case 'orphaned-entities':
          await this.checkOrphanedEntities(result);
          break;
        case 'orphaned-relations':
          await this.checkOrphanedRelations(result);
          break;
        case 'schema-validation-failures':
          await this.checkSchemaValidation(result);
          break;
        case 'outdated-schema-versions':
          await this.checkOutdatedSchemaVersions(result);
          break;
        case 'missing-required-fields':
          await this.checkMissingRequiredFields(result);
          break;
        case 'unknown-fields':
          await this.checkUnknownFields(result);
          break;
        case 'relation-type-mismatch':
          await this.checkRelationTypeMismatch(result);
          break;
        case 'cardinality-violations':
          await this.checkCardinalityViolations(result);
          break;
        case 'duplicate-entities':
          await this.checkDuplicateEntities(result);
          break;
        case 'suspicious-dates':
          await this.checkSuspiciousDates(result);
          break;
        case 'empty-required-fields':
          await this.checkEmptyRequiredFields(result);
          break;
        case 'unused-entity-types':
          await this.checkUnusedEntityTypes(result);
          break;
        case 'unused-relation-types':
          await this.checkUnusedRelationTypes(result);
          break;
        case 'large-entities':
          await this.checkLargeEntities(result);
          break;
        case 'cross-namespace-relations':
          await this.checkCrossNamespaceRelations(result);
          break;
        case 'null-entity-type-id':
          await this.checkNullEntityTypeId(result);
          break;
        default:
          result.issues.push({
            description: `Check ${checkDef.data.name} not implemented`,
          });
      }
    } catch (error: any) {
      result.issues.push({
        description: `Error running check: ${error.message}`,
      });
    }

    result.passed = result.issues.length === 0;
    result.stats.issuesFound = result.issues.length;

    return result;
  }

  private async checkOrphanedEntities(result: HealthCheckResult) {
    const entitiesQuery = `
      query GetAllEntities {
        entities {
          id
          entityTypeId
          namespace
          data
        }
        entityTypes {
          id
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(entitiesQuery);
    const typeIds = new Set(data.entityTypes.map((t: any) => t.id));

    result.stats.totalChecked = data.entities.length;

    for (const entity of data.entities) {
      if (!entity.entityTypeId || !typeIds.has(entity.entityTypeId)) {
        result.issues.push({
          entityId: entity.id,
          description: `Entity has missing or invalid EntityType: ${entity.entityTypeId || 'null'}`,
          details: {
            namespace: entity.namespace,
            entityTypeId: entity.entityTypeId,
          },
        });
      }
    }
  }

  private async checkOrphanedRelations(result: HealthCheckResult) {
    const query = `
      query GetAllRelations {
        relations {
          id
          relationTypeId
          fromEntityId
          toEntityId
        }
        entities {
          id
        }
        relationTypes {
          id
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    const entityIds = new Set(data.entities.map((e: any) => e.id));
    const relationTypeIds = new Set(data.relationTypes.map((rt: any) => rt.id));

    result.stats.totalChecked = data.relations.length;

    for (const relation of data.relations) {
      const issues: string[] = [];

      if (!relationTypeIds.has(relation.relationTypeId)) {
        issues.push('invalid RelationType');
      }
      if (!entityIds.has(relation.fromEntityId)) {
        issues.push('missing fromEntity');
      }
      if (!entityIds.has(relation.toEntityId)) {
        issues.push('missing toEntity');
      }

      if (issues.length > 0) {
        result.issues.push({
          relationId: relation.id,
          description: `Relation has ${issues.join(', ')}`,
          details: {
            relationTypeId: relation.relationTypeId,
            fromEntityId: relation.fromEntityId,
            toEntityId: relation.toEntityId,
          },
        });
      }
    }
  }

  private async checkSchemaValidation(result: HealthCheckResult) {
    const query = `
      query GetEntitiesWithTypes {
        entities {
          id
          entityTypeId
          data
        }
        entityTypes {
          id
          schemaJson
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    const typeMap = new Map(data.entityTypes.map((t: any) => [t.id, t]));

    result.stats.totalChecked = data.entities.length;

    for (const entity of data.entities) {
      const entityType: any = typeMap.get(entity.entityTypeId);
      if (!entityType) continue;

      try {
        const validate = ajv.compile(entityType.schemaJson);
        const valid = validate(entity.data);

        if (!valid) {
          result.issues.push({
            entityId: entity.id,
            description: 'Entity fails schema validation',
            details: {
              errors: validate.errors,
            },
          });
        }
      } catch (error: any) {
        result.issues.push({
          entityId: entity.id,
          description: `Validation error: ${error.message}`,
        });
      }
    }
  }

  private async checkOutdatedSchemaVersions(result: HealthCheckResult) {
    const query = `
      query GetVersionInfo {
        entities {
          id
          entityTypeId
          entityTypeVersion
        }
        entityTypes {
          id
          version
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    const typeVersions = new Map(
      data.entityTypes.map((t: any) => [t.id, t.version]),
    );

    result.stats.totalChecked = data.entities.length;

    for (const entity of data.entities) {
      const currentVersion = typeVersions.get(entity.entityTypeId);
      if (currentVersion && entity.entityTypeVersion < currentVersion) {
        result.issues.push({
          entityId: entity.id,
          description: `Using outdated schema version ${entity.entityTypeVersion} (current: ${currentVersion})`,
          details: {
            entityVersion: entity.entityTypeVersion,
            currentVersion,
          },
        });
      }
    }
  }

  private async checkMissingRequiredFields(result: HealthCheckResult) {
    const query = `
      query GetEntitiesWithSchemas {
        entities {
          id
          entityTypeId
          data
        }
        entityTypes {
          id
          schemaJson
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    const typeMap = new Map(data.entityTypes.map((t: any) => [t.id, t]));

    result.stats.totalChecked = data.entities.length;

    for (const entity of data.entities) {
      const entityType: any = typeMap.get(entity.entityTypeId);
      if (!entityType || !entityType.schemaJson.required) continue;

      const missingFields = entityType.schemaJson.required.filter(
        (field: string) => !(field in entity.data),
      );

      if (missingFields.length > 0) {
        result.issues.push({
          entityId: entity.id,
          description: `Missing required fields: ${missingFields.join(', ')}`,
          details: { missingFields },
        });
      }
    }
  }

  private async checkUnknownFields(result: HealthCheckResult) {
    const query = `
      query GetEntitiesWithSchemas {
        entities {
          id
          entityTypeId
          data
        }
        entityTypes {
          id
          schemaJson
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    const typeMap = new Map(data.entityTypes.map((t: any) => [t.id, t]));

    result.stats.totalChecked = data.entities.length;

    for (const entity of data.entities) {
      const entityType: any = typeMap.get(entity.entityTypeId);
      if (!entityType || !entityType.schemaJson.properties) continue;

      const schemaFields = Object.keys(entityType.schemaJson.properties);
      const dataFields = Object.keys(entity.data);
      const unknownFields = dataFields.filter(
        (field) => !schemaFields.includes(field),
      );

      if (
        unknownFields.length > 0 &&
        entityType.schemaJson.additionalProperties === false
      ) {
        result.issues.push({
          entityId: entity.id,
          description: `Unknown fields not in schema: ${unknownFields.join(', ')}`,
          details: { unknownFields },
        });
      }
    }
  }

  private async checkRelationTypeMismatch(result: HealthCheckResult) {
    const query = `
      query GetRelationsWithTypes {
        relations {
          id
          relationTypeId
          fromEntityId
          toEntityId
        }
        entities {
          id
          entityTypeId
        }
        relationTypes {
          id
          fromEntityTypeId
          toEntityTypeId
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    const entityMap = new Map(data.entities.map((e: any) => [e.id, e]));
    const relationTypeMap = new Map(
      data.relationTypes.map((rt: any) => [rt.id, rt]),
    );

    result.stats.totalChecked = data.relations.length;

    for (const relation of data.relations) {
      const relationType: any = relationTypeMap.get(relation.relationTypeId);
      const fromEntity: any = entityMap.get(relation.fromEntityId);
      const toEntity: any = entityMap.get(relation.toEntityId);

      if (!relationType || !fromEntity || !toEntity) continue;

      const issues: string[] = [];

      if (fromEntity.entityTypeId !== relationType.fromEntityTypeId) {
        issues.push(`fromEntity type mismatch`);
      }
      if (toEntity.entityTypeId !== relationType.toEntityTypeId) {
        issues.push(`toEntity type mismatch`);
      }

      if (issues.length > 0) {
        result.issues.push({
          relationId: relation.id,
          description: `Relation has ${issues.join(', ')}`,
          details: {
            expectedFrom: relationType.fromEntityTypeId,
            actualFrom: fromEntity.entityTypeId,
            expectedTo: relationType.toEntityTypeId,
            actualTo: toEntity.entityTypeId,
          },
        });
      }
    }
  }

  private async checkCardinalityViolations(result: HealthCheckResult) {
    const query = `
      query GetRelationsForCardinality {
        relations {
          id
          relationTypeId
          fromEntityId
          toEntityId
        }
        relationTypes {
          id
          cardinality
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    const relationTypeMap = new Map(
      data.relationTypes.map((rt: any) => [rt.id, rt]),
    );

    result.stats.totalChecked = data.relations.length;

    // Group relations by type and entity
    const fromCounts = new Map<string, Map<string, number>>();
    const toCounts = new Map<string, Map<string, number>>();

    for (const relation of data.relations) {
      const key = `${relation.relationTypeId}:${relation.fromEntityId}`;
      if (!fromCounts.has(relation.relationTypeId)) {
        fromCounts.set(relation.relationTypeId, new Map());
      }
      const fromMap = fromCounts.get(relation.relationTypeId)!;
      fromMap.set(
        relation.fromEntityId,
        (fromMap.get(relation.fromEntityId) || 0) + 1,
      );

      const toKey = `${relation.relationTypeId}:${relation.toEntityId}`;
      if (!toCounts.has(relation.relationTypeId)) {
        toCounts.set(relation.relationTypeId, new Map());
      }
      const toMap = toCounts.get(relation.relationTypeId)!;
      toMap.set(relation.toEntityId, (toMap.get(relation.toEntityId) || 0) + 1);
    }

    // Check cardinality violations
    for (const [typeId, counts] of Array.from(fromCounts)) {
      const relationType: any = relationTypeMap.get(typeId);
      if (!relationType) continue;

      const cardinality = relationType.cardinality;

      // Check "from" side
      if (cardinality === '1..1' || cardinality === '1..n') {
        for (const [entityId, count] of Array.from(counts)) {
          if (count > 1 && cardinality === '1..1') {
            result.issues.push({
              entityId,
              description: `Entity has ${count} outgoing relations of type that allows only 1`,
              details: { relationTypeId: typeId, count, cardinality },
            });
          }
        }
      }

      // Check "to" side
      const toMap = toCounts.get(typeId);
      if (toMap && (cardinality === '1..1' || cardinality === 'n..1')) {
        for (const [entityId, count] of Array.from(toMap)) {
          if (count > 1) {
            result.issues.push({
              entityId,
              description: `Entity has ${count} incoming relations of type that allows only 1`,
              details: { relationTypeId: typeId, count, cardinality },
            });
          }
        }
      }
    }
  }

  private async checkDuplicateEntities(result: HealthCheckResult) {
    const query = `
      query GetAllEntities {
        entities {
          id
          entityTypeId
          data
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    result.stats.totalChecked = data.entities.length;

    // Group by type and create data signatures
    const byType = new Map<string, any[]>();
    for (const entity of data.entities) {
      if (!byType.has(entity.entityTypeId)) {
        byType.set(entity.entityTypeId, []);
      }
      byType.get(entity.entityTypeId)!.push(entity);
    }

    // Check for duplicates within each type
    for (const [typeId, entities] of Array.from(byType)) {
      const signatures = new Map<string, string[]>();

      for (const entity of entities) {
        const signature = JSON.stringify(
          entity.data,
          Object.keys(entity.data).sort(),
        );
        if (!signatures.has(signature)) {
          signatures.set(signature, []);
        }
        signatures.get(signature)!.push(entity.id);
      }

      for (const [signature, ids] of Array.from(signatures)) {
        if (ids.length > 1) {
          result.issues.push({
            entityId: ids[0],
            description: `${ids.length} entities have identical data`,
            details: {
              duplicateIds: ids,
              entityTypeId: typeId,
            },
          });
        }
      }
    }
  }

  private async checkSuspiciousDates(result: HealthCheckResult) {
    const query = `
      query GetAllEntities {
        entities {
          id
          data
          createdAt
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    result.stats.totalChecked = data.entities.length;

    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const hundredYearsAgo = new Date(
      now.getTime() - 100 * 365 * 24 * 60 * 60 * 1000,
    );

    for (const entity of data.entities) {
      const suspiciousDates: string[] = [];

      // Check all fields for date-like values
      const checkValue = (value: any, path: string) => {
        if (typeof value === 'string') {
          // Check if it looks like a date
          if (
            value.match(/^\d{4}-\d{2}-\d{2}/) ||
            value.match(/\d{4}\/\d{2}\/\d{2}/)
          ) {
            try {
              const date = new Date(value);
              if (!isNaN(date.getTime())) {
                if (date > oneYearFromNow) {
                  suspiciousDates.push(`${path}: future date (${value})`);
                } else if (date < hundredYearsAgo) {
                  suspiciousDates.push(`${path}: very old date (${value})`);
                }
              }
            } catch {}
          }
        } else if (typeof value === 'object' && value !== null) {
          for (const [key, val] of Object.entries(value)) {
            checkValue(val, path ? `${path}.${key}` : key);
          }
        }
      };

      checkValue(entity.data, '');

      if (suspiciousDates.length > 0) {
        result.issues.push({
          entityId: entity.id,
          description: `Entity contains suspicious dates`,
          details: { suspiciousDates },
        });
      }
    }
  }

  private async checkEmptyRequiredFields(result: HealthCheckResult) {
    const query = `
      query GetEntitiesWithSchemas {
        entities {
          id
          entityTypeId
          data
        }
        entityTypes {
          id
          schemaJson
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    const typeMap = new Map(data.entityTypes.map((t: any) => [t.id, t]));

    result.stats.totalChecked = data.entities.length;

    for (const entity of data.entities) {
      const entityType: any = typeMap.get(entity.entityTypeId);
      if (!entityType || !entityType.schemaJson.required) continue;

      const emptyFields: string[] = [];

      for (const field of entityType.schemaJson.required) {
        const value = entity.data[field];
        if (
          value === '' ||
          (typeof value === 'string' && value.trim() === '')
        ) {
          emptyFields.push(field);
        }
      }

      if (emptyFields.length > 0) {
        result.issues.push({
          entityId: entity.id,
          description: `Required fields are empty: ${emptyFields.join(', ')}`,
          details: { emptyFields },
        });
      }
    }
  }

  private async checkUnusedEntityTypes(result: HealthCheckResult) {
    const query = `
      query GetTypesAndEntities {
        entityTypes {
          id
          name
          namespace
        }
        entities {
          entityTypeId
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    result.stats.totalChecked = data.entityTypes.length;

    const usedTypes = new Set(data.entities.map((e: any) => e.entityTypeId));

    for (const type of data.entityTypes) {
      if (!usedTypes.has(type.id)) {
        result.issues.push({
          typeId: type.id,
          description: `EntityType "${type.name}" has no entities`,
          details: {
            typeName: type.name,
            namespace: type.namespace,
          },
        });
      }
    }
  }

  private async checkUnusedRelationTypes(result: HealthCheckResult) {
    const query = `
      query GetRelationTypesAndRelations {
        relationTypes {
          id
          name
          namespace
        }
        relations {
          relationTypeId
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    result.stats.totalChecked = data.relationTypes.length;

    const usedTypes = new Set(data.relations.map((r: any) => r.relationTypeId));

    for (const type of data.relationTypes) {
      if (!usedTypes.has(type.id)) {
        result.issues.push({
          typeId: type.id,
          description: `RelationType "${type.name}" has no relations`,
          details: {
            typeName: type.name,
            namespace: type.namespace,
          },
        });
      }
    }
  }

  private async checkLargeEntities(result: HealthCheckResult) {
    const query = `
      query GetAllEntities {
        entities {
          id
          entityTypeId
          data
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    result.stats.totalChecked = data.entities.length;

    const SIZE_THRESHOLD = 50000; // 50KB

    for (const entity of data.entities) {
      const dataSize = JSON.stringify(entity.data).length;

      if (dataSize > SIZE_THRESHOLD) {
        result.issues.push({
          entityId: entity.id,
          description: `Entity data is unusually large (${Math.round(dataSize / 1024)}KB)`,
          details: {
            sizeBytes: dataSize,
            sizeKB: Math.round(dataSize / 1024),
          },
        });
      }
    }
  }

  private async checkCrossNamespaceRelations(result: HealthCheckResult) {
    const query = `
      query GetRelationsWithNamespaces {
        relations {
          id
          namespace
          fromEntityId
          toEntityId
        }
        entities {
          id
          namespace
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    const entityMap = new Map(data.entities.map((e: any) => [e.id, e]));

    result.stats.totalChecked = data.relations.length;

    for (const relation of data.relations) {
      const fromEntity: any = entityMap.get(relation.fromEntityId);
      const toEntity: any = entityMap.get(relation.toEntityId);

      if (!fromEntity || !toEntity) continue;

      const namespaces = new Set([
        relation.namespace,
        fromEntity.namespace,
        toEntity.namespace,
      ]);

      if (namespaces.size > 1) {
        result.issues.push({
          relationId: relation.id,
          description: `Relation crosses namespace boundaries`,
          details: {
            relationNamespace: relation.namespace,
            fromNamespace: fromEntity.namespace,
            toNamespace: toEntity.namespace,
          },
        });
      }
    }
  }

  private async checkNullEntityTypeId(result: HealthCheckResult) {
    const query = `
      query GetAllEntities {
        entities {
          id
          entityTypeId
          namespace
        }
      }
    `;

    const data = await schemaHelper.graphqlRequest(query);
    result.stats.totalChecked = data.entities.length;

    for (const entity of data.entities) {
      if (!entity.entityTypeId) {
        result.issues.push({
          entityId: entity.id,
          description: `Entity has null or undefined entityTypeId`,
          details: {
            namespace: entity.namespace,
          },
        });
      }
    }
  }

  // Auto-fix methods
  async applyFixes(
    results: HealthCheckResult[],
    safeOnly: boolean = true,
  ): Promise<Map<string, any>> {
    const fixes = new Map<string, any>();

    for (const result of results) {
      if (!result.autoFixAvailable || result.issues.length === 0) continue;

      if (safeOnly && result.autoFixRisk !== 'safe') continue;

      switch (result.checkName) {
        case 'orphaned-relations':
          const orphanedRelationFixes = await this.fixOrphanedRelations(result);
          fixes.set(result.checkName, orphanedRelationFixes);
          break;
        case 'orphaned-entities':
          if (!safeOnly || result.autoFixRisk === 'safe') {
            const orphanedEntityFixes = await this.fixOrphanedEntities(result);
            fixes.set(result.checkName, orphanedEntityFixes);
          }
          break;
        // Add more fix implementations as needed
      }
    }

    return fixes;
  }

  private async fixOrphanedRelations(result: HealthCheckResult): Promise<any> {
    const deletedRelations: string[] = [];

    for (const issue of result.issues) {
      if (issue.relationId) {
        try {
          const mutation = `
            mutation DeleteRelation($id: ID!) {
              deleteRelation(id: $id) {
                id
              }
            }
          `;

          await schemaHelper.graphqlRequest(mutation, { id: issue.relationId });
          deletedRelations.push(issue.relationId);
        } catch (error) {
          console.error(
            `Failed to delete relation ${issue.relationId}: ${error}`,
          );
        }
      }
    }

    return {
      deletedRelations,
      count: deletedRelations.length,
    };
  }

  private async fixOrphanedEntities(result: HealthCheckResult): Promise<any> {
    // This is a dangerous operation, so we just return what would be deleted
    // Actual deletion would need to be implemented in the backend
    const toDelete: string[] = [];

    for (const issue of result.issues) {
      if (issue.entityId) {
        toDelete.push(issue.entityId);
      }
    }

    return {
      wouldDelete: toDelete,
      count: toDelete.length,
      message: 'Entity deletion not implemented - requires backend support',
    };
  }
}

export default HealthChecker;
