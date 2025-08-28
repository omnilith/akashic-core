# Akashic Core Database Scripts

## Environment Management

### Switch Environment
```bash
./scripts/switch-environment.sh [dev|prod|test]
```
Quickly switch between development, production, and test databases.

### Setup Production Database
```bash
./scripts/setup-production.sh
```
Creates a clean production database with core entity types only (no test data).

### Backup Database
```bash
./scripts/backup-database.sh [--production|--development]
```
Creates timestamped backups of your database. Keeps last 10 backups automatically.

## Quick Commands

**Create fresh production database:**
```bash
# 1. Update credentials in .env.production
# 2. Run setup script
./scripts/setup-production.sh
```

**Switch to production:**
```bash
./scripts/switch-environment.sh prod
npm run start:prod
```

**Backup before major changes:**
```bash
./scripts/backup-database.sh --production
```

**Restore from backup:**
```bash
gunzip < backups/akashic_prod_20240827_143022.sql.gz | psql $DATABASE_URL
```

## Environment Files

- `.env` - Current active environment (git ignored)
- `.env.example` - Template with all variables
- `.env.development` - Dev database config
- `.env.production` - Production database config
- `.env.test` - Test database config (create if needed)

## Tips

1. Always backup before migrations in production
2. Use different database names for each environment
3. Never commit real credentials to git
4. Test migrations on development first