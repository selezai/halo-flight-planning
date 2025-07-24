import express from 'express';

const app = express();
const port = 3003; // Using a new, clean port

app.get('/', (req, res) => {
  res.send('Minimal test server is running!');
});

const server = app.listen(port, (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    return;
  }
  console.log(`Minimal test server listening on port ${port}`);
});

server.on('error', (err) => {
  console.error('Server runtime error:', err);
});
