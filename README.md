# Entropy Server

A minimal Nuxt 4 starter template for building modern web applications.

- **Framework**: [Nuxt 4](https://nuxt.com) (Nitro)
- **Database**: Drizzle ORM + Neon (Serverless PostgreSQL) + pgvector
- **Auth**: Better Auth
- **AI**: Gemini Integration (with extensible Provider pattern)

## Documentation

Detailed documentation is available in the `docs/` directory:

- [Database & Schema Management](docs/database.md) - Drizzle, Schema Splitting, Migrations.
- [AI Integration Architecture](docs/ai-integration.md) - Strategy Pattern, Factory, & Usage.
- [Project Architecture](docs/architecture.md) - (Coming Soon) Overview of the tech stack.

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

Create a `.env` file with your credentials:

```env
DATABASE_URL=postgres://user:password@host:port/database?sslmode=require
GEMINI_API_KEY=your_gemini_api_key_here
BETTER_AUTH_URL=http://localhost:3000 # Required for Better Auth
NUXT_PUBLIC_AUTH_URL=http://localhost:3000 # Or use this for Nuxt config mapping
```

### 3. Database Initialization

Ensure schema is synced and vector extension is enabled:

```bash
# Enable pgvector extension
pnpm tsx server/database/enable-vector.ts

# Push schema to database
pnpm db:push
```

### 4. Development Server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production Build

```bash
pnpm build
pnpm preview
```

