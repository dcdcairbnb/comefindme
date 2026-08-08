import { v4 as uuidv4 } from 'uuid';
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

    const { color } = req.body;
    const { group_id } = req.query;
    const userId = auth.user.user_id;

    if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({
        success: false,
        error: 'Valid hex color required (e.g. #FF5733)'
      });
    }

    const groupResult = await sql`
      SELECT * FROM groups WHERE group_id = ${group_id} AND is_active = true
    `;

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or expired'
      });
    }

    const group = groupResult.rows[0];

    if (group.member_count >= group.max_capacity) {
      return res.status(400).json({
        success: false,
        error: 'Group is at max capacity'
      });
    }

    await sql`
      INSERT INTO group_members (group_member_id, group_id, user_id, color, is_active)
      VALUES (${uuidv4()}, ${group_id}, ${userId}, ${color}, true)
    `;

    await sql`
      UPDATE groups SET member_count = member_count + 1 WHERE group_id = ${group_id}
    `;

    res.json({
      success: true,
      message: 'Joined group'
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
