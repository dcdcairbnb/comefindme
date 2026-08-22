import { sql } from '@vercel/postgres';

const TOKEN = 'glow-mig-2026-8f3k2m9x';

const DROPS = [
  'DROP TABLE IF EXISTS group_members CASCADE',
  'DROP TABLE IF EXISTS groups CASCADE',
  'DROP TABLE IF EXISTS subscriptions CASCADE',
  'DROP TABLE IF EXISTS licenses CASCADE',
  'DROP TABLE IF EXISTS users CASCADE'
];

const STATEMENTS = [
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',

  `CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL,
    metadata JSONB DEFAULT '{}'::jsonb
  )`,

  `CREATE TABLE IF NOT EXISTS licenses (
    license_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    license_type VARCHAR(20) DEFAULT 'free',
    tier_name VARCHAR(100) DEFAULT 'Free',
    max_group_size INTEGER DEFAULT 15,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,
    renewal_date TIMESTAMP NULL,
    metadata JSONB DEFAULT '{}'::jsonb
  )`,

  `CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    license_id UUID REFERENCES licenses(license_id) ON DELETE CASCADE,
    plan_type VARCHAR(20) DEFAULT 'free',
    plan_price DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) DEFAULT 'annual',
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP NULL,
    renewal_date TIMESTAMP NULL,
    payment_method_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
  )`,

  `CREATE TABLE IF NOT EXISTS groups (
    group_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    group_name VARCHAR(255),
    join_code VARCHAR(12),
    member_count INTEGER DEFAULT 1,
    max_capacity INTEGER DEFAULT 15,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb
  )`,

  `CREATE TABLE IF NOT EXISTS group_members (
    group_member_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    sharing_until TIMESTAMP NULL,
    last_location_update TIMESTAMP
  )`,

  'ALTER TABLE groups ADD COLUMN IF NOT EXISTS join_code VARCHAR(12)',
  'ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true',
  'ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_name VARCHAR(255)',
  'ALTER TABLE groups ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 1',
  'ALTER TABLE group_members ADD COLUMN IF NOT EXISTS sharing_until TIMESTAMP NULL',
  'ALTER TABLE group_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true',

  'CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id)',
  'CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_groups_creator_user_id ON groups(creator_user_id)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_join_code ON groups(join_code)'
];

async function readSchema() {
  const cols = await sql.query(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position"
  );
  const schema = {};
  cols.rows.forEach(function (r) {
    if (!schema[r.table_name]) schema[r.table_name] = [];
    schema[r.table_name].push(r.column_name);
  });
  return schema;
}

export default async function handler(req, res) {
  if (req.query.token !== TOKEN) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  try {
    if (req.method === 'GET') {
      const schema = await readSchema();
      const counts = {};
      for (const t of Object.keys(schema)) {
        try {
          const c = await sql.query('SELECT COUNT(*)::int AS n FROM ' + t);
          counts[t] = c.rows[0].n;
        } catch (e) {
          counts[t] = 'error';
        }
      }
      return res.json({ success: true, schema: schema, counts: counts });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const results = [];
    if (req.query.reset === '1') {
      for (const stmt of DROPS) {
        try {
          await sql.query(stmt);
          results.push({ stmt: stmt, ok: true });
        } catch (e) {
          results.push({ stmt: stmt, ok: false, error: e.message });
        }
      }
    }

    for (const stmt of STATEMENTS) {
      const label = stmt.slice(0, 60).replace(/\s+/g, ' ');
      try {
        await sql.query(stmt);
        results.push({ stmt: label, ok: true });
      } catch (e) {
        results.push({ stmt: label, ok: false, error: e.message });
      }
    }

    const schema = await readSchema();
    const failed = results.filter(function (r) { return !r.ok; });
    res.json({
      success: failed.length === 0,
      failedCount: failed.length,
      failed: failed,
      schema: schema
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
