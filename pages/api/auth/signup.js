import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { sql } from '@vercel/postgres';
import { generateToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, username, and password required'
      });
    }

    // Check if user exists
    const existing = await sql`
      SELECT user_id FROM users WHERE email = ${email}
    `;
    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await sql`
      INSERT INTO users (user_id, email, username, password_hash, created_at)
      VALUES (${userId}, ${email}, ${username}, ${hashedPassword}, NOW())
    `;

    // Create free license
    await sql`
      INSERT INTO licenses (license_id, user_id, license_type, max_group_size, expires_at, created_at)
      VALUES (gen_random_uuid(), ${userId}, 'free', 15, NOW() + INTERVAL '6 months', NOW())
    `;

    const token = generateToken(userId, email);

    res.status(201).json({
      success: true,
      user: {
        user_id: userId,
        email,
        username
      },
      access_token: token
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
