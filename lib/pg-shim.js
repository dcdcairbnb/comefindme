// Drop-in replacement for @vercel/postgres backed by node-postgres (pg).
// Works with Prisma Postgres and any standard Postgres connection string.
const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    const connectionString =
      process.env.POSTGRES_URL || process.env.DATABASE_URL;
    pool = new Pool({
      connectionString,
      max: 1,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

function sql(strings, ...values) {
  let text = '';
  strings.forEach(function (s, i) {
    text += s;
    if (i < values.length) text += '$' + (i + 1);
  });
  return getPool().query(text, values);
}

sql.query = function (text, params) {
  return getPool().query(text, params);
};

const db = {
  connect: function () { return getPool().connect(); },
  query: function (text, params) { return getPool().query(text, params); },
};

module.exports = { sql, db, createPool: getPool };
