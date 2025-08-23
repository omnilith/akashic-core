'use client';

import { useQuery } from '@apollo/experimental-nextjs-app-support/ssr';
import { useMutation } from '@apollo/client/react';

interface RelationType {
  id: string;
  name: string;
  fromEntityTypeId: string;
  toEntityTypeId: string;
  cardinality?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  fromEntityType?: {
    id: string;
    name: string;
    namespace: string;
  };
  toEntityType?: {
    id: string;
    name: string;
    namespace: string;
  };
}
import { useCallback } from 'react';
import { 
  LIST_RELATION_TYPES,
  GET_RELATION_TYPE,
  GET_RELATION_TYPES_FOR_ENTITY_TYPE
} from '../queries/relation-type.queries';
import {
  CREATE_RELATION_TYPE,
  UPDATE_RELATION_TYPE,
  DELETE_RELATION_TYPE
} from '../mutations/relation-type.mutations';

export interface UseRelationTypesOptions {
  filter?: any;
  limit?: number;
  offset?: number;
  skip?: boolean;
  onError?: (error: Error) => void;
  onCompleted?: (data: any) => void;
}

export function useRelationTypes(options: UseRelationTypesOptions = {}) {
  const { filter, limit, offset, skip = false } = options;
  
  const { data, loading, error, refetch } = useQuery<{ relationTypes: RelationType[] }>(LIST_RELATION_TYPES, {
    variables: { filter, limit, offset },
    skip,
    notifyOnNetworkStatusChange: true,
  });

  return {
    relationTypes: data?.relationTypes || [],
    loading,
    error,
    refetch,
  };
}

export function useRelationType(id: string, options: Omit<UseRelationTypesOptions, 'filter' | 'limit' | 'offset'> = {}) {
  const { skip = false } = options;
  
  const { data, loading, error, refetch } = useQuery<{ relationType: RelationType }>(GET_RELATION_TYPE, {
    variables: { id },
    skip: !id || skip,
  });

  return {
    relationType: data?.relationType,
    loading,
    error,
    refetch,
  };
}

export function useRelationTypesForEntityType(
  entityTypeId: string, 
  direction?: 'FROM' | 'TO' | 'BOTH',
  options: Omit<UseRelationTypesOptions, 'filter'> = {}
) {
  const { skip = false } = options;
  
  const { data, loading, error, refetch } = useQuery<{ relationTypesForEntityType: RelationType[] }>(GET_RELATION_TYPES_FOR_ENTITY_TYPE, {
    variables: { entityTypeId, direction },
    skip: !entityTypeId || skip,
  });

  return {
    relationTypes: data?.relationTypesForEntityType || [],
    loading,
    error,
    refetch,
  };
}

export function useCreateRelationType(options: Pick<UseRelationTypesOptions, 'onError' | 'onCompleted'> = {}) {
  const [createRelationType, { loading, error }] = useMutation<any, any>(CREATE_RELATION_TYPE, {
    onError: options.onError,
    onCompleted: options.onCompleted,
    refetchQueries: [{ query: LIST_RELATION_TYPES }],
  });

  const create = useCallback(async (input: any) => {
    const { data } = await createRelationType({ variables: { input } });
    return data?.createRelationType;
  }, [createRelationType]);

  return {
    create,
    loading,
    error,
  };
}

export function useUpdateRelationType(options: Pick<UseRelationTypesOptions, 'onError' | 'onCompleted'> = {}) {
  const [updateRelationType, { loading, error }] = useMutation<any, any>(UPDATE_RELATION_TYPE, {
    onError: options.onError,
    onCompleted: options.onCompleted,
  });

  const update = useCallback(async (id: string, input: any) => {
    const { data } = await updateRelationType({ 
      variables: { id, input },
      optimisticResponse: {
        updateRelationType: {
          __typename: 'RelationType',
          id,
          ...input,
        },
      },
    });
    return data?.updateRelationType;
  }, [updateRelationType]);

  return {
    update,
    loading,
    error,
  };
}

export function useDeleteRelationType(options: Pick<UseRelationTypesOptions, 'onError' | 'onCompleted'> = {}) {
  const [deleteRelationType, { loading, error }] = useMutation<any, any>(DELETE_RELATION_TYPE, {
    onError: options.onError,
    onCompleted: options.onCompleted,
    refetchQueries: [{ query: LIST_RELATION_TYPES }],
  });

  const remove = useCallback(async (id: string) => {
    const { data } = await deleteRelationType({ 
      variables: { id },
      optimisticResponse: {
        deleteRelationType: {
          __typename: 'DeleteResult',
          id,
          success: true,
        },
      },
      update: (cache: any) => {
        cache.evict({ id: `RelationType:${id}` });
        cache.gc();
      },
    });
    return data?.deleteRelationType;
  }, [deleteRelationType]);

  return {
    remove,
    loading,
    error,
  };
}