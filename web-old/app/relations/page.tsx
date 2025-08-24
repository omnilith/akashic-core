'use client'

import { Button } from '@/components/ui/button'

export default function RelationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relations</h2>
          <p className="text-muted-foreground">
            View and manage connections between entities
          </p>
        </div>
        <Button>
          Create Relation
        </Button>
      </div>

      <div className="rounded-lg border">
        <div className="p-6">
          <p className="text-center text-muted-foreground">
            No relations found. Create entities and relation types first.
          </p>
        </div>
      </div>
    </div>
  );
}