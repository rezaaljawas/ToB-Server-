const logger = require("../config/logger");
const ApiResponse = require("../config/apiResponse");

const unknownEndpoint = (req, res, next) => {
  logger.error(`[UNKNOWN ENDPOINT] ${req.method} ${req.url}`);
  ApiResponse.notFound(res, `Endpoint not found: ${req.method} ${req.url}`);
};

module.exports = unknownEndpoint;
