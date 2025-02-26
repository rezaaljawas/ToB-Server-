require("dotenv").config();

const ENV = {
  PORT: process.env.PORT || 5000,

  MQTT_BROKER: process.env.MQTT_BROKER,
  MQTT_USERNAME: process.env.MQTT_USERNAME,
  MQTT_PASSWORD: process.env.MQTT_PASSWORD,
  MQTT_TOPIC: process.env.MQTT_TOPIC,

  PG_HOST: process.env.PG_HOST,
  PG_PORT: process.env.PG_PORT,
  PG_DATABASE: process.env.PG_DATABASE,
  PG_USER: process.env.PG_USER,
  PG_PASSWORD: process.env.PG_PASSWORD,

  APP_NAME: process.env.APP_NAME || "ExpressApp",
  NODE_ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
};

module.exports = ENV;