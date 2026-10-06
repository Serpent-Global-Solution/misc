-- Runs once on first Postgres init (empty data dir).
-- POSTGRES_DB already created the "meikigo" database for the API;
-- this adds the separate database Keycloak uses.
CREATE DATABASE "meikigo-keycloak";
