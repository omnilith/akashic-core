'use client'

import { useState } from 'react'
import { EntityList } from '@/components/entities/entity-list'
import { EntityForm } from '@/components/entities/entity-form'
import { EntityDetail } from '@/components/entities/entity-detail'
import { EntityImport } from '@/components/entities/entity-import'
import { QueryBuilder } from '@/components/entities/query-builder'
import { useCreateEntity, useUpdateEntity, useDeleteEntity } from '@/lib/graphql/hooks/useEntities'
import { useEntityTypes } from '@/lib/graphql/hooks/useEntityTypes'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

type ViewMode = 'list' | 'detail' | 'search' | 'import'

export default function EntitiesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedEntity, setSelectedEntity] = useState<any>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedEntityType, setSelectedEntityType] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState<any>({})
  
  const { toast } = useToast()
  const { entityTypes } = useEntityTypes()
  const { create } = useCreateEntity({
    onCompleted: () => {
      setCreateDialogOpen(false)
      toast({
        title: 'Success',
        description: 'Entity created successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const { update } = useUpdateEntity({
    onCompleted: () => {
      setEditDialogOpen(false)
      toast({
        title: 'Success',
        description: 'Entity updated successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const { remove } = useDeleteEntity({
    onCompleted: () => {
      setSelectedEntity(null)
      setViewMode('list')
      toast({
        title: 'Success',
        description: 'Entity deleted successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const handleCreateEntity = () => {
    if (entityTypes && entityTypes.length > 0) {
      setSelectedEntityType(entityTypes[0])
      setCreateDialogOpen(true)
    } else {
      toast({
        title: 'No Entity Types',
        description: 'Please create an entity type first',
        variant: 'destructive',
      })
    }
  }

  const handleEditEntity = (entity: any) => {
    setSelectedEntity(entity)
    const entityType = entityTypes?.find(t => t.id === entity.entityTypeId)
    setSelectedEntityType(entityType)
    setEditDialogOpen(true)
  }

  const handleViewEntity = (entity: any) => {
    setSelectedEntity(entity)
    setViewMode('detail')
  }

  const handleDeleteEntity = async (entity: any) => {
    await remove(entity.id)
  }

  const handleCreateSubmit = async (data: any) => {
    await create({
      entityTypeId: selectedEntityType.id,
      namespace: selectedEntityType.namespace || 'global',
      data,
      metadata: {}
    })
  }

  const handleEditSubmit = async (data: any) => {
    await update(selectedEntity.id, {
      data,
      metadata: selectedEntity.metadata || {}
    })
  }

  const handleSearch = (query: any) => {
    setSearchQuery(query)
    setViewMode('list')
  }

  const handleImportComplete = (count: number) => {
    toast({
      title: 'Import Complete',
      description: `Successfully imported ${count} entities`,
    })
    setViewMode('list')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Entities</h2>
          <p className="text-muted-foreground">
            Browse and manage your data instances
          </p>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="list">Browse</TabsTrigger>
          <TabsTrigger value="search">Advanced Search</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          {selectedEntity && (
            <TabsTrigger value="detail">Entity Detail</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <EntityList
            onCreateEntity={handleCreateEntity}
            onEditEntity={handleEditEntity}
            onViewEntity={handleViewEntity}
          />
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <QueryBuilder
            onSearch={handleSearch}
            entityType={selectedEntityType}
          />
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <EntityImport
            onImportComplete={handleImportComplete}
            defaultEntityTypeId={selectedEntityType?.id}
          />
        </TabsContent>

        {selectedEntity && (
          <TabsContent value="detail" className="mt-4">
            <EntityDetail
              entityId={selectedEntity.id}
              onEdit={handleEditEntity}
              onDelete={handleDeleteEntity}
              onNavigateToEntity={(id) => {
                setSelectedEntity({ id })
                setViewMode('detail')
              }}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Create Entity Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Entity</DialogTitle>
          </DialogHeader>
          {selectedEntityType && (
            <EntityForm
              entityType={selectedEntityType}
              onSubmit={handleCreateSubmit}
              onCancel={() => setCreateDialogOpen(false)}
              mode="create"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Entity Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Entity</DialogTitle>
          </DialogHeader>
          {selectedEntityType && selectedEntity && (
            <EntityForm
              entityType={selectedEntityType}
              initialData={selectedEntity}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditDialogOpen(false)}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}