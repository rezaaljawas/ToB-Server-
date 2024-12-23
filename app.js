const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4001;

// Middleware to parse JSON requests
app.use(express.json());

// Define the log file paths
const logFilePath = path.join(__dirname, 'requests.log');
const temperatureLogFilePath = path.join(__dirname, 'temperature.log');

// Function to get Jakarta timestamp
const getJakartaTimestamp = () => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23', // Use 24-hour format
  });
  const parts = formatter.formatToParts(new Date());
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value} ${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;
};

// Endpoint to log hits
app.get('/log', (req, res) => {
  const timestamp = getJakartaTimestamp();
  const logEntry = `Endpoint hit at ${timestamp}\n`;

  // Append the log entry to the file
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
      return res.status(500).send('Failed to log the request');
    }

    console.log('Log entry added:', logEntry.trim());
    res.send('Request logged successfully!');
  });
});

// Endpoint to get the latest 100 lines from requests.log
app.get('/latest-logs', (req, res) => {
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading log file:', err);
      return res.status(500).send('Failed to read the log file');
    }

    const lines = data.split('\n'); // Do not trim the data to preserve newlines
    const last100Lines = lines.slice(-100); // Get the last 100 lines
    res.setHeader('Content-Type', 'text/plain'); // Ensure the response is plain text
    res.send(last100Lines.join('\n'));
  });
});

// Endpoint to receive temperature data and log it
app.post('/temperature', (req, res) => {
  const { temperature_inside, temperature_outside } = req.body;
  if (temperature_inside === undefined || temperature_outside === undefined) {
    return res.status(400).send('Invalid request: missing temperature data');
  }

  const timestamp = getJakartaTimestamp();
  const logEntry = `${timestamp} - Inside: ${temperature_inside}C, Outside: ${temperature_outside}C\n`;

  fs.appendFile(temperatureLogFilePath, logEntry, (err) => {
    if (err) {
      console.error('Error writing to temperature log file:', err);
      return res.status(500).send('Failed to log the temperature data');
    }

    console.log('Temperature log entry added:', logEntry.trim());
    res.send('Temperature data logged successfully!');
  });
});

// Endpoint to get the latest 100 temperature logs
app.get('/latest-temperature-logs', (req, res) => {
  fs.readFile(temperatureLogFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading temperature log file:', err);
      return res.status(500).send('Failed to read the temperature log file');
    }

    const lines = data.split('\n');
    const last100Lines = lines.slice(-100); // Get the last 100 lines
    res.setHeader('Content-Type', 'text/plain');
    res.send(last100Lines.join('\n'));
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});