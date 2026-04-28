-- Push notification subscriptions (one per user).
-- Run this once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions (user_id);
