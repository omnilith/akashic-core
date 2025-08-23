import { gql } from '@apollo/client';

export const ENTITY_BASIC_FIELDS = gql`
  fragment EntityBasicFields on EntityDto {
    id
    namespace
    entityTypeId
    data
    createdAt
    updatedAt
  }
`;

export const ENTITY_WITH_TYPE = gql`
  fragment EntityWithType on EntityDto {
    ...EntityBasicFields
  }
  ${ENTITY_BASIC_FIELDS}
`;

export const ENTITY_WITH_RELATIONS = gql`
  fragment EntityWithRelations on EntityDto {
    ...EntityBasicFields
  }
  ${ENTITY_BASIC_FIELDS}
`;

export const ENTITY_FULL = gql`
  fragment EntityFull on EntityDto {
    ...EntityBasicFields
  }
  ${ENTITY_BASIC_FIELDS}
`;