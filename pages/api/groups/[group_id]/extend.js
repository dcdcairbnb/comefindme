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

    const { hours } = req.body;
    const { group_id } = req.query;

    if (!hours || hours < 1 || hours > 168) {
      return res.status(400).json({
        success: false,
        error: 'Hours must be between 1 and 168'
      });
    }

    const groupResult = await sql`
      SELECT expires_at, created_at FROM groups WHERE group_id = ${group_id}
    `;

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const group = groupResult.rows[0];
    const maxExpiry = new Date(new Date(group.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
    const newExpiry = new Date(Date.now() + hours * 60 * 60 * 1000);

    if (newExpiry > maxExpiry) {
      return res.status(400).json({
        success: false,
        error: 'Cannot extend beyond 7 days from group creation'
      });
    }

    await sql`
      UPDATE groups SET expires_at = ${newExpiry.toISOString()} WHERE group_id = ${group_id}
    `;

    res.json({
      success: true,
      message: `Group extended for ${hours} hours`,
      new_expiry: newExpiry
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
