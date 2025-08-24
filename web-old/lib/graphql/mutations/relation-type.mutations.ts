import { gql } from '@apollo/client';
import { RELATION_TYPE_WITH_ENTITY_TYPES } from '../fragments';

export const CREATE_RELATION_TYPE = gql`
  mutation CreateRelationType($input: CreateRelationTypeInput!) {
    createRelationType(input: $input) {
      ...RelationTypeWithEntityTypes
    }
  }
  ${RELATION_TYPE_WITH_ENTITY_TYPES}
`;

export const UPDATE_RELATION_TYPE = gql`
  mutation UpdateRelationType($id: ID!, $input: UpdateRelationTypeInput!) {
    updateRelationType(id: $id, input: $input) {
      ...RelationTypeWithEntityTypes
    }
  }
  ${RELATION_TYPE_WITH_ENTITY_TYPES}
`;

export const DELETE_RELATION_TYPE = gql`
  mutation DeleteRelationType($id: ID!) {
    deleteRelationType(id: $id) {
      id
      success
    }
  }
`;