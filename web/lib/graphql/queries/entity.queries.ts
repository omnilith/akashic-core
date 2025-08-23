import { gql } from '@apollo/client';
import { 
  ENTITY_WITH_TYPE,
  ENTITY_FULL
} from '../fragments';

export const LIST_ENTITIES = gql`
  query ListEntities($filter: EntityFilter, $limit: Int, $offset: Int) {
    entities(filter: $filter, limit: $limit, offset: $offset) {
      ...EntityWithType
    }
  }
  ${ENTITY_WITH_TYPE}
`;

export const GET_ENTITY = gql`
  query GetEntity($id: ID!) {
    entity(id: $id) {
      ...EntityFull
    }
  }
  ${ENTITY_FULL}
`;

export const SEARCH_ENTITIES = gql`
  query SearchEntities($filter: EntityFilter, $query: JSON, $limit: Int, $offset: Int) {
    entities(filter: $filter, query: $query, limit: $limit, offset: $offset) {
      ...EntityWithType
    }
  }
  ${ENTITY_WITH_TYPE}
`;

export const GET_ENTITIES_BY_TYPE = gql`
  query GetEntitiesByType($entityTypeId: ID!, $namespace: String, $limit: Int, $offset: Int) {
    entities(filter: { entityTypeId: $entityTypeId, namespace: $namespace }, limit: $limit, offset: $offset) {
      ...EntityWithType
    }
  }
  ${ENTITY_WITH_TYPE}
`;