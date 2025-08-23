import { gql } from '@apollo/client';

export const ENTITY_BASIC_FIELDS = gql`
  fragment EntityBasicFields on Entity {
    id
    namespace
    entityTypeId
    data
    metadata
    createdAt
    updatedAt
  }
`;

export const ENTITY_WITH_TYPE = gql`
  fragment EntityWithType on Entity {
    ...EntityBasicFields
    entityType {
      id
      name
      namespace
      schemaJson
    }
  }
  ${ENTITY_BASIC_FIELDS}
`;

export const ENTITY_WITH_RELATIONS = gql`
  fragment EntityWithRelations on Entity {
    ...EntityBasicFields
    relationsFrom {
      id
      relationTypeId
      fromEntityId
      toEntityId
      data
      metadata
      createdAt
      updatedAt
    }
    relationsTo {
      id
      relationTypeId
      fromEntityId
      toEntityId
      data
      metadata
      createdAt
      updatedAt
    }
  }
  ${ENTITY_BASIC_FIELDS}
`;

export const ENTITY_FULL = gql`
  fragment EntityFull on Entity {
    ...EntityWithType
    relationsFrom {
      id
      relationTypeId
      fromEntityId
      toEntityId
      data
      metadata
      createdAt
      updatedAt
      relationType {
        id
        name
        fromEntityTypeId
        toEntityTypeId
      }
      toEntity {
        id
        namespace
        data
        entityType {
          id
          name
        }
      }
    }
    relationsTo {
      id
      relationTypeId
      fromEntityId
      toEntityId
      data
      metadata
      createdAt
      updatedAt
      relationType {
        id
        name
        fromEntityTypeId
        toEntityTypeId
      }
      fromEntity {
        id
        namespace
        data
        entityType {
          id
          name
        }
      }
    }
  }
  ${ENTITY_WITH_TYPE}
`;