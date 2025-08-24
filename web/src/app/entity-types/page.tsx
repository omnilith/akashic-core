'use client';

import { GET_ENTITY_TYPES, type EntityType } from '@/lib/queries/entity-types';
import { useQuery } from '@apollo/client/react';

export default function EntityTypesPage() {
  const { data, error } = useQuery<{ entityTypes: EntityType[] }>(
    GET_ENTITY_TYPES,
  );

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Error loading entity types:</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const entityTypes = data?.entityTypes || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Entity Types</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your ontology definitions and schemas
        </p>
      </div>

      {entityTypes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No entity types found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {entityTypes.map((type: EntityType) => (
            <div
              key={type.id}
              className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{type.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {type.namespace} • Version {type.version}
                  </p>
                  {type.description && (
                    <p className="mt-2 text-sm">{type.description}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {type.id.substring(0, 8)}...
                </div>
              </div>

              {type.schemaJson?.properties && (
                <div className="mt-3 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Fields ({Object.keys(type.schemaJson.properties).length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(type.schemaJson.properties)
                      .slice(0, 5)
                      .map((field) => (
                        <span
                          key={field}
                          className="inline-block rounded bg-muted px-2 py-0.5 text-xs"
                        >
                          {field}
                        </span>
                      ))}
                    {Object.keys(type.schemaJson.properties).length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{Object.keys(type.schemaJson.properties).length - 5}{' '}
                        more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
