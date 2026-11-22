const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', process.env.PREVIEW_ROOT || 'dist');
const port = Number(process.env.PORT || 4180);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2' };

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname}`);
  const target = file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()
    ? file : path.join(root, 'index.html');
  response.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
  fs.createReadStream(target).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}/inicio`));
