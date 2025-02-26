const pino = require("pino");
const ENV = require("./env");

const logger = pino({
  name: ENV.APP_NAME,
  level: ENV.LOG_LEVEL,
  transport:
    ENV.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  ...(ENV.NODE_ENV === "production"
    ? {
        formatters: {
          level: (label) => {
            return { level: label };
          },
        },
        redact: ["password", "secret", "token"],
      }
    : {}),
});

module.exports = logger;