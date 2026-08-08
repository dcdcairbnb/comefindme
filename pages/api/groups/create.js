import { v4 as uuidv4 } from 'uuid';
import { sql } from '@vercel/postgres';
import { verifyTokenAndLicense } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await verifyTokenAndLicense(req);
    if (auth.error) {
      return res.status(auth.status).json({ success: false, error: auth.error });
    }

    const { group_name, share_duration_hours } = req.body;
    const userId = auth.user.user_id;

    if (!share_duration_hours || share_duration_hours < 1) {
      return res.status(400).json({
        success: false,
        error: 'Valid share_duration_hours required'
      });
    }

    if (share_duration_hours > 168) {
      return res.status(400).json({
        success: false,
        error: 'Maximum share duration is 7 days (168 hours)'
      });
    }

    const groupId = uuidv4();
    const expiresAt = new Date(Date.now() + share_duration_hours * 60 * 60 * 1000);

    // Create group
    await sql`
      INSERT INTO groups (group_id, creator_user_id, group_name, member_count, max_capacity, created_at, expires_at, is_active)
      VALUES (${groupId}, ${userId}, ${group_name || `Group ${new Date().toLocaleString()}`}, 1, ${auth.license.max_group_size}, NOW(), ${expiresAt.toISOString()}, true)
    `;

    // Add creator as member
    await sql`
      INSERT INTO group_members (group_member_id, group_id, user_id, color, is_active)
      VALUES (${uuidv4()}, ${groupId}, ${userId}, '#FF5733', true)
    `;

    const groupResult = await sql`
      SELECT * FROM groups WHERE group_id = ${groupId}
    `;

    res.json({
      success: true,
      group: groupResult.rows[0]
    });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
