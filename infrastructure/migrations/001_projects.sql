BEGIN;
CREATE TABLE IF NOT EXISTS projects (
 id uuid PRIMARY KEY,
 revision bigint NOT NULL CHECK (revision > 0),
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (payload->>'id' IS NOT NULL AND payload->>'id' = id::text)
);
COMMIT;
