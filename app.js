const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4001;

// Define the log file path
const logFilePath = path.join(__dirname, 'requests.log');

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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
