-- Migration: Create tracked_user_profiles table
-- This table stores email and phone information for tracked users
-- Used for analytics export and user follow-up

CREATE TABLE IF NOT EXISTS tracked_user_profiles (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES sites(site_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    name TEXT,
    traits JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(site_id, user_id)
);

-- Index for faster lookups by site_id
CREATE INDEX IF NOT EXISTS idx_tracked_user_profiles_site_id ON tracked_user_profiles(site_id);

-- Index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_tracked_user_profiles_user_id ON tracked_user_profiles(user_id);

-- Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_tracked_user_profiles_site_user ON tracked_user_profiles(site_id, user_id);
