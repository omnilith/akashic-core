// import Image from 'next/image';
// import styles from './page.module.css';

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to Akashic Core - Your ontology management platform
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Entity Types
              </p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Entities
              </p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Relation Types
              </p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Relations
              </p>
              <p className="text-2xl font-bold">-</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            • Create new Entity Type
          </p>
          <p className="text-sm text-muted-foreground">
            • Browse existing Entities
          </p>
          <p className="text-sm text-muted-foreground">
            • Define Relation Types
          </p>
          <p className="text-sm text-muted-foreground">• View system health</p>
        </div>
      </div>
    </div>
  );
}
