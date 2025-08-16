// src/lib/validation.service.ts
import { Injectable } from '@nestjs/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

@Injectable()
export class ValidationService {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true, // Get all validation errors, not just first
      removeAdditional: false, // Keep extra properties
      strict: false, // Allow unknown keywords
    });

    addFormats(this.ajv); // Add date, email, uri, etc. formats
  }

  validateEntityData(
    schema: any,
    data: any,
  ): { valid: boolean; errors?: string[] } {
    try {
      const validate = this.ajv.compile(schema);
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
        errors: [
          `Schema compilation error: ${
            typeof error === 'object' && error !== null && 'message' in error
              ? (error as { message: string }).message
              : String(error)
          }`,
        ],
      };
    }
  }

  validateSchema(schema: any): { valid: boolean; errors?: string[] } {
    try {
      this.ajv.compile(schema); // Try to compile the schema
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Invalid JSON Schema: ${
            typeof error === 'object' && error !== null && 'message' in error
              ? (error as { message: string }).message
              : String(error)
          }`,
        ],
      };
    }
  }
}
