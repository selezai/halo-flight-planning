import http from 'http';

const hostname = '127.0.0.1';
const port = 3004; // Using a new, clean port

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Plain HTTP server is running');
});

server.listen(port, hostname, () => {
  console.log(`Plain HTTP server running at http://${hostname}:${port}/`);
});

server.on('error', (err) => {
    console.error('Server runtime error:', err);
});

// Keep-alive to be absolutely sure the event loop doesn't empty
setInterval(() => {}, 1 << 30); // This creates a long-lived timer
