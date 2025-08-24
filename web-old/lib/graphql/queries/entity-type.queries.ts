import { gql } from '@apollo/client';
import { 
  ENTITY_TYPE_WITH_STATS,
  ENTITY_TYPE_FULL 
} from '../fragments';

export const LIST_ENTITY_TYPES = gql`
  query ListEntityTypes($namespace: String) {
    entityTypes(namespace: $namespace) {
      ...EntityTypeWithStats
    }
  }
  ${ENTITY_TYPE_WITH_STATS}
`;

export const GET_ENTITY_TYPE = gql`
  query GetEntityType($id: ID!) {
    entityType(id: $id) {
      ...EntityTypeFull
    }
  }
  ${ENTITY_TYPE_FULL}
`;

export const SEARCH_ENTITY_TYPES = gql`
  query SearchEntityTypes($filter: EntityTypeFilter) {
    entityTypes(filter: $filter) {
      ...EntityTypeWithStats
    }
  }
  ${ENTITY_TYPE_WITH_STATS}
`;