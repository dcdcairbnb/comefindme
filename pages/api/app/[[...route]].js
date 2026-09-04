import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// No fallback: if JWT_SECRET is missing, every request fails closed rather than
// signing tokens with a value that lives in the public repo.
const SECRET = process.env.JWT_SECRET;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode(len) {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

function sign(userId, email) {
  return jwt.sign({ user_id: userId, email: email }, SECRET, { expiresIn: '365d' });
}

function auth(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(h.substring(7), SECRET);
  } catch (e) {
    return null;
  }
}

function body(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return req.body;
}

// Every group the user belongs to, with all members attached.
async function groupsFor(userId) {
  const g = await sql.query(
    `SELECT g.group_id, g.group_name, g.join_code, g.created_at, g.expires_at,
            g.creator_user_id, g.max_capacity
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.group_id
      WHERE gm.user_id = $1
        AND COALESCE(gm.is_active, true) = true
        AND COALESCE(g.is_active, true) = true
      ORDER BY g.created_at DESC`,
    [userId]
  );
  if (g.rows.length === 0) return [];

  const ids = g.rows.map(function (r) { return r.group_id; });
  // Note: email is deliberately not selected. Members should not receive each
  // other's email addresses; username is enough for display.
  const m = await sql.query(
    `SELECT gm.group_id, gm.user_id, gm.color, gm.latitude, gm.longitude,
            gm.sharing_until, gm.last_location_update, u.username
       FROM group_members gm
       JOIN users u ON u.user_id = gm.user_id
      WHERE gm.group_id = ANY($1::uuid[])
        AND COALESCE(gm.is_active, true) = true`,
    [ids]
  );

  const now = Date.now();
  const byGroup = {};
  m.rows.forEach(function (r) {
    if (!byGroup[r.group_id]) byGroup[r.group_id] = [];
    // A position is only served while the member's sharing window is still open.
    // Once it passes, coordinates read back as null even if the row still holds
    // the last value, so nobody keeps being tracked after their window ends.
    const until = r.sharing_until ? new Date(r.sharing_until) : null;
    const live = until && until.getTime() > now;
    byGroup[r.group_id].push({
      user_id: r.user_id,
      color: r.color || '#3B82F6',
      latitude: live && r.latitude !== null && r.latitude !== undefined ? Number(r.latitude) : null,
      longitude: live && r.longitude !== null && r.longitude !== undefined ? Number(r.longitude) : null,
      sharing_until: live ? until.toISOString() : null,
      last_location_update: live && r.last_location_update ? new Date(r.last_location_update).toISOString() : null,
      username: r.username
    });
  });

  return g.rows.map(function (r) {
    return {
      group_id: r.group_id,
      group_name: r.group_name,
      join_code: r.join_code,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
      expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : null,
      creator_user_id: r.creator_user_id,
      max_capacity: r.max_capacity || 15,
      members: byGroup[r.group_id] || []
    };
  });
}

// Clears the caller's stored position from every group they are in.
async function clearLocation(userId) {
  await sql.query(
    `UPDATE group_members
        SET latitude = NULL, longitude = NULL, sharing_until = NULL, last_location_update = NOW()
      WHERE user_id = $1 AND COALESCE(is_active, true) = true`,
    [userId]
  );
}

export default async function handler(req, res) {
  if (!SECRET) {
    return res.status(500).json({ success: false, error: 'Server is not configured.' });
  }

  const parts = req.query.route || [];
  const action = (Array.isArray(parts) ? parts[0] : parts) || '';
  const b = body(req);

  try {
    if (action === 'signup') {
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
      }

      const existing = await sql.query('SELECT user_id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'That email already has an account. Try logging in.' });
      }

      const hash = await bcrypt.hash(password, 10);
      let username = email.split('@')[0].replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 40) || 'member';
      const taken = await sql.query('SELECT user_id FROM users WHERE username = $1', [username]);
      if (taken.rows.length > 0) username = username.slice(0, 32) + '-' + makeCode(4).toLowerCase();

      const ins = await sql.query(
        'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING user_id, email, username',
        [email, username, hash]
      );
      const u = ins.rows[0];
      return res.json({ success: true, token: sign(u.user_id, u.email), user: u });
    }

    if (action === 'login') {
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      const r = await sql.query(
        'SELECT user_id, email, username, password_hash FROM users WHERE email = $1',
        [email]
      );
      if (r.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'No account found for that email.' });
      }
      const u = r.rows[0];
      const ok = await bcrypt.compare(password, u.password_hash || '');
      if (!ok) {
        return res.status(401).json({ success: false, error: 'Wrong password.' });
      }
      return res.json({
        success: true,
        token: sign(u.user_id, u.email),
        user: { user_id: u.user_id, email: u.email, username: u.username }
      });
    }

    // Everything below needs a token.
    const me = auth(req);
    if (!me) {
      return res.status(401).json({ success: false, error: 'Please log in again.' });
    }

    if (action === 'groups' && req.method === 'GET') {
      return res.json({ success: true, groups: await groupsFor(me.user_id) });
    }

    if (action === 'groups' && req.method === 'POST') {
      const name = String(b.name || '').trim().slice(0, 60) || 'My Group';
      let hours = parseInt(b.hours, 10);
      if (!hours || hours < 1) hours = 12;
      if (hours > 168) hours = 168;

      let code = '';
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = makeCode(6);
        const clash = await sql.query('SELECT group_id FROM groups WHERE join_code = $1', [candidate]);
        if (clash.rows.length === 0) { code = candidate; break; }
      }
      if (!code) code = makeCode(8);

      const g = await sql.query(
        `INSERT INTO groups (creator_user_id, group_name, join_code, member_count, expires_at, is_active)
         VALUES ($1, $2, $3, 1, NOW() + ($4 || ' hours')::interval, true)
         RETURNING group_id`,
        [me.user_id, name, code, String(hours)]
      );
      const groupId = g.rows[0].group_id;
      await sql.query(
        'INSERT INTO group_members (group_id, user_id, color, is_active) VALUES ($1, $2, $3, true)',
        [groupId, me.user_id, '#3B82F6']
      );

      return res.json({
        success: true,
        join_code: code,
        group_id: groupId,
        group_name: name,
        groups: await groupsFor(me.user_id)
      });
    }

    if (action === 'join' && req.method === 'POST') {
      const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (!code) {
        return res.status(400).json({ success: false, error: 'Enter an invite code.' });
      }
      const g = await sql.query(
        'SELECT group_id, group_name, max_capacity, expires_at, is_active FROM groups WHERE join_code = $1',
        [code]
      );
      if (g.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'That code does not match any group.' });
      }
      const grp = g.rows[0];
      if (grp.is_active === false) {
        return res.status(410).json({ success: false, error: 'That group is closed.' });
      }
      if (grp.expires_at && new Date(grp.expires_at) < new Date()) {
        return res.status(410).json({ success: false, error: 'That invite has expired.' });
      }

      const already = await sql.query(
        'SELECT group_member_id, is_active FROM group_members WHERE group_id = $1 AND user_id = $2',
        [grp.group_id, me.user_id]
      );
      if (already.rows.length > 0) {
        if (already.rows[0].is_active === false) {
          await sql.query('UPDATE group_members SET is_active = true WHERE group_member_id = $1', [already.rows[0].group_member_id]);
        }
      } else {
        const count = await sql.query(
          'SELECT COUNT(*)::int AS n FROM group_members WHERE group_id = $1 AND COALESCE(is_active, true) = true',
          [grp.group_id]
        );
        if (count.rows[0].n >= (grp.max_capacity || 15)) {
          return res.status(409).json({ success: false, error: 'That group is full.' });
        }
        await sql.query(
          'INSERT INTO group_members (group_id, user_id, color, is_active) VALUES ($1, $2, $3, true)',
          [grp.group_id, me.user_id, '#10B981']
        );
        await sql.query('UPDATE groups SET member_count = member_count + 1 WHERE group_id = $1', [grp.group_id]);
      }

      return res.json({
        success: true,
        group_id: grp.group_id,
        group_name: grp.group_name,
        groups: await groupsFor(me.user_id)
      });
    }

    if (action === 'location' && req.method === 'POST') {
      // Explicit stop, or a push with no live window: clear the stored position.
      // The client sends this the moment sharing turns off, even before it has a fix.
      const until = b.sharing_until ? new Date(b.sharing_until) : null;
      const validUntil = until && !isNaN(until.getTime()) && until.getTime() > Date.now();

      if (b.clear === true || !validUntil) {
        await clearLocation(me.user_id);
        return res.json({ success: true, groups: await groupsFor(me.user_id) });
      }

      const lat = Number(b.latitude);
      const lon = Number(b.longitude);
      if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({ success: false, error: 'Bad coordinates.' });
      }

      await sql.query(
        `UPDATE group_members
            SET latitude = $1, longitude = $2, sharing_until = $3, last_location_update = NOW()
          WHERE user_id = $4 AND COALESCE(is_active, true) = true`,
        [lat, lon, until.toISOString(), me.user_id]
      );
      return res.json({ success: true, groups: await groupsFor(me.user_id) });
    }

    if (action === 'color' && req.method === 'POST') {
      const color = String(b.color || '').slice(0, 7);
      const groupId = String(b.group_id || '');
      if (!/^#[0-9A-Fa-f]{6}$/.test(color) || !groupId) {
        return res.status(400).json({ success: false, error: 'Bad color.' });
      }
      await sql.query(
        'UPDATE group_members SET color = $1 WHERE group_id = $2 AND user_id = $3',
        [color, groupId, me.user_id]
      );
      return res.json({ success: true, groups: await groupsFor(me.user_id) });
    }

    if (action === 'leave' && req.method === 'POST') {
      const groupId = String(b.group_id || '');
      if (!groupId) {
        return res.status(400).json({ success: false, error: 'Missing group.' });
      }
      await sql.query(
        'UPDATE group_members SET is_active = false, latitude = NULL, longitude = NULL, sharing_until = NULL WHERE group_id = $1 AND user_id = $2',
        [groupId, me.user_id]
      );
      const owner = await sql.query('SELECT creator_user_id FROM groups WHERE group_id = $1', [groupId]);
      if (owner.rows.length > 0 && owner.rows[0].creator_user_id === me.user_id) {
        await sql.query('UPDATE groups SET is_active = false WHERE group_id = $1', [groupId]);
      }
      return res.json({ success: true, groups: await groupsFor(me.user_id) });
    }

    if (action === 'extend' && req.method === 'POST') {
      const groupId = String(b.group_id || '');
      let hours = parseInt(b.hours, 10);
      if (!hours || hours < 1) hours = 12;
      if (hours > 168) hours = 168;
      if (!groupId) {
        return res.status(400).json({ success: false, error: 'Missing group.' });
      }
      await sql.query(
        `UPDATE groups
            SET expires_at = GREATEST(COALESCE(expires_at, NOW()), NOW()) + ($1 || ' hours')::interval
          WHERE group_id = $2 AND creator_user_id = $3`,
        [String(hours), groupId, me.user_id]
      );
      return res.json({ success: true, groups: await groupsFor(me.user_id) });
    }

    if (action === 'me' && req.method === 'GET') {
      const r = await sql.query('SELECT user_id, email, username FROM users WHERE user_id = $1', [me.user_id]);
      return res.json({ success: true, user: r.rows[0] || null, groups: await groupsFor(me.user_id) });
    }

    return res.status(404).json({ success: false, error: 'Unknown request.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Something went wrong.' });
  }
}
