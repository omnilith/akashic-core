import { gql } from '@apollo/client';

export interface CreateEntityTypeInput {
  name: string;
  namespace: string;
  schema: string;
}

export interface CreateEntityTypeResponse {
  createEntityType: {
    id: string;
    name: string;
    namespace: string;
    version: number;
    schemaJson: string;
    createdAt: string;
  };
}

export const CREATE_ENTITY_TYPE = gql`
  mutation CreateEntityType($input: CreateEntityTypeInput!) {
    createEntityType(input: $input) {
      id
      name
      namespace
      version
      schemaJson
      createdAt
    }
  }
`;
