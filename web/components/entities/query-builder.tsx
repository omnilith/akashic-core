'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Search, Code, Filter } from 'lucide-react'

interface QueryCondition {
  field: string
  operator: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'date' | 'array'
}

interface QueryBuilderProps {
  onSearch: (query: any) => void
  entityType?: {
    id: string
    name: string
    schemaJson: any
  }
}

const OPERATORS = {
  string: [
    { value: '$eq', label: 'equals' },
    { value: '$ne', label: 'not equals' },
    { value: '$regex', label: 'matches pattern' },
    { value: '$in', label: 'in list' },
    { value: '$nin', label: 'not in list' },
    { value: '$exists', label: 'exists' }
  ],
  number: [
    { value: '$eq', label: 'equals' },
    { value: '$ne', label: 'not equals' },
    { value: '$gt', label: 'greater than' },
    { value: '$gte', label: 'greater than or equal' },
    { value: '$lt', label: 'less than' },
    { value: '$lte', label: 'less than or equal' },
    { value: '$in', label: 'in list' },
    { value: '$nin', label: 'not in list' },
    { value: '$exists', label: 'exists' }
  ],
  boolean: [
    { value: '$eq', label: 'equals' },
    { value: '$ne', label: 'not equals' },
    { value: '$exists', label: 'exists' }
  ],
  date: [
    { value: '$eq', label: 'equals' },
    { value: '$ne', label: 'not equals' },
    { value: '$gt', label: 'after' },
    { value: '$gte', label: 'on or after' },
    { value: '$lt', label: 'before' },
    { value: '$lte', label: 'on or before' },
    { value: '$exists', label: 'exists' }
  ],
  array: [
    { value: '$size', label: 'size equals' },
    { value: '$all', label: 'contains all' },
    { value: '$elemMatch', label: 'element matches' },
    { value: '$exists', label: 'exists' }
  ]
}

export function QueryBuilder({ onSearch, entityType }: QueryBuilderProps) {
  const [mode, setMode] = useState<'builder' | 'json'>('builder')
  const [conditions, setConditions] = useState<QueryCondition[]>([])
  const [logicalOperator, setLogicalOperator] = useState<'$and' | '$or'>('$and')
  const [jsonQuery, setJsonQuery] = useState('{}')
  const [error, setError] = useState<string | null>(null)

  const getFieldsFromSchema = () => {
    if (!entityType?.schemaJson?.properties) {
      return []
    }

    const fields: { path: string; type: string; title: string }[] = []
    
    const extractFields = (properties: any, prefix = '') => {
      Object.entries(properties).forEach(([key, prop]: [string, any]) => {
        const fieldPath = prefix ? `${prefix}.${key}` : key
        const fieldTitle = prop.title || key
        
        if (prop.type === 'object' && prop.properties) {
          extractFields(prop.properties, fieldPath)
        } else {
          let fieldType = 'string'
          if (prop.type === 'number' || prop.type === 'integer') fieldType = 'number'
          else if (prop.type === 'boolean') fieldType = 'boolean'
          else if (prop.type === 'array') fieldType = 'array'
          else if (prop.format === 'date' || prop.format === 'date-time') fieldType = 'date'
          
          fields.push({
            path: `data.${fieldPath}`,
            type: fieldType,
            title: prefix ? `${prefix} > ${fieldTitle}` : fieldTitle
          })
        }
      })
    }

    extractFields(entityType.schemaJson.properties)
    
    // Add system fields
    fields.unshift(
      { path: 'id', type: 'string', title: 'Entity ID' },
      { path: 'namespace', type: 'string', title: 'Namespace' },
      { path: 'entityTypeId', type: 'string', title: 'Entity Type ID' },
      { path: 'createdAt', type: 'date', title: 'Created At' },
      { path: 'updatedAt', type: 'date', title: 'Updated At' }
    )
    
    return fields
  }

  const fields = getFieldsFromSchema()

  const addCondition = () => {
    setConditions([...conditions, {
      field: fields[0]?.path || 'data',
      operator: '$eq',
      value: '',
      type: fields[0]?.type as any || 'string'
    }])
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const updateCondition = (index: number, updates: Partial<QueryCondition>) => {
    const newConditions = [...conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    
    // Update type when field changes
    if (updates.field) {
      const field = fields.find(f => f.path === updates.field)
      if (field) {
        newConditions[index].type = field.type as any
        // Reset operator if not compatible with new type
        const validOperators = OPERATORS[field.type as keyof typeof OPERATORS] || OPERATORS.string
        if (!validOperators.find(op => op.value === newConditions[index].operator)) {
          newConditions[index].operator = validOperators[0].value
        }
      }
    }
    
    setConditions(newConditions)
  }

  const buildQuery = () => {
    if (conditions.length === 0) return {}

    const queryConditions = conditions.map(cond => {
      const { field, operator, value, type } = cond
      
      // Parse value based on type
      let parsedValue = value
      if (operator !== '$exists') {
        if (type === 'number') {
          parsedValue = Number(value)
        } else if (type === 'boolean') {
          parsedValue = value === 'true'
        } else if (type === 'date') {
          parsedValue = new Date(value).toISOString()
        } else if ((operator === '$in' || operator === '$nin') && typeof value === 'string') {
          parsedValue = value.split(',').map(v => v.trim())
        }
      } else {
        parsedValue = value === 'true'
      }

      // Build the condition object
      const fieldParts = field.split('.')
      let condition: any = {}
      let current = condition
      
      for (let i = 0; i < fieldParts.length - 1; i++) {
        current[fieldParts[i]] = {}
        current = current[fieldParts[i]]
      }
      
      if (operator === '$regex') {
        current[fieldParts[fieldParts.length - 1]] = { [operator]: parsedValue, $options: 'i' }
      } else {
        current[fieldParts[fieldParts.length - 1]] = { [operator]: parsedValue }
      }
      
      return condition
    })

    if (queryConditions.length === 1) {
      return queryConditions[0]
    }

    return { [logicalOperator]: queryConditions }
  }

  const handleBuilderSearch = () => {
    const query = buildQuery()
    onSearch(query)
  }

  const handleJsonSearch = () => {
    try {
      const query = JSON.parse(jsonQuery)
      setError(null)
      onSearch(query)
    } catch (e) {
      setError('Invalid JSON format')
    }
  }

  const syncBuilderToJson = () => {
    const query = buildQuery()
    setJsonQuery(JSON.stringify(query, null, 2))
    setMode('json')
  }

  const syncJsonToBuilder = () => {
    try {
      const query = JSON.parse(jsonQuery)
      // This is a simplified conversion - in production you'd want to parse the query back to conditions
      setError(null)
      setMode('builder')
    } catch (e) {
      setError('Invalid JSON format')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Search</CardTitle>
        <CardDescription>
          Build complex queries to find specific entities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'builder' | 'json')}>
          <TabsList className="mb-4">
            <TabsTrigger value="builder">
              <Filter className="h-4 w-4 mr-2" />
              Query Builder
            </TabsTrigger>
            <TabsTrigger value="json">
              <Code className="h-4 w-4 mr-2" />
              JSON Query
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            <div className="space-y-4">
              {conditions.length > 1 && (
                <div className="flex items-center gap-2">
                  <Label>Combine conditions with:</Label>
                  <Select value={logicalOperator} onValueChange={(v) => setLogicalOperator(v as '$and' | '$or')}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="$and">AND</SelectItem>
                      <SelectItem value="$or">OR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {conditions.map((condition, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Label>Field</Label>
                        <Select
                          value={condition.field}
                          onValueChange={(value) => updateCondition(index, { field: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fields.map(field => (
                              <SelectItem key={field.path} value={field.path}>
                                {field.title}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {field.type}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-3">
                        <Label>Operator</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(value) => updateCondition(index, { operator: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(OPERATORS[condition.type] || OPERATORS.string).map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-4">
                        <Label>Value</Label>
                        {condition.operator === '$exists' ? (
                          <Select
                            value={String(condition.value)}
                            onValueChange={(value) => updateCondition(index, { value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : condition.type === 'boolean' ? (
                          <Select
                            value={String(condition.value)}
                            onValueChange={(value) => updateCondition(index, { value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : condition.type === 'date' ? (
                          <Input
                            type="datetime-local"
                            value={condition.value}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                          />
                        ) : condition.type === 'number' ? (
                          <Input
                            type="number"
                            value={condition.value}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                            placeholder="Enter number"
                          />
                        ) : (condition.operator === '$in' || condition.operator === '$nin') ? (
                          <Input
                            value={condition.value}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                            placeholder="Comma-separated values"
                          />
                        ) : (
                          <Input
                            value={condition.value}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                            placeholder="Enter value"
                          />
                        )}
                      </div>

                      <div className="col-span-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCondition(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2">
                <Button variant="outline" onClick={addCondition}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Condition
                </Button>
                <Button onClick={handleBuilderSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" onClick={syncBuilderToJson}>
                  View as JSON
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="json">
            <div className="space-y-4">
              <div>
                <Label>JSON Query</Label>
                <Textarea
                  value={jsonQuery}
                  onChange={(e) => setJsonQuery(e.target.value)}
                  className="font-mono min-h-[200px]"
                  placeholder='{"data": {"status": {"$eq": "active"}}}'
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={handleJsonSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      const formatted = JSON.stringify(JSON.parse(jsonQuery), null, 2)
                      setJsonQuery(formatted)
                      setError(null)
                    } catch (e) {
                      setError('Invalid JSON format')
                    }
                  }}
                >
                  Format JSON
                </Button>
              </div>

              <div className="border rounded p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Query Examples:</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div>{"// Find by exact value"}</div>
                  <div>{'{"data": {"status": {"$eq": "active"}}}'}</div>
                  
                  <div className="mt-3">{"// Find with pattern matching"}</div>
                  <div>{'{"data": {"name": {"$regex": "John", "$options": "i"}}}'}</div>
                  
                  <div className="mt-3">{"// Find with numeric comparison"}</div>
                  <div>{'{"data": {"age": {"$gte": 18, "$lt": 65}}}'}</div>
                  
                  <div className="mt-3">{"// Complex query with AND/OR"}</div>
                  <div>{'{"$or": [{"namespace": "global"}, {"data": {"public": true}}]}'}</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}