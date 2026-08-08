import { sql } from '@vercel/postgres';
import { verifyTokenOnly } from '../../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await verifyTokenOnly(req);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const { user_id } = req.query;

    const result = await sql`
      SELECT * FROM licenses WHERE user_id = ${user_id}
      ORDER BY created_at DESC
    `;

    res.json({
      success: true,
      licenses: result.rows
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
