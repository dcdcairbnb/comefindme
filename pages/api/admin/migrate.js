import { sql } from '@vercel/postgres';

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS licenses (
  license_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  license_type VARCHAR(20) DEFAULT 'free' CHECK (license_type IN ('free', 'premium')),
  tier_name VARCHAR(100) DEFAULT 'Free',
  max_group_size INTEGER DEFAULT 15,
  features_enabled JSONB DEFAULT '["basic_sharing", "color_customization"]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT true,
  renewal_date TIMESTAMP NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  license_id UUID NOT NULL REFERENCES licenses(license_id) ON DELETE CASCADE,
  plan_type VARCHAR(20) DEFAULT 'free' CHECK (plan_type IN ('free', 'annual', 'monthly')),
  plan_price DECIMAL(10, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle VARCHAR(20) DEFAULT 'annual' CHECK (billing_cycle IN ('monthly', 'annual')),
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP NULL,
  renewal_date TIMESTAMP NULL,
  payment_method_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS groups (
  group_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  group_name VARCHAR(255),
  member_count INTEGER DEFAULT 1,
  max_capacity INTEGER DEFAULT 15,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS group_members (
  group_member_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  color VARCHAR(7) DEFAULT '#FF5733',
  is_active BOOLEAN DEFAULT true,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  last_location_update TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON licenses(expires_at);
CREATE INDEX IF NOT EXISTS idx_licenses_license_type ON licenses(license_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_date ON subscriptions(renewal_date);
CREATE INDEX IF NOT EXISTS idx_groups_creator_user_id ON groups(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_groups_expires_at ON groups(expires_at);
CREATE INDEX IF NOT EXISTS idx_groups_is_active ON groups(is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);

DO $$ BEGIN
  ALTER TABLE group_members ADD CONSTRAINT unique_user_group UNIQUE(user_id, group_id);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (req.query.token !== 'glow-mig-2026-8f3k2m9x') {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  try {
    await sql.query(SCHEMA);
    const tables = await sql.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    res.json({ success: true, tables: tables.rows.map((r) => r.table_name) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
