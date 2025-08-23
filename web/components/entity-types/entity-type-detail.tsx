'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Code, 
  Database, 
  Link, 
  Calendar, 
  Hash,
  FileJson,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface EntityType {
  id: string;
  name: string;
  namespace: string;
  schemaJson: any;
  metadata?: any;
  entityCount?: number;
  relationTypesFrom?: any[];
  relationTypesTo?: any[];
  createdAt: string;
  updatedAt?: string;
}

interface EntityTypeDetailProps {
  entityType: EntityType;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EntityTypeDetail({ entityType, onEdit, onDelete }: EntityTypeDetailProps) {
  const [activeTab, setActiveTab] = useState('schema');

  // Parse schema for display
  const schemaProperties = entityType.schemaJson?.properties || {};
  const requiredFields = entityType.schemaJson?.required || [];
  const additionalProperties = entityType.schemaJson?.additionalProperties ?? true;

  // Get namespace color
  const getNamespaceColor = (namespace: string) => {
    const colors: Record<string, string> = {
      global: 'bg-blue-100 text-blue-800',
      system: 'bg-purple-100 text-purple-800',
      test: 'bg-yellow-100 text-yellow-800',
      work: 'bg-green-100 text-green-800',
    };
    
    const prefix = namespace.split('.')[0];
    return colors[prefix] || 'bg-gray-100 text-gray-800';
  };

  // Format JSON for display
  const formatJson = (json: any) => {
    try {
      return JSON.stringify(json, null, 2);
    } catch {
      return '{}';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">{entityType.name}</h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Hash className="h-4 w-4" />
              <span>{entityType.id}</span>
            </div>
            <Badge variant="secondary" className={getNamespaceColor(entityType.namespace)}>
              {entityType.namespace}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="outline" onClick={onDelete} className="text-red-600">
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entities</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entityType.entityCount || 0}</div>
            <p className="text-xs text-muted-foreground">Using this type</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Required Fields</CardTitle>
            <FileJson className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requiredFields.length}</div>
            <p className="text-xs text-muted-foreground">Must be provided</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fields</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(schemaProperties).length}</div>
            <p className="text-xs text-muted-foreground">Defined properties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relations</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(entityType.relationTypesFrom?.length || 0) + (entityType.relationTypesTo?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Connected types</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="relations">Relations</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>JSON Schema</CardTitle>
              <CardDescription>
                The complete JSON Schema definition for this entity type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-slate-50">
                <code>{formatJson(entityType.schemaJson)}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schema Properties</CardTitle>
              <CardDescription>
                Individual fields defined in this entity type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(schemaProperties).length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    No properties defined in schema
                  </div>
                ) : (
                  Object.entries(schemaProperties).map(([fieldName, fieldSchema]: [string, any]) => (
                    <div key={fieldName} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{fieldName}</h4>
                            {requiredFields.includes(fieldName) && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Type: {fieldSchema.type || 'any'}
                          </p>
                          {fieldSchema.description && (
                            <p className="text-sm">{fieldSchema.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {fieldSchema.enum && (
                            <Badge variant="outline">Enum</Badge>
                          )}
                          {fieldSchema.pattern && (
                            <Badge variant="outline">Pattern</Badge>
                          )}
                          {fieldSchema.minLength !== undefined || fieldSchema.maxLength !== undefined ? (
                            <Badge variant="outline">Length</Badge>
                          ) : null}
                        </div>
                      </div>

                      {/* Field constraints */}
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        {fieldSchema.enum && (
                          <div>Values: {fieldSchema.enum.join(', ')}</div>
                        )}
                        {fieldSchema.pattern && (
                          <div>Pattern: {fieldSchema.pattern}</div>
                        )}
                        {fieldSchema.minLength !== undefined && (
                          <div>Min length: {fieldSchema.minLength}</div>
                        )}
                        {fieldSchema.maxLength !== undefined && (
                          <div>Max length: {fieldSchema.maxLength}</div>
                        )}
                        {fieldSchema.minimum !== undefined && (
                          <div>Min value: {fieldSchema.minimum}</div>
                        )}
                        {fieldSchema.maximum !== undefined && (
                          <div>Max value: {fieldSchema.maximum}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center gap-2 text-sm">
                {additionalProperties ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Additional properties allowed</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span>No additional properties allowed</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outgoing Relations</CardTitle>
              <CardDescription>
                Relations from this entity type to others
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!entityType.relationTypesFrom?.length ? (
                <div className="text-center text-muted-foreground py-4">
                  No outgoing relations defined
                </div>
              ) : (
                <div className="space-y-2">
                  {entityType.relationTypesFrom.map((relation) => (
                    <div key={relation.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">{relation.name}</div>
                        <div className="text-sm text-muted-foreground">
                          To: {relation.toEntityType?.name || relation.toEntityTypeId}
                        </div>
                      </div>
                      <Badge variant="outline">{relation.cardinality}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Incoming Relations</CardTitle>
              <CardDescription>
                Relations from other entity types to this one
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!entityType.relationTypesTo?.length ? (
                <div className="text-center text-muted-foreground py-4">
                  No incoming relations defined
                </div>
              ) : (
                <div className="space-y-2">
                  {entityType.relationTypesTo.map((relation) => (
                    <div key={relation.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="font-medium">{relation.name}</div>
                        <div className="text-sm text-muted-foreground">
                          From: {relation.fromEntityType?.name || relation.fromEntityTypeId}
                        </div>
                      </div>
                      <Badge variant="outline">{relation.cardinality}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>
                Additional information about this entity type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Created</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(entityType.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{entityType.updatedAt ? new Date(entityType.updatedAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {entityType.metadata && Object.keys(entityType.metadata).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Custom Metadata</h4>
                      <pre className="overflow-auto rounded-lg bg-slate-950 p-4 text-slate-50">
                        <code>{formatJson(entityType.metadata)}</code>
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}