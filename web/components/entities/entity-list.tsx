'use client'

import { useState, useEffect, useMemo } from 'react'
import { useEnrichedEntities } from '@/lib/graphql/hooks/useEnrichedEntities'
import { useDeleteEntity } from '@/lib/graphql/hooks/useEntities'
import { useEntityTypes } from '@/lib/graphql/hooks/useEntityTypes'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Trash2, Edit, Eye, MoreHorizontal, Search, Filter, Download, Upload, Copy, CheckSquare, Square } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface EntityListProps {
  namespace?: string
  entityTypeId?: string
  onCreateEntity?: () => void
  onEditEntity?: (entity: any) => void
  onViewEntity?: (entity: any) => void
}

export function EntityList({
  namespace,
  entityTypeId,
  onCreateEntity,
  onEditEntity,
  onViewEntity
}: EntityListProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState(entityTypeId || 'all')
  const [selectedNamespace, setSelectedNamespace] = useState(namespace || 'all')
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set())
  const [deleteEntityId, setDeleteEntityId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const filter = useMemo(() => {
    const conditions: any = {}
    if (selectedType && selectedType !== 'all') {
      conditions.entityTypeId = selectedType
    }
    if (selectedNamespace && selectedNamespace !== 'all') {
      conditions.namespace = selectedNamespace
    }
    if (searchTerm) {
      conditions.data = { $regex: searchTerm }
    }
    return Object.keys(conditions).length > 0 ? conditions : undefined
  }, [selectedType, selectedNamespace, searchTerm])

  const { entities, loading, error, refetch, loadMore } = useEnrichedEntities({
    filter,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize
  })

  const { entityTypes } = useEntityTypes()
  const { remove: deleteEntity } = useDeleteEntity({
    onCompleted: () => {
      setDeleteEntityId(null)
      refetch()
    }
  })

  const handleDelete = async () => {
    if (deleteEntityId) {
      await deleteEntity(deleteEntityId)
    }
  }

  const handleBulkDelete = async () => {
    for (const id of selectedEntities) {
      await deleteEntity(id)
    }
    setSelectedEntities(new Set())
  }

  const handleExport = () => {
    const exportData = entities
      .filter(e => selectedEntities.size === 0 || selectedEntities.has(e.id))
      .map(e => ({
        id: e.id,
        namespace: e.namespace,
        entityTypeId: e.entityTypeId,
        data: e.data,
        metadata: e.metadata
      }))
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `entities-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedEntities)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedEntities(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedEntities.size === entities.length) {
      setSelectedEntities(new Set())
    } else {
      setSelectedEntities(new Set(entities.map(e => e.id)))
    }
  }

  const getEntityTypeById = (typeId: string) => {
    return entityTypes?.find(t => t.id === typeId)
  }

  const getDisplayValue = (data: any) => {
    if (!data) return '-'
    if (typeof data === 'string') return data
    if (typeof data === 'number' || typeof data === 'boolean') return String(data)
    
    // Try to find a meaningful display field
    const displayFields = ['name', 'title', 'label', 'id', 'key']
    for (const field of displayFields) {
      if (data[field]) {
        return String(data[field])
      }
    }
    
    // Fallback to showing first non-null value or JSON
    const firstValue = Object.values(data).find(v => v != null)
    if (firstValue && typeof firstValue !== 'object') {
      return String(firstValue)
    }
    
    return JSON.stringify(data).substring(0, 50) + '...'
  }

  if (loading && !entities.length) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading entities...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">Error loading entities: {error.message}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Entity Management</CardTitle>
              <CardDescription>
                {entities.length} {entities.length === 1 ? 'entity' : 'entities'} found
                {selectedEntities.size > 0 && ` (${selectedEntities.size} selected)`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedEntities.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export Selected
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                </>
              )}
              <Button onClick={onCreateEntity}>
                Create Entity
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {entityTypes?.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedNamespace} onValueChange={setSelectedNamespace}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Namespace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Namespaces</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="test">Test</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Entity Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-8 w-8 p-0"
                >
                  {selectedEntities.size === entities.length && entities.length > 0 ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Namespace</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No entities found. Try adjusting your filters or create a new entity.
                </TableCell>
              </TableRow>
            ) : (
              entities.map((entity) => {
                const entityType = getEntityTypeById(entity.entityTypeId)
                return (
                  <TableRow key={entity.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSelection(entity.id)}
                        className="h-8 w-8 p-0"
                      >
                        {selectedEntities.has(entity.id) ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entity.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {entityType?.name || entity.entityTypeId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {entity.namespace}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {getDisplayValue(entity.data)}
                    </TableCell>
                    <TableCell>
                      {new Date(entity.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onViewEntity?.(entity)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditEntity?.(entity)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            navigator.clipboard.writeText(entity.id)
                          }}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy ID
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteEntityId(entity.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {entities.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                loadMore()
                setCurrentPage(p => p + 1)
              }}
              disabled={entities.length < pageSize}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteEntityId} onOpenChange={() => setDeleteEntityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}