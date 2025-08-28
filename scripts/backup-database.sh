#!/bin/bash

# Akashic Core - Database Backup Script
# Creates timestamped backups of your database

set -e  # Exit on error

echo "💾 Akashic Core - Database Backup"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to current environment
ENV_FILE=".env"
BACKUP_DIR="backups"

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --production) ENV_FILE=".env.production"; shift ;;
        --development) ENV_FILE=".env.development"; shift ;;
        --dir) BACKUP_DIR="$2"; shift; shift ;;
        --help) 
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --production    Use .env.production file"
            echo "  --development   Use .env.development file"
            echo "  --dir <path>    Backup directory (default: backups)"
            echo "  --help         Show this help message"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE file not found!${NC}"
    exit 1
fi

# Load environment
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Extract database info from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/akashic_${DB_NAME}_${TIMESTAMP}.sql"
BACKUP_FILE_COMPRESSED="${BACKUP_FILE}.gz"

echo -e "${YELLOW}Backing up database: ${DB_NAME}${NC}"
echo -e "Backup file: ${BACKUP_FILE_COMPRESSED}"
echo ""

# Perform backup with progress indicator
export PGPASSWORD=$DB_PASS
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --verbose 2>&1 | \
    tee $BACKUP_FILE | \
    grep -E "^pg_dump:|dumping contents|dumped" || true

# Compress the backup
echo ""
echo "Compressing backup..."
gzip $BACKUP_FILE

# Get file size
FILE_SIZE=$(du -h $BACKUP_FILE_COMPRESSED | cut -f1)

echo ""
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo "File: $BACKUP_FILE_COMPRESSED"
echo "Size: $FILE_SIZE"

# Cleanup old backups (keep last 10)
echo ""
echo "Cleaning up old backups (keeping last 10)..."
cd $BACKUP_DIR
ls -t akashic_*.sql.gz 2>/dev/null | tail -n +11 | xargs -I {} rm {} 2>/dev/null || true
cd - > /dev/null

# List current backups
echo ""
echo "Current backups:"
ls -lh $BACKUP_DIR/akashic_*.sql.gz 2>/dev/null | tail -5 || echo "No backups found"

echo ""
echo "To restore from this backup:"
echo "  gunzip < $BACKUP_FILE_COMPRESSED | psql $DATABASE_URL"