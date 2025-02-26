const ApiResponse = require("../config/apiResponse");

const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err);
  return ApiResponse.error(res, err, "Internal Server Error", 500);
};

module.exports = errorHandler;