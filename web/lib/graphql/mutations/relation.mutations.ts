import { gql } from '@apollo/client';
import { RELATION_WITH_ENTITIES } from '../fragments';

export const CREATE_RELATION = gql`
  mutation CreateRelation($input: CreateRelationInput!) {
    createRelation(input: $input) {
      ...RelationWithEntities
    }
  }
  ${RELATION_WITH_ENTITIES}
`;

export const UPDATE_RELATION = gql`
  mutation UpdateRelation($id: ID!, $input: UpdateRelationInput!) {
    updateRelation(id: $id, input: $input) {
      ...RelationWithEntities
    }
  }
  ${RELATION_WITH_ENTITIES}
`;

export const DELETE_RELATION = gql`
  mutation DeleteRelation($id: ID!) {
    deleteRelation(id: $id) {
      id
      success
    }
  }
`;

export const BULK_CREATE_RELATIONS = gql`
  mutation BulkCreateRelations($inputs: [CreateRelationInput!]!) {
    bulkCreateRelations(inputs: $inputs) {
      ...RelationWithEntities
    }
  }
  ${RELATION_WITH_ENTITIES}
`;