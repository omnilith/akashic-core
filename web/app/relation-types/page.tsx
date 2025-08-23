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
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          Create Relation Type
        </button>
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