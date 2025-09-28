-- Database initialization script
-- This runs when PostgreSQL container starts for the first time

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Create indexes for better performance
-- Note: TypeORM will create the tables, but we can prepare indexes

-- Optional: Create a read-only user for monitoring
-- CREATE USER rate_limiter_readonly WITH PASSWORD 'readonly_password';
-- GRANT CONNECT ON DATABASE rate_limiter TO rate_limiter_readonly;
-- GRANT USAGE ON SCHEMA public TO rate_limiter_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO rate_limiter_readonly;

-- Log the initialization
SELECT 'Rate Limiter Database Initialized at ' || NOW() as initialization_log;