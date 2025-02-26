require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const logger = require("./config/logger");
const pool = require("./config/database");
const { checkDatabaseConnection } = pool;
const dataRoutes = require("./routes/dataRoute");
const errorHandler = require("./middlewares/errorHandler");
const mqttClient = require("./config/mqttClient");
const unknownEndpoint = require("./middlewares/unknownEndpoint");
const ENV = require("./config/env");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Apply CORS before any other middleware
app.use(cors(corsOptions));
// Security middleware
app.use(helmet());
app.disable("x-powered-by");
// Body parser
app.use(express.json());
// Logging middleware
app.use(morgan("dev"));

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbStatus = await checkDatabaseConnection();
    const mqttStatus = mqttClient.connected;

    const health = {
      status: dbStatus && mqttStatus ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus ? "connected" : "disconnected",
        mqtt: mqttStatus ? "connected" : "disconnected"
      }
    };

    res.status(health.status === "healthy" ? 200 : 503).json(health);
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.use("/api", dataRoutes);

// Error handling
app.use('*', unknownEndpoint);
app.use(errorHandler);

let server;

async function startServer() {
  try {
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      logger.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }

    server = app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Accepting requests from: ${corsOptions.origin}`);
    });

    server.on("error", (error) => {
      logger.error("Server error:", error);
      process.exit(1);
    });

  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
    });
  }

  const shutdownTimeout = setTimeout(() => {
    logger.error("Could not close connections in time, forcefully shutting down");
    process.exit(1);
  }, 10000);

  shutdownTimeout.unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  shutdown("unhandledRejection");
});

startServer();