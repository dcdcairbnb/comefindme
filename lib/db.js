import { sql } from '@vercel/postgres';

export async function query(text, params) {
  try {
    const result = await sql.query(text, params);
    return result;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function getUser(userId) {
  const result = await sql`
    SELECT * FROM users WHERE user_id = ${userId}
  `;
  return result.rows[0];
}

export async function getUserByEmail(email) {
  const result = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
  return result.rows[0];
}

export async function getLicense(userId) {
  const result = await sql`
    SELECT * FROM licenses WHERE user_id = ${userId} AND expires_at > NOW()
  `;
  return result.rows[0];
}

export async function createUser(userId, email, username, hashedPassword) {
  const result = await sql`
    INSERT INTO users (user_id, email, username, password_hash, created_at)
    VALUES (${userId}, ${email}, ${username}, ${hashedPassword}, NOW())
    RETURNING *
  `;
  return result.rows[0];
}

export async function createFreeLicense(userId) {
  const result = await sql`
    INSERT INTO licenses (license_id, user_id, license_type, max_group_size, expires_at, created_at)
    VALUES (gen_random_uuid(), ${userId}, 'free', 15, NOW() + INTERVAL '6 months', NOW())
    RETURNING *
  `;
  return result.rows[0];
}

export async function createGroup(groupId, creatorId, groupName, maxCapacity, expiresAt) {
  const result = await sql`
    INSERT INTO groups (group_id, creator_user_id, group_name, member_count, max_capacity, created_at, expires_at, is_active)
    VALUES (${groupId}, ${creatorId}, ${groupName}, 1, ${maxCapacity}, NOW(), ${expiresAt}, true)
    RETURNING *
  `;
  return result.rows[0];
}

export async function getGroup(groupId) {
  const result = await sql`
    SELECT * FROM groups WHERE group_id = ${groupId} AND is_active = true
  `;
  return result.rows[0];
}

export async function getGroupMembers(groupId) {
  const result = await sql`
    SELECT user_id, color, latitude, longitude, last_location_update, is_active
    FROM group_members
    WHERE group_id = ${groupId} AND is_active = true
  `;
  return result.rows;
}
