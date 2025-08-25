// CommonJS wrapper to load server/server.js when the repo uses ESM at root
try {
  require('./server.js');
} catch (err) {
  console.error('Failed to start server via CommonJS wrapper:', err);
  process.exit(1);
}
