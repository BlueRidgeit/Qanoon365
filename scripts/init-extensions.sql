-- AlBasti: PostgreSQL extensions required for the platform
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create the default tenant schema used by Prisma migrations
CREATE SCHEMA IF NOT EXISTS "tenant_default";
