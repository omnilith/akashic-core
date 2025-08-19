#!/bin/bash

# Create a relation between "Write API documentation" task and Bob
curl -s http://localhost:3000/graphql -X POST -H "Content-Type: application/json" -d '{
  "query": "mutation CreateRelation($input: CreateRelationInput!) { createRelation(input: $input) { id } }",
  "variables": {
    "input": {
      "namespace": "tasks",
      "relationTypeId": "97354047-7e32-4f9e-b640-471decd0e4f6",
      "fromEntityId": "6b545e0f-8e4d-4701-8c9f-ac38206e7bec",
      "toEntityId": "9e062b10-1eef-4dd9-8d65-12877d6f0f80"
    }
  }
}' | python3 -m json.tool

echo "Created relation: 'Write API documentation' assigned to Bob"