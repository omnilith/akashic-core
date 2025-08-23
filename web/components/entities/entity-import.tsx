'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useBulkCreateEntities } from '@/lib/graphql/hooks/useEntities'
import { useEntityTypes } from '@/lib/graphql/hooks/useEntityTypes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { 
  Upload, 
  FileJson, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react'

interface EntityImportProps {
  onImportComplete?: (count: number) => void
  defaultEntityTypeId?: string
  defaultNamespace?: string
}

interface ImportEntity {
  data: any
  entityTypeId?: string
  namespace?: string
  metadata?: any
}

export function EntityImport({
  onImportComplete,
  defaultEntityTypeId,
  defaultNamespace = 'global'
}: EntityImportProps) {
  const [importData, setImportData] = useState<ImportEntity[]>([])
  const [selectedEntityType, setSelectedEntityType] = useState(defaultEntityTypeId || '')
  const [selectedNamespace, setSelectedNamespace] = useState(defaultNamespace)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importResults, setImportResults] = useState<any[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({})

  const { entityTypes } = useEntityTypes()
  const { createMany } = useBulkCreateEntities({
    onCompleted: (data) => {
      setImportResults(data)
      onImportComplete?.(data.length)
    },
    onError: (error) => {
      setParseError(error.message)
    }
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        parseJsonData(content)
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        parseCsvData(content)
      } else {
        setParseError('Unsupported file type. Please upload JSON or CSV files.')
      }
    }
    reader.readAsText(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  const parseJsonData = (content: string) => {
    try {
      const data = JSON.parse(content)
      let entities: ImportEntity[] = []

      if (Array.isArray(data)) {
        entities = data.map(item => {
          if (item.data) {
            // Already in entity format
            return {
              data: item.data,
              entityTypeId: item.entityTypeId,
              namespace: item.namespace,
              metadata: item.metadata
            }
          } else {
            // Raw data, needs entity wrapper
            return {
              data: item,
              entityTypeId: undefined,
              namespace: undefined
            }
          }
        })
      } else if (data.entities && Array.isArray(data.entities)) {
        // Wrapped in entities key
        entities = data.entities
      } else {
        // Single entity
        entities = [{
          data: data.data || data,
          entityTypeId: data.entityTypeId,
          namespace: data.namespace,
          metadata: data.metadata
        }]
      }

      setImportData(entities)
      setParseError(null)
    } catch (error) {
      setParseError('Invalid JSON format. Please check your file.')
      setImportData([])
    }
  }

  const parseCsvData = (content: string) => {
    try {
      const lines = content.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        setParseError('CSV file must have headers and at least one data row')
        return
      }

      const headers = lines[0].split(',').map(h => h.trim())
      const entities: ImportEntity[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const data: any = {}

        headers.forEach((header, index) => {
          const value = values[index]
          // Try to parse numbers and booleans
          if (value === 'true' || value === 'false') {
            data[header] = value === 'true'
          } else if (!isNaN(Number(value)) && value !== '') {
            data[header] = Number(value)
          } else {
            data[header] = value
          }
        })

        entities.push({
          data,
          entityTypeId: undefined,
          namespace: undefined
        })
      }

      setImportData(entities)
      setParseError(null)

      // Set up initial CSV mapping
      const mapping: Record<string, string> = {}
      headers.forEach(header => {
        mapping[header] = header
      })
      setCsvMapping(mapping)
    } catch (error) {
      setParseError('Error parsing CSV file. Please check the format.')
      setImportData([])
    }
  }

  const handleJsonImport = () => {
    parseJsonData(jsonInput)
  }

  const handleImport = async () => {
    if (importData.length === 0) {
      setParseError('No data to import')
      return
    }

    if (!selectedEntityType) {
      setParseError('Please select an entity type')
      return
    }

    setIsImporting(true)
    setParseError(null)

    try {
      const inputs = importData.map(entity => ({
        entityTypeId: entity.entityTypeId || selectedEntityType,
        namespace: entity.namespace || selectedNamespace,
        data: entity.data,
        metadata: entity.metadata || {}
      }))

      await createMany(inputs)
    } catch (error) {
      setParseError('Import failed. Please check your data and try again.')
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = () => {
    const entityType = entityTypes?.find(t => t.id === selectedEntityType)
    if (!entityType) return

    const template: any = {}
    const extractFields = (properties: any, prefix = '') => {
      Object.entries(properties || {}).forEach(([key, prop]: [string, any]) => {
        const fieldKey = prefix ? `${prefix}.${key}` : key
        if (prop.type === 'object' && prop.properties) {
          extractFields(prop.properties, fieldKey)
        } else {
          template[fieldKey] = prop.type === 'string' ? 'example' :
                              prop.type === 'number' ? 0 :
                              prop.type === 'boolean' ? false :
                              prop.type === 'array' ? [] : null
        }
      })
    }

    extractFields(entityType.schemaJson?.properties)

    const blob = new Blob([JSON.stringify([template], null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entityType.name}-template.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Import Entities</CardTitle>
          <CardDescription>
            Import entities from JSON or CSV files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Entity Type</Label>
                <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes?.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Namespace</Label>
                <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedEntityType && (
              <div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            )}

            <Tabs defaultValue="file">
              <TabsList>
                <TabsTrigger value="file">File Upload</TabsTrigger>
                <TabsTrigger value="paste">Paste JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="file">
                {/* File Upload */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  {isDragActive ? (
                    <p>Drop the file here...</p>
                  ) : (
                    <div>
                      <p className="font-medium">Drop a file here, or click to browse</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Supports JSON and CSV files
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="paste">
                <div className="space-y-4">
                  <Textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder="Paste your JSON data here..."
                    className="font-mono min-h-[200px]"
                  />
                  <Button onClick={handleJsonImport}>
                    Parse JSON
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Parse Error */}
            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            {/* Preview */}
            {importData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Preview
                    <Badge variant="secondary" className="ml-2">
                      {importData.length} {importData.length === 1 ? 'entity' : 'entities'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[300px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Data Preview</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Namespace</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importData.slice(0, 10).map((entity, index) => (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="max-w-[300px] truncate font-mono text-xs">
                              {JSON.stringify(entity.data).substring(0, 100)}...
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {entity.entityTypeId || selectedEntityType || 'Not set'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {entity.namespace || selectedNamespace}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {importData.length > 10 && (
                      <div className="text-center text-sm text-muted-foreground mt-2">
                        And {importData.length - 10} more...
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button 
                      onClick={handleImport} 
                      disabled={isImporting || !selectedEntityType}
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import All
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setImportData([])
                        setJsonInput('')
                        setParseError(null)
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Import Results */}
            {importResults.length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Successfully imported {importResults.length} {importResults.length === 1 ? 'entity' : 'entities'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}