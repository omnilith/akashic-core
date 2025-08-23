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
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          Create Entity
        </button>
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