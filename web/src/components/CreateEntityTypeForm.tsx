'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  CREATE_ENTITY_TYPE,
  type CreateEntityTypeInput,
  type CreateEntityTypeResponse,
} from '@/lib/mutations/entity-types';
import { GET_ENTITY_TYPES } from '@/lib/queries/entity-types';
import styles from './CreateEntityTypeForm.module.css';

interface Field {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

interface CreateEntityTypeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateEntityTypeForm({
  onSuccess,
  onCancel,
}: CreateEntityTypeFormProps) {
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('global');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<Field[]>([
    { name: '', type: 'string', required: false },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createEntityType] = useMutation<
    CreateEntityTypeResponse,
    { input: CreateEntityTypeInput }
  >(CREATE_ENTITY_TYPE, {
    refetchQueries: [{ query: GET_ENTITY_TYPES }],
    onCompleted: () => {
      setIsSubmitting(false);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      setIsSubmitting(false);
      setErrors({ submit: error.message });
    },
  });

  const addField = () => {
    setFields([...fields, { name: '', type: 'string', required: false }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: Partial<Field>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...field };
    setFields(newFields);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!namespace.trim()) {
      newErrors.namespace = 'Namespace is required';
    }

    const validFields = fields.filter((f) => f.name.trim());
    if (validFields.length === 0) {
      newErrors.fields = 'At least one field is required';
    }

    const fieldNames = validFields.map((f) => f.name);
    const duplicates = fieldNames.filter(
      (name, index) => fieldNames.indexOf(name) !== index,
    );
    if (duplicates.length > 0) {
      newErrors.fields = `Duplicate field names: ${duplicates.join(', ')}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildSchema = () => {
    const properties: Record<string, { type: string; description?: string }> =
      {};
    const required: string[] = [];

    fields
      .filter((f) => f.name.trim())
      .forEach((field) => {
        const fieldSchema: { type: string; description?: string } = {
          type: field.type,
        };
        if (field.description) {
          fieldSchema.description = field.description;
        }
        properties[field.name] = fieldSchema;

        if (field.required) {
          required.push(field.name);
        }
      });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      additionalProperties: false,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    const schemaJson = buildSchema();

    try {
      await createEntityType({
        variables: {
          input: {
            name,
            namespace,
            schema: JSON.stringify(schemaJson),
          },
        },
      });
    } catch (error) {
      console.error('Error creating entity type:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h2 className={styles.formTitle}>Create Entity Type</h2>

      <div className={styles.formSection}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="e.g., Person, Product, Order"
              disabled={isSubmitting}
            />
          </label>
          {errors.name && <span className={styles.error}>{errors.name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Namespace
            <input
              type="text"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              className={styles.input}
              placeholder="e.g., global, work.acme"
              disabled={isSubmitting}
            />
          </label>
          {errors.namespace && (
            <span className={styles.error}>{errors.namespace}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Description (optional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              placeholder="Describe what this entity type represents"
              rows={3}
              disabled={isSubmitting}
            />
          </label>
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Schema Fields</h3>
          <button
            type="button"
            onClick={addField}
            className={styles.addButton}
            disabled={isSubmitting}
          >
            + Add Field
          </button>
        </div>

        {errors.fields && <span className={styles.error}>{errors.fields}</span>}

        <div className={styles.fieldsList}>
          {fields.map((field, index) => (
            <div key={index} className={styles.fieldRow}>
              <input
                type="text"
                value={field.name}
                onChange={(e) => updateField(index, { name: e.target.value })}
                className={styles.fieldInput}
                placeholder="Field name"
                disabled={isSubmitting}
              />

              <select
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value })}
                className={styles.fieldSelect}
                disabled={isSubmitting}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="object">Object</option>
                <option value="array">Array</option>
              </select>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) =>
                    updateField(index, { required: e.target.checked })
                  }
                  disabled={isSubmitting}
                />
                Required
              </label>

              <button
                type="button"
                onClick={() => removeField(index)}
                className={styles.removeButton}
                disabled={isSubmitting || fields.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {errors.submit && (
        <div className={styles.errorBox}>
          <p>{errors.submit}</p>
        </div>
      )}

      <div className={styles.formActions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Entity Type'}
        </button>
      </div>
    </form>
  );
}
