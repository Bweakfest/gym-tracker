-- Add columns for admin ticket management and user feedback
-- Run this in Supabase SQL Editor

-- Feedback rating (1-5 stars) from user after ticket is resolved
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS feedback_rating smallint;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS feedback_comment text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Ensure status column exists with default
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'open';

-- Ensure admin_reply column exists
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS admin_reply text;

-- Add constraint for rating range
ALTER TABLE tickets ADD CONSTRAINT feedback_rating_range
  CHECK (feedback_rating IS NULL OR (feedback_rating >= 1 AND feedback_rating <= 5));
