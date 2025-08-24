'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { EntityTypeList } from '@/components/entity-types/entity-type-list';
import { EntityTypeDetail } from '@/components/entity-types/entity-type-detail';
import { EntityTypeForm } from '@/components/entity-types/entity-type-form';
import { DeleteConfirmation } from '@/components/entity-types/delete-confirmation';
import {
  useEntityTypes,
  useEntityType,
  useCreateEntityType,
  useUpdateEntityType,
  useDeleteEntityType,
} from '@/lib/graphql/hooks/useEntityTypes';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus } from 'lucide-react';

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

export default function EntityTypesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedEntityTypeId, setSelectedEntityTypeId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [entityTypeToDelete, setEntityTypeToDelete] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // GraphQL hooks
  const { entityTypes, loading: listLoading, refetch: refetchList } = useEntityTypes();
  const { entityType, loading: detailLoading, refetch: refetchDetail } = useEntityType(
    selectedEntityTypeId || '',
    { skip: !selectedEntityTypeId }
  );
  const { create, loading: createLoading } = useCreateEntityType({
    onCompleted: () => {
      setViewMode('list');
      refetchList();
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
  });
  const { update, loading: updateLoading } = useUpdateEntityType({
    onCompleted: () => {
      setViewMode('detail');
      refetchDetail();
      refetchList();
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
  });
  const { remove, loading: deleteLoading } = useDeleteEntityType({
    onCompleted: () => {
      setDeleteConfirmOpen(false);
      setEntityTypeToDelete(null);
      setViewMode('list');
      setSelectedEntityTypeId(null);
      refetchList();
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  // Handlers
  const handleView = useCallback((et: any) => {
    setSelectedEntityTypeId(et.id);
    setViewMode('detail');
  }, []);

  const handleEdit = useCallback((et?: any) => {
    if (et) {
      setSelectedEntityTypeId(et.id);
    }
    setViewMode('edit');
  }, []);

  const handleDelete = useCallback((et: any) => {
    setEntityTypeToDelete(et);
    setDeleteConfirmOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setSelectedEntityTypeId(null);
    setViewMode('create');
  }, []);

  const handleBack = useCallback(() => {
    setViewMode('list');
    setSelectedEntityTypeId(null);
    setError(null);
  }, []);

  const handleCreateSubmit = useCallback(async (data: any) => {
    // Convert schemaJson to string for the backend
    const submitData = {
      name: data.name,
      namespace: data.namespace,
      schema: typeof data.schemaJson === 'string' ? data.schemaJson : JSON.stringify(data.schemaJson)
    };
    await create(submitData);
  }, [create]);

  const handleUpdateSubmit = useCallback(async (data: any) => {
    if (selectedEntityTypeId) {
      // Convert schemaJson to string for the backend
      const submitData = {
        name: data.name,
        namespace: data.namespace,
        schema: typeof data.schemaJson === 'string' ? data.schemaJson : JSON.stringify(data.schemaJson)
      };
      await update(selectedEntityTypeId, submitData);
    }
  }, [update, selectedEntityTypeId]);

  const handleDeleteConfirm = useCallback(async () => {
    if (entityTypeToDelete) {
      await remove(entityTypeToDelete.id);
    }
  }, [remove, entityTypeToDelete]);

  // Render content based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'list':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Entity Types</h2>
                <p className="text-muted-foreground">
                  Define and manage your data models
                </p>
              </div>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Entity Type
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <EntityTypeList
              entityTypes={entityTypes}
              loading={listLoading}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        );

      case 'detail':
        if (!entityType) {
          return (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">
                {detailLoading ? 'Loading entity type...' : 'Entity type not found'}
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBack}>
                Back to List
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <EntityTypeDetail
              entityType={entityType}
              onEdit={() => handleEdit(entityType)}
              onDelete={() => handleDelete(entityType)}
            />
          </div>
        );

      case 'create':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBack}>
                Back to List
              </Button>
              <h2 className="text-2xl font-bold">Create Entity Type</h2>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <EntityTypeForm
              onSubmit={handleCreateSubmit}
              onCancel={handleBack}
              loading={createLoading}
            />
          </div>
        );

      case 'edit':
        if (!entityType && selectedEntityTypeId) {
          return (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">
                {detailLoading ? 'Loading entity type...' : 'Entity type not found'}
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setViewMode('detail')}>
                Cancel
              </Button>
              <h2 className="text-2xl font-bold">Edit Entity Type</h2>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <EntityTypeForm
              initialData={entityType}
              onSubmit={handleUpdateSubmit}
              onCancel={() => setViewMode('detail')}
              loading={updateLoading}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {renderContent()}

      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        entityType={entityTypeToDelete}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </>
  );
}