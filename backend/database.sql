CREATE DATABASE nutech_onbusvalidator;

CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    temperature_inside FLOAT NOT NULL,
    temperature_outside FLOAT NOT NULL,
    voltage FLOAT NOT NULL,
    current FLOAT NOT NULL,
    power FLOAT NOT NULL,
    soc FLOAT NOT NULL
);

CREATE TABLE sensor_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL
);

CREATE INDEX idx_timestamp ON sensor_data(timestamp);