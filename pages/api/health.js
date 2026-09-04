import { sql } from '@vercel/postgres';

// A real health check: touch the database, because every failure mode of this
// service is a database failure. A static "ok" would stay green through an outage.
export default async function handler(req, res) {
  try {
    await sql.query('SELECT 1');
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'degraded', timestamp: new Date().toISOString() });
  }
}
