import { gql } from '@apollo/client';

export const ENTITY_TYPE_BASIC_FIELDS = gql`
  fragment EntityTypeBasicFields on EntityTypeDto {
    id
    name
    namespace
    version
    schemaJson
    createdAt
  }
`;

export const ENTITY_TYPE_WITH_STATS = gql`
  fragment EntityTypeWithStats on EntityTypeDto {
    ...EntityTypeBasicFields
  }
  ${ENTITY_TYPE_BASIC_FIELDS}
`;

export const ENTITY_TYPE_WITH_RELATIONS = gql`
  fragment EntityTypeWithRelations on EntityTypeDto {
    ...EntityTypeBasicFields
  }
  ${ENTITY_TYPE_BASIC_FIELDS}
`;

export const ENTITY_TYPE_FULL = gql`
  fragment EntityTypeFull on EntityTypeDto {
    ...EntityTypeBasicFields
  }
  ${ENTITY_TYPE_BASIC_FIELDS}
`;