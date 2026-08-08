import { sql } from '@vercel/postgres';
import { verifyTokenOnly } from '../../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await verifyTokenOnly(req);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const { latitude, longitude } = req.body;
    const { group_id } = req.query;
    const userId = auth.user.user_id;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude required'
      });
    }

    await sql`
      UPDATE group_members
      SET latitude = ${latitude}, longitude = ${longitude}, last_location_update = NOW()
      WHERE group_id = ${group_id} AND user_id = ${userId}
    `;

    res.json({
      success: true,
      message: 'Location updated'
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
