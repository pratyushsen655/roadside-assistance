const http = require('http');
const net = require('net');
const PORT = 3000;

// Simple health endpoint
const requestListener = (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date() }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
};

const server = http.createServer(requestListener);

server.listen(PORT, () => {
  console.log(`\x1b[32m[PASS]\x1b[0m Server listening on http://localhost:${PORT}`);
  // Test MongoDB connectivity
  const mongoClient = net.createConnection({ host: '127.0.0.1', port: 27017 }, () => {
    console.log(`\x1b[32m[PASS]\x1b[0m MongoDB reachable on localhost:27017`);
    mongoClient.end();
  });
  mongoClient.on('error', (err) => {
    console.error(`\x1b[31m[FAIL]\x1b[0m MongoDB not reachable: ${err.message}`);
  });
});
