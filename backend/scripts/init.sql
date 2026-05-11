-- DramaGenius PostgreSQL bootstrap.
--
-- Keep this file intentionally small. The application creates tables from the
-- SQLAlchemy models on startup, which avoids schema drift between Docker's
-- first-run SQL and the Python ORM.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
