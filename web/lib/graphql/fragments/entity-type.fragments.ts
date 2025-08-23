import { gql } from '@apollo/client';

export const ENTITY_TYPE_BASIC_FIELDS = gql`
  fragment EntityTypeBasicFields on EntityType {
    id
    name
    namespace
    schemaJson
    metadata
    createdAt
    updatedAt
  }
`;

export const ENTITY_TYPE_WITH_STATS = gql`
  fragment EntityTypeWithStats on EntityType {
    ...EntityTypeBasicFields
    entityCount
  }
  ${ENTITY_TYPE_BASIC_FIELDS}
`;

export const ENTITY_TYPE_WITH_RELATIONS = gql`
  fragment EntityTypeWithRelations on EntityType {
    ...EntityTypeBasicFields
    relationTypesFrom {
      id
      name
      fromEntityTypeId
      toEntityTypeId
      cardinality
      metadata
    }
    relationTypesTo {
      id
      name
      fromEntityTypeId
      toEntityTypeId
      cardinality
      metadata
    }
  }
  ${ENTITY_TYPE_BASIC_FIELDS}
`;

export const ENTITY_TYPE_FULL = gql`
  fragment EntityTypeFull on EntityType {
    ...EntityTypeWithStats
    relationTypesFrom {
      id
      name
      fromEntityTypeId
      toEntityTypeId
      cardinality
      metadata
      toEntityType {
        id
        name
        namespace
      }
    }
    relationTypesTo {
      id
      name
      fromEntityTypeId
      toEntityTypeId
      cardinality
      metadata
      fromEntityType {
        id
        name
        namespace
      }
    }
  }
  ${ENTITY_TYPE_WITH_STATS}
`;