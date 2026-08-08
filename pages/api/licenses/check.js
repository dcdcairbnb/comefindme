import { sql } from '@vercel/postgres';
import { verifyTokenOnly } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { feature } = req.body;
    const auth = await verifyTokenOnly(req);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const result = await sql`
      SELECT license_type FROM licenses
      WHERE user_id = ${auth.user.user_id} AND expires_at > NOW()
      ORDER BY expires_at DESC
      LIMIT 1
    `;

    const license = result.rows[0];
    const hasAccess = license && license.license_type === 'premium';

    res.json({
      success: true,
      feature,
      allowed: hasAccess,
      license_type: license?.license_type || 'free'
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
