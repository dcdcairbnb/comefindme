// Local replacement for @vercel/postgres, backed by node-postgres (pg).
// The real package refuses direct (non-pooled) connection strings; pg accepts them.
const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    const connectionString =
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL;
    pool = new Pool({
      connectionString: connectionString,
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

function sql(strings, ...values) {
  let text = '';
  strings.forEach(function (s, i) {
    text += s;
    if (i < values.length) { text += '$' + (i + 1); }
  });
  return getPool().query(text, values);
}

sql.query = function (text, params) {
  return getPool().query(text, params);
};

const db = {
  sql: sql,
  query: function (text, params) { return getPool().query(text, params); },
  connect: function () { return getPool().connect(); },
  end: function () { return getPool().end(); }
};

function createClient() { return db; }
function createPool() { return db; }

module.exports = { sql, db, createClient, createPool, VercelPostgresError: Error };
module.exports.default = module.exports;
