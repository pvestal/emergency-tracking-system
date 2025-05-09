// Simplified development server for emergency-tracking-system
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Create simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request: ${req.url}`);
  
  // Serve placeholder.html for all routes to support SPA (until we have a built app)
  if (req.url === '/' || !path.extname(req.url)) {
    serveFile(res, 'placeholder.html');
    return;
  }
  
  // Handle file requests
  let filePath = path.join(PUBLIC_DIR, req.url);
  if (fs.existsSync(filePath)) {
    serveFile(res, req.url);
  } else {
    res.writeHead(404);
    res.end('File not found');
  }
});

// Helper function to serve files
function serveFile(res, fileName) {
  const filePath = path.join(PUBLIC_DIR, fileName);
  const extname = path.extname(filePath);
  
  // Set content type based on file extension
  const contentType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  }[extname] || 'application/octet-stream';
  
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  } catch (e) {
    console.error(`Error serving ${filePath}:`, e);
    res.writeHead(500);
    res.end('Internal server error');
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`
======================================================
 ✅ Minimal development server running on port ${PORT}
 🌐 Open http://localhost:${PORT} in your browser
 📁 Serving files from ${PUBLIC_DIR}
======================================================
`);
});