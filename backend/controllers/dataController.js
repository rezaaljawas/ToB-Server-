const pool = require("../config/database");

exports.getData = async (req, res, next) => {
  try {
    const { limit = 10, page = 1, all = false } = req.query;

    let result;

    if (all === "true") {
      const query = `
        SELECT * FROM sensor_data 
        WHERE timestamp = (SELECT MAX(timestamp) FROM sensor_data)
        ORDER BY timestamp DESC;
      `;

      result = await pool.query(query);
    } else {
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM sensor_data
        WHERE timestamp >= (SELECT MAX(timestamp) - INTERVAL '1 day' FROM sensor_data)
        ORDER BY timestamp DESC
        LIMIT $1 OFFSET $2;
      `;

      result = await pool.query(query, [parseInt(limit), parseInt(offset)]);
    }

    res.json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};
