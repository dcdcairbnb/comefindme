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

    const { group_id } = req.query;
    const userId = auth.user.user_id;

    await sql`
      UPDATE group_members SET is_active = false
      WHERE group_id = ${group_id} AND user_id = ${userId}
    `;

    const groupResult = await sql`
      SELECT member_count FROM groups WHERE group_id = ${group_id}
    `;

    const group = groupResult.rows[0];

    await sql`
      UPDATE groups SET member_count = GREATEST(0, member_count - 1)
      WHERE group_id = ${group_id}
    `;

    res.json({
      success: true,
      message: 'Left group'
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
