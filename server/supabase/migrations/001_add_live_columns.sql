-- Migration: Add missing columns to live_constituencies table
-- Run this in your Supabase SQL Editor if you see PGRST204 errors
-- ("Could not find the 'leading_votes' column")

-- Ensure live_constituencies table exists
CREATE TABLE IF NOT EXISTS live_constituencies (
    id TEXT PRIMARY KEY,
    name TEXT,
    status TEXT DEFAULT 'awaiting',
    round INTEGER,
    total_rounds INTEGER,
    leading_candidate TEXT,
    leading_party TEXT,
    leading_alliance TEXT,
    leading_votes INTEGER,
    trailing_candidate TEXT,
    trailing_party TEXT,
    trailing_votes INTEGER,
    margin INTEGER DEFAULT 0,
    margin_pct FLOAT DEFAULT 0,
    total_votes INTEGER,
    total_electors INTEGER,
    turnout FLOAT,
    candidates JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns (safe to re-run — IF NOT EXISTS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='round') THEN
        ALTER TABLE live_constituencies ADD COLUMN round INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='total_rounds') THEN
        ALTER TABLE live_constituencies ADD COLUMN total_rounds INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='leading_candidate') THEN
        ALTER TABLE live_constituencies ADD COLUMN leading_candidate TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='leading_party') THEN
        ALTER TABLE live_constituencies ADD COLUMN leading_party TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='leading_alliance') THEN
        ALTER TABLE live_constituencies ADD COLUMN leading_alliance TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='leading_votes') THEN
        ALTER TABLE live_constituencies ADD COLUMN leading_votes INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='trailing_candidate') THEN
        ALTER TABLE live_constituencies ADD COLUMN trailing_candidate TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='trailing_party') THEN
        ALTER TABLE live_constituencies ADD COLUMN trailing_party TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='trailing_votes') THEN
        ALTER TABLE live_constituencies ADD COLUMN trailing_votes INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='margin') THEN
        ALTER TABLE live_constituencies ADD COLUMN margin INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='margin_pct') THEN
        ALTER TABLE live_constituencies ADD COLUMN margin_pct FLOAT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='total_votes') THEN
        ALTER TABLE live_constituencies ADD COLUMN total_votes INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='total_electors') THEN
        ALTER TABLE live_constituencies ADD COLUMN total_electors INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='turnout') THEN
        ALTER TABLE live_constituencies ADD COLUMN turnout FLOAT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='candidates') THEN
        ALTER TABLE live_constituencies ADD COLUMN candidates JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='created_at') THEN
        ALTER TABLE live_constituencies ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='live_constituencies' AND column_name='updated_at') THEN
        ALTER TABLE live_constituencies ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Ensure live_meta table exists
CREATE TABLE IF NOT EXISTS live_meta (
    id INTEGER PRIMARY KEY DEFAULT 1,
    status TEXT DEFAULT 'awaiting',
    declared INTEGER DEFAULT 0,
    counting INTEGER DEFAULT 0,
    awaiting INTEGER DEFAULT 234,
    last_updated TIMESTAMPTZ,
    party_tally JSONB DEFAULT '{}'::jsonb,
    alliance_tally JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (recommended for Supabase)
ALTER TABLE live_constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_meta ENABLE ROW LEVEL SECURITY;

-- Create policies (wrapped in DO blocks to safely skip if already exists)
DO $$ BEGIN
    CREATE POLICY "Allow public read" ON live_constituencies FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow public read meta" ON live_meta FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service writes" ON live_constituencies FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Allow service writes meta" ON live_meta FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
