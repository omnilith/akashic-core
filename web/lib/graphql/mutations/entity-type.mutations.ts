import { gql } from '@apollo/client';
import { ENTITY_TYPE_FULL } from '../fragments';

export const CREATE_ENTITY_TYPE = gql`
  mutation CreateEntityType($input: CreateEntityTypeInput!) {
    createEntityType(input: $input) {
      ...EntityTypeFull
    }
  }
  ${ENTITY_TYPE_FULL}
`;

export const UPDATE_ENTITY_TYPE = gql`
  mutation UpdateEntityType($id: ID!, $input: UpdateEntityTypeInput!) {
    updateEntityType(id: $id, input: $input) {
      ...EntityTypeFull
    }
  }
  ${ENTITY_TYPE_FULL}
`;

export const DELETE_ENTITY_TYPE = gql`
  mutation DeleteEntityType($id: ID!) {
    deleteEntityType(id: $id) {
      id
      success
    }
  }
`;