import { gql } from "@apollo/client";

export const GET_ENTITY_TYPES = gql`
  query GetEntityTypes {
    entityTypes {
      id
      name
      description
      namespace
      schemaJson
      createdAt
      updatedAt
    }
  }
`;

export const GET_ENTITIES = gql`
  query GetEntities($filter: EntityFilter) {
    entities(filter: $filter) {
      id
      entityTypeId
      namespace
      data
      createdAt
      updatedAt
    }
  }
`;

export const GET_RELATION_TYPES = gql`
  query GetRelationTypes {
    relationTypes {
      id
      name
      description
      sourceEntityTypeId
      targetEntityTypeId
      cardinality
      createdAt
      updatedAt
    }
  }
`;

export const GET_RELATIONS = gql`
  query GetRelations($filter: RelationFilter) {
    relations(filter: $filter) {
      id
      relationTypeId
      sourceEntityId
      targetEntityId
      properties
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_ENTITY_TYPE = gql`
  mutation CreateEntityType($input: CreateEntityTypeInput!) {
    createEntityType(input: $input) {
      id
      name
      description
      namespace
      schemaJson
    }
  }
`;

export const CREATE_ENTITY = gql`
  mutation CreateEntity($input: CreateEntityInput!) {
    createEntity(input: $input) {
      id
      entityTypeId
      namespace
      data
    }
  }
`;

export const CREATE_RELATION_TYPE = gql`
  mutation CreateRelationType($input: CreateRelationTypeInput!) {
    createRelationType(input: $input) {
      id
      name
      description
      sourceEntityTypeId
      targetEntityTypeId
      cardinality
    }
  }
`;

export const CREATE_RELATION = gql`
  mutation CreateRelation($input: CreateRelationInput!) {
    createRelation(input: $input) {
      id
      relationTypeId
      sourceEntityId
      targetEntityId
      properties
    }
  }
`;