import { gql } from '@apollo/client';
import { 
  RELATION_WITH_ENTITIES
} from '../fragments';

export const LIST_RELATIONS = gql`
  query ListRelations($filter: RelationFilter, $limit: Int, $offset: Int) {
    relations(filter: $filter, limit: $limit, offset: $offset) {
      ...RelationWithEntities
    }
  }
  ${RELATION_WITH_ENTITIES}
`;

export const GET_RELATION = gql`
  query GetRelation($id: ID!) {
    relation(id: $id) {
      ...RelationWithEntities
    }
  }
  ${RELATION_WITH_ENTITIES}
`;

export const GET_ENTITY_RELATIONS = gql`
  query GetEntityRelations($entityId: ID!, $direction: RelationDirection) {
    entityRelations(entityId: $entityId, direction: $direction) {
      ...RelationWithEntities
    }
  }
  ${RELATION_WITH_ENTITIES}
`;

export const GET_RELATIONS_BY_TYPE = gql`
  query GetRelationsByType($relationTypeId: ID!, $limit: Int, $offset: Int) {
    relations(filter: { relationTypeId: $relationTypeId }, limit: $limit, offset: $offset) {
      ...RelationWithEntities
    }
  }
  ${RELATION_WITH_ENTITIES}
`;