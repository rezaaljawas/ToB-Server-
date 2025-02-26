const { Pool } = require("pg");
require("dotenv").config();
const logger = require("./logger");

const poolConfig = {
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7500,
};

const pool = new Pool(poolConfig);

pool.on("error", (err, client) => {
  logger.error("Unexpected database error on idle client:", err);
  process.exit(-1);
});

pool.on("connect", (client) => {
  logger.info("New client connected to database");
});

pool.on("acquire", (client) => {
  logger.debug("Client checked out from pool");
});

pool.on("remove", (client) => {
  logger.info("Client removed from pool");
});

async function checkDatabaseConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT NOW()');
    logger.info("Database connection successful");
    return true;
  } catch (err) {
    logger.error("Database connection failed:", err.message);
    return false;
  } finally {
    if (client) client.release();
  }
}

module.exports = pool;
module.exports.checkDatabaseConnection = checkDatabaseConnection;
