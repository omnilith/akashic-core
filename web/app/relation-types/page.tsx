'use client'

import { Button } from '@/components/ui/button'

export default function RelationTypesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relation Types</h2>
          <p className="text-muted-foreground">
            Define allowed connections between entity types
          </p>
        </div>
        <Button>
          Create Relation Type
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="p-6">
          <p className="text-center text-muted-foreground">
            No relation types defined. Create relation types to connect entities.
          </p>
        </div>
      </div>
    </div>
  );
}