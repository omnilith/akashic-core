/**
 * Interactive Prompt Handler
 * Creates dynamic forms based on JSON Schema
 */

import inquirer from 'inquirer';
import { FieldInfo } from './schema-helper';

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Build prompts from schema fields
export async function promptForEntity(fields: FieldInfo[]): Promise<any> {
  const prompts: any[] = [];

  for (const field of fields) {
    const prompt = buildPrompt(field);
    if (prompt) {
      prompts.push(prompt);
    }
  }

  if (prompts.length === 0) {
    return {};
  }

  console.log(
    `\n${colors.cyan}Please fill in the following fields:${colors.reset}\n`,
  );

  const answers = await inquirer.prompt(prompts);

  // Post-process answers
  const result: any = {};
  for (const field of fields) {
    if (answers[field.name] !== undefined && answers[field.name] !== '') {
      result[field.name] = processAnswer(field, answers[field.name]);
    }
  }

  return result;
}

// Build prompts for updating entity - shows current values
export async function promptForEntityUpdate(
  fields: FieldInfo[],
  currentData: any,
): Promise<any> {
  const prompts: any[] = [];

  for (const field of fields) {
    const prompt = buildPrompt(field, currentData[field.name]);
    if (prompt) {
      prompts.push(prompt);
    }
  }

  if (prompts.length === 0) {
    return {};
  }

  console.log(
    `\n${colors.cyan}Update entity fields (current values shown):${colors.reset}\n`,
  );

  const answers = await inquirer.prompt(prompts);

  // Post-process answers - only include changed values
  const result: any = {};
  for (const field of fields) {
    if (answers[field.name] !== undefined && answers[field.name] !== '') {
      const processed = processAnswer(field, answers[field.name]);
      // Only include if different from current value
      if (JSON.stringify(processed) !== JSON.stringify(currentData[field.name])) {
        result[field.name] = processed;
      }
    }
  }

  return result;
}

// Build a single prompt based on field type
function buildPrompt(field: FieldInfo, currentValue?: any): any {
  const base = {
    name: field.name,
    message: formatFieldMessage(field),
    default: currentValue !== undefined ? currentValue : field.default,
  };

  // Handle enums
  if (field.enum) {
    return {
      ...base,
      type: 'list',
      choices: field.enum,
    };
  }

  // Handle different types
  switch (field.type) {
    case 'boolean':
      return {
        ...base,
        type: 'confirm',
      };

    case 'number':
    case 'integer':
      return {
        ...base,
        type: 'number',
        validate: (input: any) => {
          if (!field.required && (input === '' || input === undefined)) {
            return true;
          }
          if (isNaN(input)) {
            return 'Please enter a valid number';
          }
          if (field.minimum !== undefined && input < field.minimum) {
            return `Value must be at least ${field.minimum}`;
          }
          if (field.maximum !== undefined && input > field.maximum) {
            return `Value must be at most ${field.maximum}`;
          }
          return true;
        },
      };

    case 'array':
      return {
        ...base,
        type: 'input',
        message: `${base.message} ${colors.dim}(comma-separated)${colors.reset}`,
        filter: (input: string) => {
          if (!input || input.trim() === '') return [];
          return input
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s);
        },
        validate: (input: any) => {
          if (!field.required && (!input || input === '')) {
            return true;
          }
          if (field.required && (!input || input === '')) {
            return 'This field is required';
          }
          return true;
        },
      };

    case 'string':
    default: {
      const inputPrompt: any = {
        ...base,
        type: 'input',
      };

      // Add validation
      inputPrompt.validate = (input: string) => {
        if (!field.required && (!input || input === '')) {
          return true;
        }
        if (field.required && (!input || input === '')) {
          return 'This field is required';
        }
        if (field.minLength && input.length < field.minLength) {
          return `Must be at least ${field.minLength} characters`;
        }
        if (field.maxLength && input.length > field.maxLength) {
          return `Must be at most ${field.maxLength} characters`;
        }
        if (field.format === 'email' && !isValidEmail(input)) {
          return 'Please enter a valid email address';
        }
        if (field.format === 'date-time' && !isValidDateTime(input)) {
          return 'Please enter a valid date-time (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)';
        }
        return true;
      };

      return inputPrompt;
    }
  }
}

// Format field message for display
function formatFieldMessage(field: FieldInfo): string {
  let message = field.name;

  // Add type hint
  const typeHint = getTypeHint(field);
  if (typeHint) {
    message += ` ${colors.dim}(${typeHint})${colors.reset}`;
  }

  // Add required indicator
  if (field.required) {
    message += ` ${colors.red}*${colors.reset}`;
  } else {
    message += ` ${colors.dim}(optional)${colors.reset}`;
  }

  return message;
}

// Get type hint for field
function getTypeHint(field: FieldInfo): string {
  const hints: string[] = [];

  if (field.type === 'string') {
    if (field.format === 'email') {
      hints.push('email');
    } else if (field.format === 'date-time') {
      hints.push('date-time');
    } else if (field.minLength || field.maxLength) {
      if (field.minLength && field.maxLength) {
        hints.push(`${field.minLength}-${field.maxLength} chars`);
      } else if (field.minLength) {
        hints.push(`min ${field.minLength} chars`);
      } else if (field.maxLength) {
        hints.push(`max ${field.maxLength} chars`);
      }
    } else {
      hints.push('text');
    }
  } else if (field.type === 'number' || field.type === 'integer') {
    if (field.minimum !== undefined && field.maximum !== undefined) {
      hints.push(`${field.minimum}-${field.maximum}`);
    } else if (field.minimum !== undefined) {
      hints.push(`min ${field.minimum}`);
    } else if (field.maximum !== undefined) {
      hints.push(`max ${field.maximum}`);
    } else {
      hints.push('number');
    }
  } else if (field.type === 'boolean') {
    hints.push('yes/no');
  } else if (field.type === 'array') {
    hints.push('list');
  }

  return hints.join(', ');
}

// Process answer based on field type
function processAnswer(field: FieldInfo, answer: any): any {
  if (answer === '' || answer === undefined) {
    return undefined;
  }

  switch (field.type) {
    case 'number':
      return parseFloat(answer);
    case 'integer':
      return parseInt(answer, 10);
    case 'boolean':
      return answer === true || answer === 'true' || answer === 'yes';
    case 'array':
      return Array.isArray(answer) ? answer : [answer];
    case 'string':
      if (field.format === 'date-time' && answer) {
        // Ensure proper ISO format
        const date = new Date(answer);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      return answer;
    default:
      return answer;
  }
}

// Validation helpers
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidDateTime(dateTime: string): boolean {
  const date = new Date(dateTime);
  return !isNaN(date.getTime());
}

// Build a simple property for JSON Schema
export async function buildProperty(): Promise<any> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Property name:',
      validate: (input) => input.length > 0 || 'Property name is required',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Property description (optional):',
      default: '',
    },
    {
      type: 'list',
      name: 'type',
      message: 'Property type:',
      choices: ['string', 'number', 'boolean', 'array'],
    },
    {
      type: 'confirm',
      name: 'required',
      message: 'Is this property required?',
      default: false,
    },
  ]);

  const property: any = { type: answers.type };

  // Add description if provided
  if (answers.description) {
    property.description = answers.description;
  }

  // Add type-specific constraints
  if (answers.type === 'string') {
    const stringConstraints = await inquirer.prompt([
      {
        type: 'number',
        name: 'minLength',
        message: 'Minimum length (press enter to skip):',
        filter: (val) => (val === '' ? undefined : Number(val)),
      },
      {
        type: 'number',
        name: 'maxLength',
        message: 'Maximum length (press enter to skip):',
        filter: (val) => (val === '' ? undefined : Number(val)),
      },
      {
        type: 'input',
        name: 'enumValues',
        message: 'Enum values (comma-separated, press enter to skip):',
        filter: (val) =>
          val ? val.split(',').map((v: string) => v.trim()) : undefined,
      },
    ]);

    if (stringConstraints.minLength !== undefined)
      property.minLength = stringConstraints.minLength;
    if (stringConstraints.maxLength !== undefined)
      property.maxLength = stringConstraints.maxLength;
    if (stringConstraints.enumValues)
      property.enum = stringConstraints.enumValues;
  }

  if (answers.type === 'number') {
    const numberConstraints = await inquirer.prompt([
      {
        type: 'number',
        name: 'minimum',
        message: 'Minimum value (press enter to skip):',
        filter: (val) => (val === '' ? undefined : Number(val)),
      },
      {
        type: 'number',
        name: 'maximum',
        message: 'Maximum value (press enter to skip):',
        filter: (val) => (val === '' ? undefined : Number(val)),
      },
    ]);

    if (numberConstraints.minimum !== undefined)
      property.minimum = numberConstraints.minimum;
    if (numberConstraints.maximum !== undefined)
      property.maximum = numberConstraints.maximum;
  }

  if (answers.type === 'array') {
    const arrayConstraints = await inquirer.prompt([
      {
        type: 'list',
        name: 'itemType',
        message: 'Array item type:',
        choices: ['string', 'number', 'boolean'],
      },
    ]);

    property.items = { type: arrayConstraints.itemType };
  }

  return {
    name: answers.name,
    property,
    required: answers.required,
  };
}

// Quick input mode - parse key=value pairs
export function parseQuickInput(args: string[]): any {
  const result: any = {};

  for (const arg of args) {
    if (arg.includes('=')) {
      const [key, ...valueParts] = arg.split('=');
      const value = valueParts.join('='); // Handle values with '=' in them

      // Try to parse the value
      if (value === 'true' || value === 'false') {
        result[key] = value === 'true';
      } else if (!isNaN(Number(value))) {
        result[key] = Number(value);
      } else if (value.includes(',')) {
        result[key] = value.split(',').map((s) => s.trim());
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

// Validate entity data against schema
export function validateEntity(
  data: any,
  fields: FieldInfo[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  for (const field of fields) {
    if (
      field.required &&
      (data[field.name] === undefined || data[field.name] === '')
    ) {
      errors.push(`Missing required field: ${field.name}`);
    }
  }

  // Validate field values
  for (const [key, value] of Object.entries(data)) {
    const field = fields.find((f) => f.name === key);
    if (!field) {
      // Field not in schema - this might be okay if additionalProperties is allowed
      continue;
    }

    // Type validation
    if (field.type === 'number' || field.type === 'integer') {
      if (typeof value !== 'number') {
        errors.push(`${key} must be a number`);
      } else {
        if (field.minimum !== undefined && value < field.minimum) {
          errors.push(`${key} must be at least ${field.minimum}`);
        }
        if (field.maximum !== undefined && value > field.maximum) {
          errors.push(`${key} must be at most ${field.maximum}`);
        }
      }
    } else if (field.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${key} must be a string`);
      } else {
        if (field.minLength && value.length < field.minLength) {
          errors.push(`${key} must be at least ${field.minLength} characters`);
        }
        if (field.maxLength && value.length > field.maxLength) {
          errors.push(`${key} must be at most ${field.maxLength} characters`);
        }
        if (field.format === 'email' && !isValidEmail(value)) {
          errors.push(`${key} must be a valid email address`);
        }
      }
    } else if (field.type === 'boolean') {
      if (typeof value !== 'boolean') {
        errors.push(`${key} must be a boolean`);
      }
    } else if (field.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${key} must be an array`);
      }
    }

    // Enum validation
    if (field.enum && !field.enum.includes(value as string)) {
      errors.push(`${key} must be one of: ${field.enum.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
