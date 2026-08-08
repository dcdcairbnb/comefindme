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

    const { group_id } = req.query;

    const groupResult = await sql`
      SELECT * FROM groups WHERE group_id = ${group_id} AND is_active = true
    `;

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const membersResult = await sql`
      SELECT user_id, color, latitude, longitude, last_location_update, is_active
      FROM group_members
      WHERE group_id = ${group_id} AND is_active = true
    `;

    res.json({
      success: true,
      group: {
        ...groupResult.rows[0],
        members: membersResult.rows
      }
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
