import { gql } from '@apollo/client';
import { 
  ENTITY_WITH_TYPE
} from '../fragments';

export const LIST_ENTITIES = gql`
  query ListEntities($namespace: String, $entityTypeId: String) {
    entities(namespace: $namespace, entityTypeId: $entityTypeId) {
      ...EntityWithType
    }
  }
  ${ENTITY_WITH_TYPE}
`;

// GET_ENTITY removed - backend doesn't have single entity query
// Use entities query and filter client-side instead

export const SEARCH_ENTITIES = gql`
  query SearchEntities($filter: EntityFilterInput!) {
    searchEntities(filter: $filter) {
      ...EntityWithType
    }
  }
  ${ENTITY_WITH_TYPE}
`;

export const GET_ENTITIES_BY_TYPE = gql`
  query GetEntitiesByType($entityTypeId: String!, $namespace: String) {
    entities(entityTypeId: $entityTypeId, namespace: $namespace) {
      ...EntityWithType
    }
  }
  ${ENTITY_WITH_TYPE}
`;