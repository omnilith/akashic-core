'use client'

import { Button } from '@/components/ui/button'

export default function EntitiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Entities</h2>
          <p className="text-muted-foreground">
            Browse and manage your data instances
          </p>
        </div>
        <Button>
          Create Entity
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="p-6">
          <p className="text-center text-muted-foreground">
            No entities found. Create entity types first, then add entities.
          </p>
        </div>
      </div>
    </div>
  );
}