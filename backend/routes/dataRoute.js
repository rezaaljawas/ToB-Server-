const express = require("express");
const pool = require("../config/database");
const ApiResponse = require("../config/apiResponse");
const logger = require("../config/logger");

const router = express.Router();

router.get("/data", async (req, res) => {
  try {
    let { limit = 10, page = 1, startDate, endDate } = req.query;
    limit = parseInt(limit);
    page = parseInt(page);

    if (isNaN(limit) || limit <= 0) {
      return ApiResponse.badRequest(
        res,
        "Invalid 'limit' parameter. It must be a positive integer."
      );
    }

    if (isNaN(page) || page <= 0) {
      return ApiResponse.badRequest(
        res,
        "Invalid 'page' parameter. It must be a positive integer."
      );
    }

    const offset = (page - 1) * limit;
    let queryParams = [limit, offset];
    let query = `
      SELECT 
        sd.*,
        COUNT(*) OVER() as total_count
      FROM sensor_data sd
      WHERE 1=1
    `;

    if (startDate) {
      queryParams.push(startDate);
      query += ` AND timestamp >= $${queryParams.length}`;
    }

    if (endDate) {
      queryParams.push(endDate);
      query += ` AND timestamp <= $${queryParams.length}`;
    }

    query += " ORDER BY timestamp DESC LIMIT $1 OFFSET $2";

    const result = await pool.query(query, queryParams);

    const totalCount =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return ApiResponse.success(res, "Data fetched successfully", {
      data: result.rows.map((row) => {
        const { total_count, ...data } = row;
        return data;
      }),
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_records: totalCount,
        records_per_page: limit,
      },
    });
  } catch (error) {
    logger.error("Error fetching data:", error);
    return ApiResponse.error(res, error);
  }
});

router.get("/logs", async (req, res) => {
  try {
    let { limit = 10, page = 1 } = req.query;
    limit = parseInt(limit);
    page = parseInt(page);

    if (isNaN(limit) || limit <= 0) {
      return ApiResponse.badRequest(
        res,
        "Invalid 'limit' parameter. It must be a positive integer."
      );
    }

    if (isNaN(page) || page <= 0) {
      return ApiResponse.badRequest(
        res,
        "Invalid 'page' parameter. It must be a positive integer."
      );
    }

    const offset = (page - 1) * limit;
    const query = `
        SELECT 
          sl.*,
          COUNT(*) OVER() as total_count
        FROM sensor_logs sl
        ORDER BY timestamp DESC
        LIMIT $1 OFFSET $2;
      `;

    const result = await pool.query(query, [limit, offset]);

    const totalCount =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    return ApiResponse.success(res, "Logs fetched successfully", {
      data: result.rows.map((row) => {
        const { total_count, ...log } = row;
        return log;
      }),
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_records: totalCount,
        records_per_page: limit,
      },
    });
  } catch (error) {
    logger.error("Error fetching logs:", error);
    return ApiResponse.error(res, error);
  }
});

router.delete("/data", async (req, res) => {
  try {
    const query = "TRUNCATE TABLE sensor_data";
    await pool.query(query);

    return ApiResponse.success(
      res,
      "All sensor data has been deleted successfully",
      {
        data: null,
      }
    );
  } catch (error) {
    logger.error("Error deleting sensor data:", error);
    return ApiResponse.error(res, error);
  }
});

module.exports = router;
