'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Plus, Trash2, CheckCircle } from 'lucide-react';

interface EntityTypeFormProps {
  initialData?: {
    id?: string;
    name?: string;
    namespace?: string;
    schemaJson?: any;
    metadata?: any;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  enum?: string[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

export function EntityTypeForm({
  initialData,
  onSubmit,
  onCancel,
  loading,
}: EntityTypeFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    namespace: initialData?.namespace || 'global',
    metadata: initialData?.metadata || {},
  });

  const [schemaMode, setSchemaMode] = useState<'visual' | 'json'>('visual');
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);
  const [schemaJson, setSchemaJson] = useState<string>('');
  const [additionalProperties, setAdditionalProperties] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isValidSchema, setIsValidSchema] = useState(true);

  // Initialize schema fields from initial data
  useEffect(() => {
    if (initialData?.schemaJson) {
      try {
        const schema = initialData.schemaJson;
        const properties = schema.properties || {};
        const required = schema.required || [];
        
        const fields: SchemaField[] = Object.entries(properties).map(([name, prop]: [string, any]) => ({
          name,
          type: prop.type || 'string',
          required: required.includes(name),
          description: prop.description,
          enum: prop.enum,
          pattern: prop.pattern,
          minLength: prop.minLength,
          maxLength: prop.maxLength,
          minimum: prop.minimum,
          maximum: prop.maximum,
        }));
        
        setSchemaFields(fields);
        setSchemaJson(JSON.stringify(schema, null, 2));
        setAdditionalProperties(schema.additionalProperties ?? true);
      } catch (error) {
        console.error('Error parsing initial schema:', error);
      }
    } else {
      // Default schema
      const defaultSchema = {
        type: 'object',
        properties: {},
        required: [],
        additionalProperties: true,
      };
      setSchemaJson(JSON.stringify(defaultSchema, null, 2));
    }
  }, [initialData]);

  // Convert fields to JSON Schema
  const fieldsToSchema = () => {
    const properties: any = {};
    const required: string[] = [];

    schemaFields.forEach((field) => {
      const prop: any = { type: field.type };
      
      if (field.description) prop.description = field.description;
      if (field.enum && field.enum.length > 0) prop.enum = field.enum;
      if (field.pattern) prop.pattern = field.pattern;
      if (field.minLength !== undefined) prop.minLength = field.minLength;
      if (field.maxLength !== undefined) prop.maxLength = field.maxLength;
      if (field.minimum !== undefined) prop.minimum = field.minimum;
      if (field.maximum !== undefined) prop.maximum = field.maximum;

      properties[field.name] = prop;
      
      if (field.required) {
        required.push(field.name);
      }
    });

    return {
      type: 'object',
      properties,
      required,
      additionalProperties,
    };
  };

  // Update JSON when fields change
  useEffect(() => {
    if (schemaMode === 'visual') {
      const schema = fieldsToSchema();
      setSchemaJson(JSON.stringify(schema, null, 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaFields, additionalProperties, schemaMode]);

  // Validate JSON schema
  const validateJsonSchema = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.type !== 'object') {
        throw new Error('Schema type must be object');
      }
      setValidationError(null);
      setIsValidSchema(true);
      return true;
    } catch (error: any) {
      setValidationError(error.message);
      setIsValidSchema(false);
      return false;
    }
  };

  // Add new field
  const addField = () => {
    setSchemaFields([
      ...schemaFields,
      {
        name: `field_${schemaFields.length + 1}`,
        type: 'string',
        required: false,
      },
    ]);
  };

  // Remove field
  const removeField = (index: number) => {
    setSchemaFields(schemaFields.filter((_, i) => i !== index));
  };

  // Update field
  const updateField = (index: number, updates: Partial<SchemaField>) => {
    const newFields = [...schemaFields];
    newFields[index] = { ...newFields[index], ...updates };
    setSchemaFields(newFields);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalSchema;
    try {
      if (schemaMode === 'json') {
        if (!validateJsonSchema(schemaJson)) {
          return;
        }
        finalSchema = JSON.parse(schemaJson);
      } else {
        finalSchema = fieldsToSchema();
      }
    } catch {
      setValidationError('Invalid JSON schema');
      return;
    }

    const submitData = {
      ...formData,
      schemaJson: finalSchema,
    };

    await onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Define the name and namespace for this entity type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Person, Product, Order"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="namespace">Namespace</Label>
            <Select
              value={formData.namespace}
              onValueChange={(value) => setFormData({ ...formData, namespace: value })}
              disabled={loading}
            >
              <SelectTrigger id="namespace">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">global</SelectItem>
                <SelectItem value="system">system</SelectItem>
                <SelectItem value="test">test</SelectItem>
                <SelectItem value="work">work</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Schema Definition */}
      <Card>
        <CardHeader>
          <CardTitle>Schema Definition</CardTitle>
          <CardDescription>
            Define the JSON Schema for this entity type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={schemaMode} onValueChange={(v) => setSchemaMode(v as 'visual' | 'json')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="visual">Visual Editor</TabsTrigger>
              <TabsTrigger value="json">JSON Editor</TabsTrigger>
            </TabsList>

            <TabsContent value="visual" className="space-y-4">
              {/* Fields List */}
              <div className="space-y-4">
                {schemaFields.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No fields defined yet. Click &quot;Add Field&quot; to create your first field.
                    </AlertDescription>
                  </Alert>
                ) : (
                  schemaFields.map((field, index) => (
                    <div key={index} className="rounded-lg border p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="grid gap-4 flex-1 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Field Name</Label>
                            <Input
                              value={field.name}
                              onChange={(e) => updateField(index, { name: e.target.value })}
                              placeholder="fieldName"
                              disabled={loading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(value) => updateField(index, { type: value })}
                              disabled={loading}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                                <SelectItem value="object">Object</SelectItem>
                                <SelectItem value="array">Array</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeField(index)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={field.description || ''}
                            onChange={(e) => updateField(index, { description: e.target.value })}
                            placeholder="Optional field description"
                            disabled={loading}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`required-${index}`}
                            checked={field.required}
                            onChange={(e) => updateField(index, { required: e.target.checked })}
                            disabled={loading}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`required-${index}`}>Required field</Label>
                        </div>
                      </div>

                      {/* Additional constraints based on type */}
                      {field.type === 'string' && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Pattern (RegEx)</Label>
                            <Input
                              value={field.pattern || ''}
                              onChange={(e) => updateField(index, { pattern: e.target.value })}
                              placeholder="e.g., ^[A-Z]"
                              disabled={loading}
                            />
                          </div>
                          <div className="grid gap-4 grid-cols-2">
                            <div className="space-y-2">
                              <Label>Min Length</Label>
                              <Input
                                type="number"
                                value={field.minLength || ''}
                                onChange={(e) => updateField(index, { minLength: parseInt(e.target.value) || undefined })}
                                disabled={loading}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max Length</Label>
                              <Input
                                type="number"
                                value={field.maxLength || ''}
                                onChange={(e) => updateField(index, { maxLength: parseInt(e.target.value) || undefined })}
                                disabled={loading}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {field.type === 'number' && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Minimum Value</Label>
                            <Input
                              type="number"
                              value={field.minimum || ''}
                              onChange={(e) => updateField(index, { minimum: parseFloat(e.target.value) || undefined })}
                              disabled={loading}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Maximum Value</Label>
                            <Input
                              type="number"
                              value={field.maximum || ''}
                              onChange={(e) => updateField(index, { maximum: parseFloat(e.target.value) || undefined })}
                              disabled={loading}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addField}
                  disabled={loading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="additionalProperties"
                    checked={additionalProperties}
                    onChange={(e) => setAdditionalProperties(e.target.checked)}
                    disabled={loading}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="additionalProperties">Allow additional properties</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="json" className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={schemaJson}
                  onChange={(e) => {
                    setSchemaJson(e.target.value);
                    validateJsonSchema(e.target.value);
                  }}
                  className="font-mono min-h-[400px]"
                  placeholder="Enter JSON Schema..."
                  disabled={loading}
                />
                {validationError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}
                {!validationError && schemaJson && (
                  <Alert>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>Valid JSON Schema</AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !formData.name || (schemaMode === 'json' && !isValidSchema)}
        >
          {loading ? 'Saving...' : initialData?.id ? 'Update Entity Type' : 'Create Entity Type'}
        </Button>
      </div>
    </form>
  );
}