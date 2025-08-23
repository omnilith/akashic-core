import { gql } from '@apollo/client';
import { ENTITY_FULL, ENTITY_WITH_TYPE } from '../fragments';

export const CREATE_ENTITY = gql`
  mutation CreateEntity($input: CreateEntityInput!) {
    createEntity(input: $input) {
      ...EntityWithType
    }
  }
  ${ENTITY_WITH_TYPE}
`;

export const UPDATE_ENTITY = gql`
  mutation UpdateEntity($id: ID!, $input: UpdateEntityInput!) {
    updateEntity(id: $id, input: $input) {
      ...EntityFull
    }
  }
  ${ENTITY_FULL}
`;

export const DELETE_ENTITY = gql`
  mutation DeleteEntity($id: ID!) {
    deleteEntity(id: $id) {
      id
      success
    }
  }
`;

export const BULK_CREATE_ENTITIES = gql`
  mutation BulkCreateEntities($inputs: [CreateEntityInput!]!) {
    bulkCreateEntities(inputs: $inputs) {
      ...EntityWithType
    }
  }
  ${ENTITY_WITH_TYPE}
`;

export const BULK_UPDATE_ENTITIES = gql`
  mutation BulkUpdateEntities($updates: [EntityUpdate!]!) {
    bulkUpdateEntities(updates: $updates) {
      ...EntityWithType
    }
  }
  ${ENTITY_WITH_TYPE}
`;