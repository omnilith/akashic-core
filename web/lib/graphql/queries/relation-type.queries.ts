import { gql } from '@apollo/client';
import { 
  RELATION_TYPE_WITH_ENTITY_TYPES
} from '../fragments';

export const LIST_RELATION_TYPES = gql`
  query ListRelationTypes($filter: RelationTypeFilter, $limit: Int, $offset: Int) {
    relationTypes(filter: $filter, limit: $limit, offset: $offset) {
      ...RelationTypeWithEntityTypes
    }
  }
  ${RELATION_TYPE_WITH_ENTITY_TYPES}
`;

export const GET_RELATION_TYPE = gql`
  query GetRelationType($id: ID!) {
    relationType(id: $id) {
      ...RelationTypeWithEntityTypes
    }
  }
  ${RELATION_TYPE_WITH_ENTITY_TYPES}
`;

export const GET_RELATION_TYPES_FOR_ENTITY_TYPE = gql`
  query GetRelationTypesForEntityType($entityTypeId: ID!, $direction: RelationDirection) {
    relationTypesForEntityType(entityTypeId: $entityTypeId, direction: $direction) {
      ...RelationTypeWithEntityTypes
    }
  }
  ${RELATION_TYPE_WITH_ENTITY_TYPES}
`;