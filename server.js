import http from 'node:http';
import app from "./app.js";
import config from './src/v1/config/config.js';

// Create the server and Socket.IO instance
const server = http.createServer(app);

// get data from .env file
const port = config.port || "3000";
const host = config.host || "localhost";

// start server
const listenServer = server.listen(port, host, () => {
  console.log(`Listening on http://${listenServer.address().address}:${listenServer.address().port}`);
  console.log(`Listening on http://${host}:${port}`);
  
});