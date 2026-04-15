-- User-created recipes with optional photo and macro info.
-- Run this once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS recipes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ingredients TEXT,
  instructions TEXT,
  photo TEXT,               -- base64 data URL, capped at ~500KB at the app layer
  calories INTEGER,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  servings INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipes_user_id_idx ON recipes (user_id);
CREATE INDEX IF NOT EXISTS recipes_user_created_idx ON recipes (user_id, created_at DESC);
