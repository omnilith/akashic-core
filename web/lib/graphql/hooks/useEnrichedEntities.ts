'use client';

import { useMemo } from 'react';
import { useEntities } from './useEntities';
import { useEntityTypes } from './useEntityTypes';

interface EnrichedEntity {
  id: string;
  namespace: string;
  entityTypeId: string;
  data: any;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  entityType?: {
    id: string;
    name: string;
    namespace: string;
    schemaJson: any;
  };
}

export function useEnrichedEntities(options: any = {}) {
  const { entities, loading: entitiesLoading, error: entitiesError, refetch, loadMore } = useEntities(options);
  const { entityTypes, loading: typesLoading } = useEntityTypes();

  const enrichedEntities = useMemo(() => {
    if (!entities) return [];
    
    if (entityTypes && entityTypes.length > 0) {
      // Create a map of entity types for quick lookup
      const typeMap = new Map(entityTypes.map(t => [t.id, t]));
      
      // Enrich entities with their types
      return entities.map(entity => ({
        ...entity,
        entityType: typeMap.get(entity.entityTypeId),
        metadata: {} // Add empty metadata since backend doesn't have it
      }));
    } else {
      // If we have entities but no types yet, just add empty metadata
      return entities.map(entity => ({
        ...entity,
        metadata: {}
      }));
    }
  }, [entities, entityTypes]);

  return {
    entities: enrichedEntities,
    loading: entitiesLoading || typesLoading,
    error: entitiesError,
    refetch,
    loadMore
  };
}

export function useEnrichedEntity(id: string) {
  const { entities, loading: entitiesLoading, refetch } = useEntities();
  const { entityTypes, loading: typesLoading } = useEntityTypes();

  const entity = useMemo(() => {
    if (!entities || !entityTypes || !id) return null;
    
    const foundEntity = entities.find(e => e.id === id);
    if (!foundEntity) return null;
    
    const entityType = entityTypes.find(t => t.id === foundEntity.entityTypeId);
    return {
      ...foundEntity,
      entityType,
      metadata: {}
    };
  }, [entities, entityTypes, id]);

  return {
    entity,
    loading: entitiesLoading || typesLoading,
    error: null,
    refetch
  };
}