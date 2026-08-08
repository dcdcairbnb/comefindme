import bcrypt from 'bcryptjs';
import { sql } from '@vercel/postgres';
import { generateToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }

    // Get user
    const result = await sql`
      SELECT user_id, email, username, password_hash FROM users WHERE email = ${email}
    `;

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const token = generateToken(user.user_id, user.email);

    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username
      },
      access_token: token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
