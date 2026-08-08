import { sql } from '@vercel/postgres';
import { verifyTokenOnly } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await verifyTokenOnly(req);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const result = await sql`
      SELECT * FROM subscriptions
      WHERE user_id = ${auth.user.user_id} AND status = 'active'
    `;

    res.json({
      success: true,
      subscription: result.rows[0] || null
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
