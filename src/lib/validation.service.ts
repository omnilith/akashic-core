// src/lib/validation.service.ts
import { Injectable } from '@nestjs/common';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import crypto from 'crypto';

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

@Injectable()
export class ValidationService {
  private ajv: Ajv;
  private validatorCache = new Map<string, ValidateFunction>();
  private maxCacheSize = 1000;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true, // Get all validation errors, not just first
      removeAdditional: false, // Keep extra properties
      strict: false, // Allow unknown keywords
      addUsedSchema: true, // Enable meta-schema validation
    });

    addFormats(this.ajv); // Add date, email, uri, etc. formats
  }

  private getCacheKey(schema: Record<string, unknown>): string {
    const schemaString = JSON.stringify(schema);
    return crypto.createHash('sha256').update(schemaString).digest('hex');
  }

  private getOrCompileValidator(
    schema: Record<string, unknown>,
  ): ValidateFunction {
    const cacheKey = this.getCacheKey(schema);

    let validator = this.validatorCache.get(cacheKey);
    if (validator) {
      return validator;
    }

    validator = this.ajv.compile(schema);

    // Implement LRU-like cache eviction
    if (this.validatorCache.size >= this.maxCacheSize) {
      const firstKey = this.validatorCache.keys().next().value as
        | string
        | undefined;
      if (firstKey) {
        this.validatorCache.delete(firstKey);
      }
    }

    this.validatorCache.set(cacheKey, validator);
    return validator;
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  validateEntityData(
    schema: Record<string, unknown>,
    data: unknown,
  ): ValidationResult {
    try {
      const validate = this.getOrCompileValidator(schema);
      const valid = validate(data);

      if (!valid) {
        const errors =
          validate.errors?.map((err) => {
            const path = err.instancePath || 'root';
            return `${path}: ${err.message}`;
          }) || [];
        return { valid: false, errors };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [`Schema compilation error: ${this.formatError(error)}`],
      };
    }
  }

  validateSchema(schema: unknown): ValidationResult {
    try {
      // First check if it's a valid object
      if (typeof schema !== 'object' || schema === null) {
        return {
          valid: false,
          errors: ['Schema must be a non-null object'],
        };
      }

      // Use AJV's validateSchema for proper meta-schema validation
      const isValid = this.ajv.validateSchema(schema);
      if (!isValid) {
        const errors = this.ajv.errors?.map((err) => {
          const path = err.instancePath || 'schema';
          return `${path}: ${err.message}`;
        }) || ['Invalid JSON Schema'];
        return { valid: false, errors };
      }

      // Try to compile to catch additional issues
      this.ajv.compile(schema as Record<string, unknown>);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [`Invalid JSON Schema: ${this.formatError(error)}`],
      };
    }
  }

  clearCache(): void {
    this.validatorCache.clear();
  }

  getCacheSize(): number {
    return this.validatorCache.size;
  }
}
