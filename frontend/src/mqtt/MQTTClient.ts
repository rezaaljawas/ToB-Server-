import mqtt from "mqtt";

const MQTT_BROKER = import.meta.env.VITE_MQTT_BROKER;
const MQTT_TOPIC = import.meta.env.VITE_MQTT_TOPIC;

export const connectMQTT = (
  onMessageReceived: (data: any) => void
): Promise<mqtt.MqttClient> => {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(MQTT_BROKER, {
      username: import.meta.env.VITE_MQTT_USERNAME,
      password: import.meta.env.VITE_MQTT_PASSWORD,
      reconnectPeriod: 5000,
    });

    const connectionTimeout = setTimeout(() => {
      client.end();
      reject(new Error("MQTT connection timeout"));
    }, 10000);

    client.on("connect", () => {
      clearTimeout(connectionTimeout);

      client.subscribe(MQTT_TOPIC, (err) => {
        if (err) {
          console.error("MQTT Subscription Failed:", err.message);
          reject(err);
        } else {
          resolve(client);
        }
      });
    });

    client.on("message", (topic, message) => {
      if (topic === MQTT_TOPIC) {
        try {
          const data = JSON.parse(message.toString());
          onMessageReceived({
            ...data,
            rowNumber: Date.now() // Add timestamp as unique row number
          });
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error("MQTT Parsing Error:", err.message);
          }
        }
      }
    });

    client.on("error", (err) => {
      console.error("MQTT Client Error:", err.message);
      reject(err);
    });

    client.on("close", () => {
      reject(new Error("MQTT Connection Closed"));
    });

    client.on("offline", () => {
      reject(new Error("MQTT Client Offline")); 
    });
  });
};
