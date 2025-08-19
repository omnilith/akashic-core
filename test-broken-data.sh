#!/bin/bash

# This script will test if health checks detect broken data

echo "Creating a test relation that will become orphaned..."

# First, let's see what valid entity and relation type IDs we have
RELATION_TYPE_ID="03deb6a8-e9b5-4640-99f6-4a0c8ddf3dfc"
FROM_ENTITY="16ab5b8c-494d-49cd-9dd3-3fc323847649"
TO_ENTITY="fake-entity-id-that-does-not-exist"

# Try to create a relation with a non-existent target entity
curl -s http://localhost:3000/graphql -X POST -H "Content-Type: application/json" -d "{
  \"query\": \"mutation CreateRelation(\$input: CreateRelationInput!) { createRelation(input: \$input) { id } }\",
  \"variables\": {
    \"input\": {
      \"namespace\": \"test\",
      \"relationTypeId\": \"$RELATION_TYPE_ID\",
      \"fromEntityId\": \"$FROM_ENTITY\",
      \"toEntityId\": \"$TO_ENTITY\"
    }
  }
}" | python3 -m json.tool

echo "This should fail because the toEntity doesn't exist"
