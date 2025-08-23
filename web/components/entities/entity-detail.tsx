'use client'

import { useState, useEffect } from 'react'
import { useEnrichedEntity } from '@/lib/graphql/hooks/useEnrichedEntities'
import { useRelations } from '@/lib/graphql/hooks/useRelations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { 
  Copy, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  Hash, 
  Database,
  Link,
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react'

interface EntityDetailProps {
  entityId: string
  onEdit?: (entity: any) => void
  onDelete?: (entity: any) => void
  onNavigateToEntity?: (entityId: string) => void
  onCreateRelation?: (fromId: string) => void
}

export function EntityDetail({
  entityId,
  onEdit,
  onDelete,
  onNavigateToEntity,
  onCreateRelation
}: EntityDetailProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const { entity, loading, error, refetch } = useEnrichedEntity(entityId)
  const { relations: outgoingRelations, loading: loadingOut } = useRelations({
    filter: { fromEntityId: entityId }
  })
  const { relations: incomingRelations, loading: loadingIn } = useRelations({
    filter: { toEntityId: entityId }
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const exportEntity = () => {
    if (!entity) return
    const exportData = {
      id: entity.id,
      namespace: entity.namespace,
      entityTypeId: entity.entityTypeId,
      data: entity.data,
      metadata: entity.metadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `entity-${entity.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderJsonValue = (value: any, depth: number = 0): JSX.Element => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">null</span>
    }

    if (typeof value === 'boolean') {
      return <Badge variant={value ? 'default' : 'secondary'}>{String(value)}</Badge>
    }

    if (typeof value === 'number') {
      return <span className="font-mono">{value}</span>
    }

    if (typeof value === 'string') {
      if (value.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/)) {
        return (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(value).toLocaleString()}
          </span>
        )
      }
      if (value.match(/^https?:\/\//)) {
        return (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
            {value}
            <ExternalLink className="h-3 w-3" />
          </a>
        )
      }
      return <span>{value}</span>
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground">[]</span>
      }
      return (
        <div className="space-y-1">
          {value.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-muted-foreground text-xs mt-0.5">[{index}]</span>
              <div className="flex-1">{renderJsonValue(item, depth + 1)}</div>
            </div>
          ))}
        </div>
      )
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value)
      if (entries.length === 0) {
        return <span className="text-muted-foreground">{'{}'}</span>
      }
      return (
        <div className="space-y-2">
          {entries.map(([key, val]) => (
            <div key={key} className="grid grid-cols-3 gap-2">
              <div className="font-medium text-sm">{key}:</div>
              <div className="col-span-2">{renderJsonValue(val, depth + 1)}</div>
            </div>
          ))}
        </div>
      )
    }

    return <span>{JSON.stringify(value)}</span>
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading entity details...</div>
        </CardContent>
      </Card>
    )
  }

  if (error || !entity) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error ? error.message : 'Entity not found'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                Entity Details
                <Badge variant="outline">{entity.entityType?.name || entity.entityTypeId}</Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {entity.id}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(entity.id)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportEntity}
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              {onCreateRelation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateRelation(entity.id)}
                >
                  <Link className="h-4 w-4 mr-1" />
                  Add Relation
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(entity)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => onDelete(entity)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Tabs */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-6 pt-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="relations">
                  Relations
                  <Badge variant="secondary" className="ml-2">
                    {(outgoingRelations?.length || 0) + (incomingRelations?.length || 0)}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="overview" className="mt-0">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Namespace</Label>
                      <div className="mt-1">
                        <Badge>{entity.namespace}</Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Entity Type</Label>
                      <div className="mt-1">
                        <Badge variant="outline">
                          {entity.entityType?.name || entity.entityTypeId}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <div className="mt-1 flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(entity.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Updated</Label>
                      <div className="mt-1 flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(entity.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {entity.entityType?.description && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-muted-foreground">Type Description</Label>
                        <p className="mt-1 text-sm">{entity.entityType.description}</p>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="data" className="mt-0">
                <div className="space-y-4">
                  {entity.data && Object.keys(entity.data).length > 0 ? (
                    renderJsonValue(entity.data)
                  ) : (
                    <div className="text-muted-foreground text-center py-8">
                      No data fields
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="relations" className="mt-0">
                <div className="space-y-6">
                  {/* Outgoing Relations */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      Outgoing Relations
                      <Badge variant="secondary">{outgoingRelations?.length || 0}</Badge>
                    </h4>
                    {outgoingRelations && outgoingRelations.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>To Entity</TableHead>
                            <TableHead>Namespace</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outgoingRelations.map((relation: any) => (
                            <TableRow key={relation.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  {relation.relationType?.name || relation.relationTypeId}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {relation.toEntityId.substring(0, 8)}...
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{relation.namespace}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {relation.data ? JSON.stringify(relation.data) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {onNavigateToEntity && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onNavigateToEntity(relation.toEntityId)}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-muted-foreground text-center py-4 border rounded">
                        No outgoing relations
                      </div>
                    )}
                  </div>

                  {/* Incoming Relations */}
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      Incoming Relations
                      <Badge variant="secondary">{incomingRelations?.length || 0}</Badge>
                    </h4>
                    {incomingRelations && incomingRelations.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>From Entity</TableHead>
                            <TableHead>Namespace</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomingRelations.map((relation: any) => (
                            <TableRow key={relation.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  {relation.relationType?.name || relation.relationTypeId}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {relation.fromEntityId.substring(0, 8)}...
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{relation.namespace}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {relation.data ? JSON.stringify(relation.data) : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {onNavigateToEntity && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onNavigateToEntity(relation.fromEntityId)}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-muted-foreground text-center py-4 border rounded">
                        No incoming relations
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="metadata" className="mt-0">
                <div className="space-y-4">
                  {entity.metadata && Object.keys(entity.metadata).length > 0 ? (
                    renderJsonValue(entity.metadata)
                  ) : (
                    <div className="text-muted-foreground text-center py-8">
                      No metadata
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="raw" className="mt-0">
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute right-0 top-0"
                    onClick={() => copyToClipboard(JSON.stringify(entity, null, 2))}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <pre className="bg-muted p-4 rounded overflow-auto max-h-[500px] text-xs">
                    {JSON.stringify(entity, null, 2)}
                  </pre>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function Label({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`text-sm font-medium ${className}`}>{children}</div>
}