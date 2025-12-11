-- Create temporary table for OAuth Request tokens (State management)
-- This replaces the cookie approach which can be flaky with cross-site redirects in some browsers without proper settings
CREATE TABLE IF NOT EXISTS oauth_requests (
  request_token TEXT PRIMARY KEY,
  request_token_secret TEXT NOT NULL,
  user_id UUID, -- Can be null if we don't have it yet, but best to have
  property_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup (optional, but good for expiring old tokens)
CREATE INDEX IF NOT EXISTS idx_oauth_requests_created_at ON oauth_requests(created_at);

-- RLS
ALTER TABLE oauth_requests ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS, so minimal policy needed if strictly accessed by backend
