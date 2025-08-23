"use client";

import { useQuery } from "@apollo/experimental-nextjs-app-support/ssr";
import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import {
  LIST_RELATIONS,
  GET_RELATION,
  GET_ENTITY_RELATIONS,
  GET_RELATIONS_BY_TYPE,
} from "../queries/relation.queries";
import {
  CREATE_RELATION,
  UPDATE_RELATION,
  DELETE_RELATION,
  BULK_CREATE_RELATIONS,
} from "../mutations/relation.mutations";

interface Relation {
  id: string;
  relationTypeId: string;
  fromEntityId: string;
  toEntityId: string;
  data?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  relationType?: {
    id: string;
    name: string;
  };
  fromEntity?: any;
  toEntity?: any;
}

export interface UseRelationsOptions {
  filter?: any;
  limit?: number;
  offset?: number;
  skip?: boolean;
  onError?: (error: Error) => void;
  onCompleted?: (data: any) => void;
}

export function useRelations(options: UseRelationsOptions = {}) {
  const { filter, limit, offset, skip = false } = options;

  const { data, loading, error, refetch, fetchMore } = useQuery<{ relations: Relation[] }>(
    LIST_RELATIONS,
    {
      variables: { filter, limit, offset },
      skip,
      notifyOnNetworkStatusChange: true,
    }
  );

  const loadMore = useCallback(() => {
    if (!data?.relations) return;

    return fetchMore({
      variables: {
        offset: data.relations.length,
      },
      updateQuery: (prev: any, { fetchMoreResult }: any) => {
        if (!fetchMoreResult) return prev;
        return {
          ...prev,
          relations: [...prev.relations, ...fetchMoreResult.relations],
        };
      },
    });
  }, [data, fetchMore]);

  return {
    relations: data?.relations || [],
    loading,
    error,
    refetch,
    loadMore,
  };
}

export function useRelation(
  id: string,
  options: Omit<UseRelationsOptions, "filter" | "limit" | "offset"> = {}
) {
  const { skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{ relation: Relation }>(GET_RELATION, {
    variables: { id },
    skip: !id || skip,
  });

  return {
    relation: data?.relation,
    loading,
    error,
    refetch,
  };
}

export function useEntityRelations(
  entityId: string,
  direction?: "FROM" | "TO" | "BOTH",
  options: Omit<UseRelationsOptions, "filter"> = {}
) {
  const { skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{ entityRelations: Relation[] }>(GET_ENTITY_RELATIONS, {
    variables: { entityId, direction },
    skip: !entityId || skip,
  });

  return {
    relations: data?.entityRelations || [],
    loading,
    error,
    refetch,
  };
}

export function useRelationsByType(
  relationTypeId: string,
  options: UseRelationsOptions = {}
) {
  const { limit, offset, skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{ relations: Relation[] }>(GET_RELATIONS_BY_TYPE, {
    variables: { relationTypeId, limit, offset },
    skip: !relationTypeId || skip,
  });

  return {
    relations: data?.relations || [],
    loading,
    error,
    refetch,
  };
}

export function useCreateRelation(
  options: Pick<UseRelationsOptions, "onError" | "onCompleted"> = {}
) {
  const [createRelation, { loading, error }] = useMutation<any, any>(
    CREATE_RELATION,
    {
      onError: options.onError,
      onCompleted: options.onCompleted,
      refetchQueries: [{ query: LIST_RELATIONS }, "GetEntityRelations"],
    }
  );

  const create = useCallback(
    async (input: any) => {
      const { data } = await createRelation({ variables: { input } });
      return data?.createRelation;
    },
    [createRelation]
  );

  return {
    create,
    loading,
    error,
  };
}

export function useUpdateRelation(
  options: Pick<UseRelationsOptions, "onError" | "onCompleted"> = {}
) {
  const [updateRelation, { loading, error }] = useMutation<any, any>(
    UPDATE_RELATION,
    {
      onError: options.onError,
      onCompleted: options.onCompleted,
    }
  );

  const update = useCallback(
    async (id: string, input: any) => {
      const { data } = await updateRelation({
        variables: { id, input },
        optimisticResponse: {
          updateRelation: {
            __typename: "Relation",
            id,
            ...input,
          },
        },
      });
      return data?.updateRelation;
    },
    [updateRelation]
  );

  return {
    update,
    loading,
    error,
  };
}

export function useDeleteRelation(
  options: Pick<UseRelationsOptions, "onError" | "onCompleted"> = {}
) {
  const [deleteRelation, { loading, error }] = useMutation<any, any>(
    DELETE_RELATION,
    {
      onError: options.onError,
      onCompleted: options.onCompleted,
      refetchQueries: [{ query: LIST_RELATIONS }, "GetEntityRelations"],
    }
  );

  const remove = useCallback(
    async (id: string) => {
      const { data } = await deleteRelation({
        variables: { id },
        optimisticResponse: {
          deleteRelation: {
            __typename: "DeleteResult",
            id,
            success: true,
          },
        },
        update: (cache: any) => {
          cache.evict({ id: `Relation:${id}` });
          cache.gc();
        },
      });
      return data?.deleteRelation;
    },
    [deleteRelation]
  );

  return {
    remove,
    loading,
    error,
  };
}

export function useBulkCreateRelations(
  options: Pick<UseRelationsOptions, "onError" | "onCompleted"> = {}
) {
  const [bulkCreate, { loading, error }] = useMutation<any, any>(
    BULK_CREATE_RELATIONS,
    {
      onError: options.onError,
      onCompleted: options.onCompleted,
      refetchQueries: [{ query: LIST_RELATIONS }, "GetEntityRelations"],
    }
  );

  const createMany = useCallback(
    async (inputs: any[]) => {
      const { data } = await bulkCreate({ variables: { inputs } });
      return data?.bulkCreateRelations;
    },
    [bulkCreate]
  );

  return {
    createMany,
    loading,
    error,
  };
}
