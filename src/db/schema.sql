-- =========================================================================
-- TopoSphere / NexaLab: Neon Serverless PostgreSQL Database Schema
-- Run this in your Neon SQL Editor at https://console.neon.tech
-- =========================================================================

-- 1. Table: invite_codes
CREATE TABLE IF NOT EXISTS toposphere_invites (
  code VARCHAR(64) PRIMARY KEY,
  created_by VARCHAR(255) DEFAULT 'Ansh Narsale',
  max_uses INT DEFAULT 1,
  times_used INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  note VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table: users
CREATE TABLE IF NOT EXISTS toposphere_users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) DEFAULT 'user',
  invite_code_used VARCHAR(64) REFERENCES toposphere_invites(code) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table: user_topologies (for cloud saving user network labs)
CREATE TABLE IF NOT EXISTS toposphere_saved_labs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES toposphere_users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  snapshot_json JSONB NOT NULL,
  device_count INT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pre-seed Master Invite Codes created by Ansh Narsale
INSERT INTO toposphere_invites (code, created_by, max_uses, times_used, is_active, note)
VALUES 
  ('ANSH-VIP-2026', 'Ansh Narsale', 100, 0, TRUE, 'Master VIP Invite Code'),
  ('TOPOSPHERE-PRO', 'Ansh Narsale', 25, 0, TRUE, 'Standard Pro Access'),
  ('CCNA-STUDENT-LAB', 'Ansh Narsale', 50, 0, TRUE, 'Networking Students Access')
ON CONFLICT (code) DO NOTHING;

