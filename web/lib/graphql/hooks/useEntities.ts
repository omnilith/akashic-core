'use client';

import { useQuery } from '@apollo/experimental-nextjs-app-support/ssr';
import { useMutation } from '@apollo/client/react';
import { useCallback } from 'react';
import { 
  LIST_ENTITIES,
  GET_ENTITY,
  GET_ENTITIES_BY_TYPE
} from '../queries/entity.queries';
import {
  CREATE_ENTITY,
  UPDATE_ENTITY,
  DELETE_ENTITY,
  BULK_CREATE_ENTITIES,
  BULK_UPDATE_ENTITIES
} from '../mutations/entity.mutations';

interface Entity {
  id: string;
  namespace: string;
  entityTypeId: string;
  data: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  entityType?: {
    id: string;
    name: string;
    namespace: string;
    schemaJson: any;
  };
}

export interface UseEntitiesOptions {
  filter?: any;
  limit?: number;
  offset?: number;
  skip?: boolean;
  onError?: (error: Error) => void;
  onCompleted?: (data: any) => void;
}

export function useEntities(options: UseEntitiesOptions = {}) {
  const { filter, limit, offset, skip = false } = options;
  
  const { data, loading, error, refetch, fetchMore } = useQuery<{ entities: Entity[] }>(LIST_ENTITIES, {
    variables: { filter, limit, offset },
    skip,
    notifyOnNetworkStatusChange: true,
  });

  const loadMore = useCallback(() => {
    if (!data?.entities) return;
    
    return fetchMore({
      variables: {
        offset: data.entities.length,
      },
      updateQuery: (prev: any, { fetchMoreResult }: any) => {
        if (!fetchMoreResult) return prev;
        return {
          ...prev,
          entities: [...prev.entities, ...fetchMoreResult.entities],
        };
      },
    });
  }, [data, fetchMore]);

  return {
    entities: data?.entities || [],
    loading,
    error,
    refetch,
    loadMore,
  };
}

export function useEntity(id: string, options: Omit<UseEntitiesOptions, 'filter' | 'limit' | 'offset'> = {}) {
  const { skip = false } = options;
  
  const { data, loading, error, refetch } = useQuery<{ entity: Entity }>(GET_ENTITY, {
    variables: { id },
    skip: !id || skip,
  });

  return {
    entity: data?.entity,
    loading,
    error,
    refetch,
  };
}

export function useEntitiesByType(entityTypeId: string, options: UseEntitiesOptions = {}) {
  const { limit, offset, skip = false } = options;
  
  const { data, loading, error, refetch, fetchMore } = useQuery<{ entities: Entity[] }>(GET_ENTITIES_BY_TYPE, {
    variables: { entityTypeId, limit, offset },
    skip: !entityTypeId || skip,
    notifyOnNetworkStatusChange: true,
  });

  const loadMore = useCallback(() => {
    if (!data?.entities) return;
    
    return fetchMore({
      variables: {
        offset: data.entities.length,
      },
    });
  }, [data, fetchMore]);

  return {
    entities: data?.entities || [],
    loading,
    error,
    refetch,
    loadMore,
  };
}

// Search can be done using the useEntities hook with filters and query parameters

export function useCreateEntity(options: Pick<UseEntitiesOptions, 'onError' | 'onCompleted'> = {}) {
  const [createEntity, { loading, error }] = useMutation<any, any>(CREATE_ENTITY, {
    onError: options.onError,
    onCompleted: options.onCompleted,
    refetchQueries: [{ query: LIST_ENTITIES }],
  });

  const create = useCallback(async (input: any) => {
    const { data } = await createEntity({ variables: { input } });
    return data?.createEntity;
  }, [createEntity]);

  return {
    create,
    loading,
    error,
  };
}

export function useUpdateEntity(options: Pick<UseEntitiesOptions, 'onError' | 'onCompleted'> = {}) {
  const [updateEntity, { loading, error }] = useMutation<any, any>(UPDATE_ENTITY, {
    onError: options.onError,
    onCompleted: options.onCompleted,
  });

  const update = useCallback(async (id: string, input: any) => {
    const { data } = await updateEntity({ 
      variables: { id, input },
      optimisticResponse: {
        updateEntity: {
          __typename: 'Entity',
          id,
          ...input,
        },
      },
    });
    return data?.updateEntity;
  }, [updateEntity]);

  return {
    update,
    loading,
    error,
  };
}

export function useDeleteEntity(options: Pick<UseEntitiesOptions, 'onError' | 'onCompleted'> = {}) {
  const [deleteEntity, { loading, error }] = useMutation<any, any>(DELETE_ENTITY, {
    onError: options.onError,
    onCompleted: options.onCompleted,
    refetchQueries: [{ query: LIST_ENTITIES }],
  });

  const remove = useCallback(async (id: string) => {
    const { data } = await deleteEntity({ 
      variables: { id },
      optimisticResponse: {
        deleteEntity: {
          __typename: 'DeleteResult',
          id,
          success: true,
        },
      },
      update: (cache: any) => {
        cache.evict({ id: `Entity:${id}` });
        cache.gc();
      },
    });
    return data?.deleteEntity;
  }, [deleteEntity]);

  return {
    remove,
    loading,
    error,
  };
}

export function useBulkCreateEntities(options: Pick<UseEntitiesOptions, 'onError' | 'onCompleted'> = {}) {
  const [bulkCreate, { loading, error }] = useMutation<any, any>(BULK_CREATE_ENTITIES, {
    onError: options.onError,
    onCompleted: options.onCompleted,
    refetchQueries: [{ query: LIST_ENTITIES }],
  });

  const createMany = useCallback(async (inputs: any[]) => {
    const { data } = await bulkCreate({ variables: { inputs } });
    return data?.bulkCreateEntities;
  }, [bulkCreate]);

  return {
    createMany,
    loading,
    error,
  };
}

export function useBulkUpdateEntities(options: Pick<UseEntitiesOptions, 'onError' | 'onCompleted'> = {}) {
  const [bulkUpdate, { loading, error }] = useMutation<any, any>(BULK_UPDATE_ENTITIES, {
    onError: options.onError,
    onCompleted: options.onCompleted,
    refetchQueries: [{ query: LIST_ENTITIES }],
  });

  const updateMany = useCallback(async (updates: any[]) => {
    const { data } = await bulkUpdate({ variables: { updates } });
    return data?.bulkUpdateEntities;
  }, [bulkUpdate]);

  return {
    updateMany,
    loading,
    error,
  };
}