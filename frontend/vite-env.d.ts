/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_MQTT_BROKER: string;
    readonly VITE_MQTT_TOPIC: string;
    readonly VITE_MQTT_USERNAME?: string;
    readonly VITE_MQTT_PASSWORD?: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  