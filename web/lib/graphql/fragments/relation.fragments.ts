import { gql } from '@apollo/client';

export const RELATION_BASIC_FIELDS = gql`
  fragment RelationBasicFields on Relation {
    id
    relationTypeId
    fromEntityId
    toEntityId
    data
    metadata
    createdAt
    updatedAt
  }
`;

export const RELATION_WITH_TYPE = gql`
  fragment RelationWithType on Relation {
    ...RelationBasicFields
    relationType {
      id
      name
      fromEntityTypeId
      toEntityTypeId
      cardinality
    }
  }
  ${RELATION_BASIC_FIELDS}
`;

export const RELATION_WITH_ENTITIES = gql`
  fragment RelationWithEntities on Relation {
    ...RelationWithType
    fromEntity {
      id
      namespace
      data
      entityType {
        id
        name
      }
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
  ${RELATION_WITH_TYPE}
`;