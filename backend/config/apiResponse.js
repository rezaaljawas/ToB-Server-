const logger = require("./logger");

const MESSAGES = {
  SUCCESS: {
    DEFAULT: "Operation completed successfully",
    CREATED: "Resource created successfully",
    UPDATED: "Resource updated successfully",
    DELETED: "Resource deleted successfully",
  },
  ERROR: {
    DEFAULT: "An unexpected error occurred",
    VALIDATION: "Validation failed",
    NOT_FOUND: "Resource not found",
    UNAUTHORIZED: "Unauthorized access",
    FORBIDDEN: "Access forbidden",
    BAD_REQUEST: "Bad request",
    CONFLICT: "Resource conflict",
    SERVER_ERROR: "Internal server error",
  },
};

const STATUS_CODES = {
  SUCCESS: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

class ApiResponse {
  static success(res, message = MESSAGES.SUCCESS.DEFAULT, data = null, statusCode = STATUS_CODES.SUCCESS) {
    logger.info({ message, statusCode, data }, "API Success Response");

    return res.status(statusCode).json({
      status: "success",
      message,
      ...(data !== null && { data }),
      timestamp: new Date().toISOString(),
    });
  }

  static created(res, data, message = MESSAGES.SUCCESS.CREATED) {
    return this.success(res, message, data, STATUS_CODES.CREATED);
  }

  static noContent(res) {
    logger.info({ statusCode: STATUS_CODES.NO_CONTENT }, "API No Content Response");
    return res.status(STATUS_CODES.NO_CONTENT).end();
  }

  static error(res, error, defaultMessage = MESSAGES.ERROR.DEFAULT, statusCode = STATUS_CODES.SERVER_ERROR) {
    let errorMessage = defaultMessage;
    let errorDetails = null;
    let errorCode = statusCode;

    if (error instanceof Error) {
      errorMessage = error.message || defaultMessage;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    logger.error({ error, message: errorMessage, statusCode: errorCode, details: errorDetails }, "API Error Response");

    return res.status(errorCode).json({
      status: "error",
      message: errorMessage,
      ...(errorDetails ? { errors: errorDetails } : {}),
      timestamp: new Date().toISOString(),
    });
  }

  static badRequest(res, message = MESSAGES.ERROR.BAD_REQUEST, error = null) {
    return this.error(res, error || new Error(message), message, STATUS_CODES.BAD_REQUEST);
  }

  static unauthorized(res, message = MESSAGES.ERROR.UNAUTHORIZED) {
    return this.error(res, new Error(message), message, STATUS_CODES.UNAUTHORIZED);
  }

  static notFound(res, message = MESSAGES.ERROR.NOT_FOUND, resource = null) {
    const errorMessage = resource ? `${message}: ${resource}` : message;
    return this.error(res, new Error(errorMessage), errorMessage, STATUS_CODES.NOT_FOUND);
  }

  static forbidden(res, message = MESSAGES.ERROR.FORBIDDEN) {
    return this.error(res, new Error(message), message, STATUS_CODES.FORBIDDEN);
  }
}

module.exports = ApiResponse;