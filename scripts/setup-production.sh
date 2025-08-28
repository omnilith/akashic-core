#!/bin/bash

# Akashic Core - Production Database Setup Script
# This script helps set up a clean production database

set -e  # Exit on error

echo "🚀 Akashic Core - Production Database Setup"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if production env file exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}Error: .env.production file not found!${NC}"
    echo "Please create .env.production with your database credentials"
    exit 1
fi

# Load production environment
export $(cat .env.production | grep -v '^#' | xargs)

echo -e "${YELLOW}Current DATABASE_URL: ${DATABASE_URL}${NC}"
echo ""
echo "This script will:"
echo "1. Create a new production database (if it doesn't exist)"
echo "2. Run all migrations"
echo "3. Import core entity types only (no test data)"
echo ""

read -p "Continue with production setup? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Setup cancelled"
    exit 1
fi

# Extract database name from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')

echo ""
echo "📦 Step 1: Creating database '${DB_NAME}' (if not exists)..."

# Try to create database (will fail gracefully if exists)
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || {
    echo -e "${YELLOW}Database '${DB_NAME}' already exists or cannot be created${NC}"
}

echo ""
echo "🔧 Step 2: Running migrations..."
npm run db:migrate

echo ""
echo "📝 Step 3: Creating core entity types export..."

# Create core entity types file
cat > data/core-entity-types.json << 'EOF'
{
  "entityTypes": [
    {
      "name": "Person",
      "namespace": "global",
      "schemaJson": {
        "type": "object",
        "required": ["name"],
        "properties": {
          "name": { "type": "string" },
          "email": { "type": "string", "format": "email" },
          "bio": { "type": "string" },
          "personalNamespace": { "type": "string" }
        }
      }
    },
    {
      "name": "Work",
      "namespace": "global",
      "schemaJson": {
        "type": "object",
        "required": ["title", "type"],
        "properties": {
          "title": { "type": "string" },
          "type": { "type": "string", "enum": ["song", "album", "video", "performance", "artwork"] },
          "description": { "type": "string" },
          "createdDate": { "type": "string", "format": "date" },
          "metadata": { "type": "object" }
        }
      }
    },
    {
      "name": "Contribution",
      "namespace": "global",
      "schemaJson": {
        "type": "object",
        "required": ["role", "description"],
        "properties": {
          "role": { "type": "string" },
          "description": { "type": "string" },
          "percentage": { "type": "number", "minimum": 0, "maximum": 100 },
          "timestamp": { "type": "string", "format": "date-time" }
        }
      }
    },
    {
      "name": "Rights",
      "namespace": "global",
      "schemaJson": {
        "type": "object",
        "required": ["type", "percentage"],
        "properties": {
          "type": { "type": "string", "enum": ["ownership", "performance", "mechanical", "sync"] },
          "percentage": { "type": "number", "minimum": 0, "maximum": 100 },
          "territory": { "type": "string" },
          "validFrom": { "type": "string", "format": "date" },
          "validUntil": { "type": "string", "format": "date" }
        }
      }
    },
    {
      "name": "ProcessDefinition",
      "namespace": "global",
      "schemaJson": {
        "type": "object",
        "required": ["name", "steps"],
        "properties": {
          "name": { "type": "string" },
          "description": { "type": "string" },
          "steps": { "type": "array", "items": { "type": "object" } },
          "permissions": { "type": "object" }
        }
      }
    },
    {
      "name": "HealthCheck",
      "namespace": "global",
      "schemaJson": {
        "type": "object",
        "required": ["id", "name", "category", "query", "severity"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "description": { "type": "string" },
          "category": { "type": "string" },
          "query": { "type": "string" },
          "severity": { "type": "string", "enum": ["critical", "warning", "info"] },
          "expectedResult": { "type": "string" },
          "autoFix": { "type": "boolean" },
          "autoFixQuery": { "type": "string" }
        }
      }
    }
  ],
  "relationTypes": [
    {
      "name": "PersonToWork",
      "namespace": "global",
      "fromEntityType": "Person",
      "toEntityType": "Work",
      "cardinality": "many-to-many"
    },
    {
      "name": "ContributionToWork",
      "namespace": "global",
      "fromEntityType": "Contribution",
      "toEntityType": "Work",
      "cardinality": "many-to-one"
    },
    {
      "name": "PersonToContribution",
      "namespace": "global",
      "fromEntityType": "Person",
      "toEntityType": "Contribution",
      "cardinality": "one-to-many"
    },
    {
      "name": "RightsToWork",
      "namespace": "global",
      "fromEntityType": "Rights",
      "toEntityType": "Work",
      "cardinality": "many-to-one"
    },
    {
      "name": "PersonToRights",
      "namespace": "global",
      "fromEntityType": "Person",
      "toEntityType": "Rights",
      "cardinality": "one-to-many"
    }
  ]
}
EOF

echo "✅ Core entity types file created"

echo ""
echo "📥 Step 4: Importing core entity types..."
npm run akashic import data/core-entity-types.json

echo ""
echo "🔍 Step 5: Running health check..."
npm run akashic health

echo ""
echo -e "${GREEN}✨ Production database setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update .env.production with your actual credentials"
echo "2. Set up SSL for database connection in production"
echo "3. Configure backups (see scripts/backup-database.sh)"
echo "4. Consider setting up read replicas for scaling"
echo ""
echo "To use the production database:"
echo "  export NODE_ENV=production"
echo "  npm run start:prod"