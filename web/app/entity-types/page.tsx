'use client'

import { Button } from '@/components/ui/button'

export default function EntityTypesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Entity Types</h2>
          <p className="text-muted-foreground">
            Define and manage your data models
          </p>
        </div>
        <Button>
          Create Entity Type
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="p-6">
          <p className="text-center text-muted-foreground">
            No entity types found. Create your first entity type to get started.
          </p>
        </div>
      </div>
    </div>
  );
}