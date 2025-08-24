import { gql } from '@apollo/client';

export interface EntityType {
  id: string;
  name: string;
  namespace: string;
  description?: string;
  version: number;
  schemaJson: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export const GET_ENTITY_TYPES = gql`
  query GetEntityTypes {
    entityTypes {
      id
      name
      namespace
      schemaJson
      version
    }
  }
`;
