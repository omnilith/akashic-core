#!/bin/bash

# Akashic Core - Environment Switcher
# Easily switch between development, production, and test environments

set -e

echo "🔄 Akashic Core - Environment Switcher"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to show current environment
show_current_env() {
    if [ -f ".env" ]; then
        current_db=$(grep DATABASE_URL .env | cut -d'/' -f4 | cut -d'"' -f1 || echo "unknown")
        current_node_env=$(grep NODE_ENV .env | cut -d'=' -f2 || echo "not set")
        echo -e "${BLUE}Current environment:${NC}"
        echo "  Database: $current_db"
        echo "  NODE_ENV: $current_node_env"
    else
        echo -e "${YELLOW}No .env file found${NC}"
    fi
}

# Function to switch environment
switch_to() {
    local env=$1
    local env_file=".env.$env"
    
    if [ "$env" = "example" ]; then
        env_file=".env.example"
    fi
    
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}Error: $env_file not found!${NC}"
        echo "Available environment files:"
        ls -la .env* 2>/dev/null | grep -v ".local" || echo "No .env files found"
        exit 1
    fi
    
    # Backup current .env if it exists
    if [ -f ".env" ]; then
        cp .env .env.backup
        echo -e "${YELLOW}Backed up current .env to .env.backup${NC}"
    fi
    
    # Copy new environment
    cp "$env_file" .env
    echo -e "${GREEN}✅ Switched to $env environment${NC}"
    echo ""
    show_current_env
}

# Main menu
if [ "$#" -eq 0 ]; then
    show_current_env
    echo ""
    echo "Select environment to switch to:"
    echo "  1) Development"
    echo "  2) Production"
    echo "  3) Test"
    echo "  4) Example (template)"
    echo "  5) Exit"
    echo ""
    read -p "Enter choice [1-5]: " choice
    
    case $choice in
        1) switch_to "development" ;;
        2) switch_to "production" ;;
        3) switch_to "test" ;;
        4) switch_to "example" ;;
        5) exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
    esac
else
    # Command line argument provided
    case $1 in
        dev|development) switch_to "development" ;;
        prod|production) switch_to "production" ;;
        test) switch_to "test" ;;
        example) switch_to "example" ;;
        current) show_current_env ;;
        --help)
            echo "Usage: $0 [environment]"
            echo ""
            echo "Environments:"
            echo "  dev, development  Switch to development environment"
            echo "  prod, production  Switch to production environment"
            echo "  test             Switch to test environment"
            echo "  example          Switch to example template"
            echo "  current          Show current environment"
            echo ""
            echo "Interactive mode: Run without arguments"
            ;;
        *) echo -e "${RED}Unknown environment: $1${NC}"; exit 1 ;;
    esac
fi