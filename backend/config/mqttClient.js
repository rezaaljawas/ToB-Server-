const mqtt = require("mqtt");
const pool = require("./database");
const ENV = require("./env");
const logger = require("./logger");

let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;

const mqttOptions = {
  username: ENV.MQTT_USERNAME,
  password: ENV.MQTT_PASSWORD,
  reconnectPeriod: RECONNECT_DELAY,
  keepalive: 60,
  clean: true,
  clientId: `${ENV.APP_NAME}_${Math.random().toString(16).substring(2, 8)}`,
  connectTimeout: 30 * 1000,
  rejectUnauthorized: false // Add this if you're having SSL/TLS issues
};

const client = mqtt.connect(ENV.MQTT_BROKER, mqttOptions);

function handleMqttConnection() {
  client.on("connect", () => {
    isConnected = true;
    reconnectAttempts = 0;
    logger.info("Connected to MQTT broker");
    subscribeTopic();
  });

  client.on("reconnect", () => {
    reconnectAttempts++;
    logger.warn(`Attempting to reconnect to MQTT broker (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error("Max reconnection attempts reached. Exiting...");
      process.exit(1);
    }
  });

  client.on("offline", () => {
    isConnected = false;
    logger.warn("MQTT client is offline");
  });

  client.on("error", (err) => {
    logger.error("MQTT Client Error:", err.message);
    if (err.code === 'ECONNREFUSED') {
      logger.error("Connection refused. Check if the MQTT broker is running and accessible.");
    }
  });

  client.on("close", () => {
    isConnected = false;
    logger.warn("MQTT Connection Closed");
  });
}

function subscribeTopic() {
  client.subscribe(ENV.MQTT_TOPIC, { qos: 1 }, (err) => {
    if (err) {
      logger.error("MQTT Subscription Failed:", err.message);
    } else {
      logger.info(`Subscribed to topic: ${ENV.MQTT_TOPIC}`);
    }
  });
}

async function insertSensorData(data) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const query = `
      INSERT INTO sensor_data (temperature_inside, temperature_outside, voltage, current, power, soc)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `;

    const values = [
      data.temperature_inside,
      data.temperature_outside,
      data.voltage,
      data.current,
      data.power,
      data.soc,
    ];

    const result = await client.query(query, values);
    
    await client.query('COMMIT');
    logger.info(`Data inserted successfully with ID: ${result.rows[0].id}`, {
      sensorData: data // Log the sensor data
    });
    
    return result.rows[0].id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

client.on("message", async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    
    // Validate required fields
    const requiredFields = ['temperature_inside', 'temperature_outside', 'voltage', 'current', 'power', 'soc'];
    const missingFields = requiredFields.filter(field => data[field] === undefined);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    await insertSensorData(data);
  } catch (err) {
    logger.error("MQTT Message Error:", err.message);
    
    try {
      await pool.query(
        'INSERT INTO sensor_logs (message) VALUES ($1)',
        [`Error processing message: ${err.message}`]
      );
    } catch (logErr) {
      logger.error("Failed to log error to database:", logErr.message);
    }
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

async function handleShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    client.end(true, () => {
      logger.info('MQTT connection closed');
    });

    await pool.end();
    logger.info('Database connection pool closed');

    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// Initialize MQTT connection handling
handleMqttConnection();

module.exports = client;