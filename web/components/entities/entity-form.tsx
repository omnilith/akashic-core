'use client'

import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, AlertCircle, Copy, ChevronDown, ChevronRight } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface EntityFormProps {
  entityType: {
    id: string
    name: string
    namespace: string
    schemaJson: any
    description?: string
  }
  initialData?: any
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  mode?: 'create' | 'edit'
}

export function EntityForm({
  entityType,
  initialData,
  onSubmit,
  onCancel,
  mode = 'create'
}: EntityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [showJsonEditor, setShowJsonEditor] = useState(false)
  const [jsonEditorValue, setJsonEditorValue] = useState('')

  const { control, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm({
    defaultValues: initialData?.data || {}
  })

  const schema = entityType.schemaJson
  const properties = schema?.properties || {}
  const required = schema?.required || []

  useEffect(() => {
    if (initialData?.data) {
      reset(initialData.data)
      setJsonEditorValue(JSON.stringify(initialData.data, null, 2))
    }
  }, [initialData, reset])

  const toggleSection = (key: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(key)) {
      newCollapsed.delete(key)
    } else {
      newCollapsed.add(key)
    }
    setCollapsedSections(newCollapsed)
  }

  const renderField = (key: string, property: any, path: string = '', isRequired: boolean = false) => {
    const fieldPath = path ? `${path}.${key}` : key
    const fieldErrors = path ? errors[path]?.[key] : errors[key]

    // Handle different property types
    if (property.type === 'object' && property.properties) {
      const isCollapsed = collapsedSections.has(fieldPath)
      return (
        <Card key={fieldPath} className="mb-4">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => toggleSection(fieldPath)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <CardTitle className="text-base">{property.title || key}</CardTitle>
                {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
              </div>
            </div>
            {property.description && (
              <CardDescription>{property.description}</CardDescription>
            )}
          </CardHeader>
          {!isCollapsed && (
            <CardContent>
              {Object.entries(property.properties).map(([subKey, subProp]: [string, any]) => 
                renderField(subKey, subProp, fieldPath, property.required?.includes(subKey))
              )}
            </CardContent>
          )}
        </Card>
      )
    }

    if (property.type === 'array') {
      return (
        <div key={fieldPath} className="mb-4">
          <Label className="mb-2 flex items-center gap-2">
            {property.title || key}
            {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
          </Label>
          {property.description && (
            <p className="text-sm text-muted-foreground mb-2">{property.description}</p>
          )}
          <Controller
            name={fieldPath}
            control={control}
            rules={{ required: isRequired ? `${key} is required` : false }}
            render={({ field }) => (
              <ArrayField
                value={field.value || []}
                onChange={field.onChange}
                itemSchema={property.items}
                fieldPath={fieldPath}
              />
            )}
          />
          {fieldErrors && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fieldErrors.message}</AlertDescription>
            </Alert>
          )}
        </div>
      )
    }

    // Simple field types
    return (
      <div key={fieldPath} className="mb-4">
        <Label htmlFor={fieldPath} className="mb-2 flex items-center gap-2">
          {property.title || key}
          {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
        </Label>
        {property.description && (
          <p className="text-sm text-muted-foreground mb-2">{property.description}</p>
        )}
        <Controller
          name={fieldPath}
          control={control}
          rules={{
            required: isRequired ? `${key} is required` : false,
            min: property.minimum,
            max: property.maximum,
            minLength: property.minLength,
            maxLength: property.maxLength,
            pattern: property.pattern ? {
              value: new RegExp(property.pattern),
              message: `Invalid format for ${key}`
            } : undefined
          }}
          render={({ field }) => {
            if (property.enum) {
              return (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${key}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {property.enum.map((option: any) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            }

            if (property.type === 'boolean') {
              return (
                <Select value={String(field.value)} onValueChange={(v) => field.onChange(v === 'true')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              )
            }

            if (property.type === 'number' || property.type === 'integer') {
              return (
                <Input
                  {...field}
                  type="number"
                  step={property.type === 'integer' ? 1 : 'any'}
                  min={property.minimum}
                  max={property.maximum}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              )
            }

            if (property.format === 'date' || property.format === 'date-time') {
              return (
                <Input
                  {...field}
                  type={property.format === 'date' ? 'date' : 'datetime-local'}
                />
              )
            }

            if (property.format === 'email') {
              return <Input {...field} type="email" />
            }

            if (property.format === 'uri' || property.format === 'url') {
              return <Input {...field} type="url" />
            }

            if (property.maxLength && property.maxLength > 100) {
              return <Textarea {...field} rows={4} maxLength={property.maxLength} />
            }

            return <Input {...field} maxLength={property.maxLength} />
          }}
        />
        {fieldErrors && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{fieldErrors.message}</AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  const ArrayField = ({ value, onChange, itemSchema, fieldPath }: any) => {
    const items = value || []

    const addItem = () => {
      const newItem = itemSchema?.type === 'object' ? {} :
                      itemSchema?.type === 'number' ? 0 :
                      itemSchema?.type === 'boolean' ? false : ''
      onChange([...items, newItem])
    }

    const removeItem = (index: number) => {
      onChange(items.filter((_: any, i: number) => i !== index))
    }

    const updateItem = (index: number, newValue: any) => {
      const newItems = [...items]
      newItems[index] = newValue
      onChange(newItems)
    }

    return (
      <div className="space-y-2">
        {items.map((item: any, index: number) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1">
              {itemSchema?.type === 'object' ? (
                <Card>
                  <CardContent className="pt-4">
                    {Object.entries(itemSchema.properties || {}).map(([key, prop]: [string, any]) => (
                      <div key={key} className="mb-2">
                        <Label>{prop.title || key}</Label>
                        <Input
                          value={item[key] || ''}
                          onChange={(e) => updateItem(index, { ...item, [key]: e.target.value })}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Input
                  value={item}
                  onChange={(e) => updateItem(index, e.target.value)}
                  type={itemSchema?.type === 'number' ? 'number' : 'text'}
                />
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Item
        </Button>
      </div>
    )
  }

  const handleJsonSubmit = () => {
    try {
      const data = JSON.parse(jsonEditorValue)
      handleFormSubmit(data)
    } catch (e) {
      setError('Invalid JSON format')
    }
  }

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const syncJsonToForm = () => {
    try {
      const data = JSON.parse(jsonEditorValue)
      reset(data)
      setShowJsonEditor(false)
    } catch (e) {
      setError('Invalid JSON format')
    }
  }

  const syncFormToJson = () => {
    const formData = watch()
    setJsonEditorValue(JSON.stringify(formData, null, 2))
    setShowJsonEditor(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === 'create' ? 'Create' : 'Edit'} {entityType.name}
        </CardTitle>
        {entityType.description && (
          <CardDescription>{entityType.description}</CardDescription>
        )}
        <div className="flex gap-2">
          <Badge>{entityType.namespace}</Badge>
          <Badge variant="outline">ID: {entityType.id}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={showJsonEditor ? 'json' : 'form'} onValueChange={(v) => setShowJsonEditor(v === 'json')}>
          <TabsList className="mb-4">
            <TabsTrigger value="form">Form Editor</TabsTrigger>
            <TabsTrigger value="json">JSON Editor</TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
              {Object.entries(properties).map(([key, property]: [string, any]) =>
                renderField(key, property, '', required.includes(key))
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Entity' : 'Update Entity'}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="button" variant="outline" onClick={syncFormToJson}>
                  Edit as JSON
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="json">
            <div className="space-y-4">
              <Textarea
                value={jsonEditorValue}
                onChange={(e) => setJsonEditorValue(e.target.value)}
                className="font-mono min-h-[400px]"
                placeholder="Enter JSON data..."
              />

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={handleJsonSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Entity' : 'Update Entity'}
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={syncJsonToForm}>
                  Edit in Form
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      const formatted = JSON.stringify(JSON.parse(jsonEditorValue), null, 2)
                      setJsonEditorValue(formatted)
                    } catch (e) {
                      setError('Invalid JSON format')
                    }
                  }}
                >
                  Format JSON
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}