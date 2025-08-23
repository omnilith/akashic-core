'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Database, Link } from 'lucide-react';

interface DeleteConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: {
    name: string;
    entityCount?: number;
    relationTypesFrom?: any[];
    relationTypesTo?: any[];
  } | null;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteConfirmation({
  open,
  onOpenChange,
  entityType,
  onConfirm,
  loading,
}: DeleteConfirmationProps) {
  if (!entityType) return null;

  const totalRelations = (entityType.relationTypesFrom?.length || 0) + 
                         (entityType.relationTypesTo?.length || 0);
  const hasEntities = (entityType.entityCount || 0) > 0;
  const hasRelations = totalRelations > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Delete Entity Type: {entityType.name}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the entity type
            and its schema definition.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          {/* Impact Analysis */}
          {(hasEntities || hasRelations) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">Impact Analysis:</div>
                  {hasEntities && (
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>{entityType.entityCount} entities will be affected</span>
                    </div>
                  )}
                  {hasRelations && (
                    <div className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      <span>{totalRelations} relation types will be affected</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Warning for entities */}
          {hasEntities && (
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> Existing entities of this type will not be automatically
                deleted, but they will no longer have a valid type definition.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Deleting...' : 'Delete Entity Type'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}