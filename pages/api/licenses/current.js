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
      SELECT * FROM licenses
      WHERE user_id = ${auth.user.user_id} AND expires_at > NOW()
      ORDER BY expires_at DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        license: null
      });
    }

    res.json({
      success: true,
      license: result.rows[0]
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
