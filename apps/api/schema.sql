CREATE SCHEMA IF NOT EXISTS forge;
CREATE TABLE IF NOT EXISTS forge.requests (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  title varchar(140) NOT NULL CHECK(length(title)>0),
  detail text NOT NULL CHECK(length(detail)<=1200),
  status text NOT NULL DEFAULT 'accepted' CHECK(status IN ('accepted','processed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS requests_owner_created ON forge.requests(owner_id,created_at DESC);
CREATE TABLE IF NOT EXISTS forge.outbox (
  event_id uuid PRIMARY KEY,
  request_id uuid UNIQUE NOT NULL REFERENCES forge.requests(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS outbox_pending ON forge.outbox(created_at) WHERE published_at IS NULL;
CREATE TABLE IF NOT EXISTS forge.activities (
  event_id uuid PRIMARY KEY,
  request_id uuid UNIQUE NOT NULL REFERENCES forge.requests(id),
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
