import { gql } from '@apollo/client';

export const RELATION_TYPE_BASIC_FIELDS = gql`
  fragment RelationTypeBasicFields on RelationType {
    id
    name
    fromEntityTypeId
    toEntityTypeId
    cardinality
    metadata
    createdAt
    updatedAt
  }
`;

export const RELATION_TYPE_WITH_ENTITY_TYPES = gql`
  fragment RelationTypeWithEntityTypes on RelationType {
    ...RelationTypeBasicFields
    fromEntityType {
      id
      name
      namespace
    }
    toEntityType {
      id
      name
      namespace
    }
  }
  ${RELATION_TYPE_BASIC_FIELDS}
`;