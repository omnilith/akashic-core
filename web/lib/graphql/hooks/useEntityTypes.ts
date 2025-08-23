"use client";

import { useQuery } from "@apollo/experimental-nextjs-app-support/ssr";
import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import {
  LIST_ENTITY_TYPES,
  GET_ENTITY_TYPE,
} from "../queries/entity-type.queries";
import {
  CREATE_ENTITY_TYPE,
  UPDATE_ENTITY_TYPE,
  DELETE_ENTITY_TYPE,
} from "../mutations/entity-type.mutations";

export interface UseEntityTypesOptions {
  namespace?: string;
  skip?: boolean;
  onError?: (error: Error) => void;
  onCompleted?: (data: any) => void;
}

interface EntityType {
  id: string;
  name: string;
  namespace: string;
  schemaJson: any;
  metadata?: any;
  entityCount?: number;
  createdAt: string;
  updatedAt: string;
}

export function useEntityTypes(options: UseEntityTypesOptions = {}) {
  const { namespace, skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{ entityTypes: EntityType[] }>(LIST_ENTITY_TYPES, {
    variables: { namespace },
    skip,
    notifyOnNetworkStatusChange: true,
  });

  return {
    entityTypes: data?.entityTypes || [],
    loading,
    error,
    refetch,
  };
}

export function useEntityType(
  id: string,
  options: Omit<UseEntityTypesOptions, "namespace"> = {}
) {
  const { skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{ entityType: EntityType }>(GET_ENTITY_TYPE, {
    variables: { id },
    skip: !id || skip,
  });

  return {
    entityType: data?.entityType,
    loading,
    error,
    refetch,
  };
}

// Search can be done using the useEntityTypes hook with filters

export function useCreateEntityType(
  options: Pick<UseEntityTypesOptions, "onError" | "onCompleted"> = {}
) {
  const [createEntityType, { loading, error }] = useMutation<any, any>(
    CREATE_ENTITY_TYPE,
    {
      onError: options.onError,
      onCompleted: options.onCompleted,
      refetchQueries: [{ query: LIST_ENTITY_TYPES }],
      awaitRefetchQueries: true,
    }
  );

  const create = useCallback(
    async (input: any) => {
      const { data } = await createEntityType({ variables: { input } });
      return data?.createEntityType;
    },
    [createEntityType]
  );

  return {
    create,
    loading,
    error,
  };
}

export function useUpdateEntityType(
  options: Pick<UseEntityTypesOptions, "onError" | "onCompleted"> = {}
) {
  const [updateEntityType, { loading, error }] = useMutation<any, any>(
    UPDATE_ENTITY_TYPE,
    {
      onError: options.onError,
      onCompleted: options.onCompleted,
    }
  );

  const update = useCallback(
    async (id: string, input: any) => {
      const { data } = await updateEntityType({
        variables: { id, input },
        optimisticResponse: {
          updateEntityType: {
            __typename: "EntityType",
            id,
            ...input,
          },
        },
      });
      return data?.updateEntityType;
    },
    [updateEntityType]
  );

  return {
    update,
    loading,
    error,
  };
}

export function useDeleteEntityType(
  options: Pick<UseEntityTypesOptions, "onError" | "onCompleted"> = {}
) {
  const [deleteEntityType, { loading, error }] = useMutation<any, any>(
    DELETE_ENTITY_TYPE,
    {
      onError: options.onError,
      onCompleted: options.onCompleted,
      refetchQueries: [{ query: LIST_ENTITY_TYPES }],
      awaitRefetchQueries: true,
    }
  );

  const remove = useCallback(
    async (id: string) => {
      const { data } = await deleteEntityType({
        variables: { id },
        optimisticResponse: {
          deleteEntityType: {
            __typename: "DeleteResult",
            id,
            success: true,
          },
        },
        update: (cache: any) => {
          cache.evict({ id: `EntityType:${id}` });
          cache.gc();
        },
      });
      return data?.deleteEntityType;
    },
    [deleteEntityType]
  );

  return {
    remove,
    loading,
    error,
  };
}
