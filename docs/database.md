# Database Documentation

## Tech Stack
- **ORM**: Drizzle ORM
- **Database**: Neon (Serverless PostgreSQL)
- **Extensions**: pgvector (for AI embeddings)

## Schema Architecture

The database schema is split into multiple files for better maintainability and to separate concerns (Auth vs Business Logic).

Location: `server/database/schema/`

- **`auth.ts`**: Dedicated to Better Auth tables (User, Session, Account, Verification). 
  - *Note: This file is auto-generated/updated by Better Auth CLI.*
- **`bookmarks.ts`**: Business logic tables (e.g., Bookmarks with vector embeddings).
- **`relations.ts`**: Centralized definition of table relationships to avoid circular dependency issues.
- **`index.ts`**: Exports all schema definitions for Drizzle Kit.

## Management Commands

### Common Workflows

**Sync schema to database (Dev/Prototyping):**
```bash
pnpm db:push
```

**Generate migrations (Production):**
```bash
pnpm db:generate
```

**Apply migrations:**
```bash
pnpm db:migrate
```

### Better Auth Schema Management
If you update `auth.ts` configuration in `server/utils/auth.ts`, regenerate the schema:
```bash
pnpm dlx @better-auth/cli@latest generate --config ./server/utils/auth.ts --output ./server/database/schema/auth.ts --yes
```

## pgvector Extension
This project requires the `pgvector` extension for vector similarity search.

If you encounter `type "vector" does not exist`, run the helper script:
```bash
pnpm tsx server/database/enable-vector.ts
```

This script connects to your Neon database and executes `CREATE EXTENSION IF NOT EXISTS vector`.