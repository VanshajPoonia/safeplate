// Runs api/check.js on plain Node, for local testing or any host that runs Node.
// npm run api, then POST to http://localhost:8787/api/check
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import * as handlers from '../api/check.js';

export function apiServer() {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/api/check') {
      res.writeHead(404, { 'content-type': 'application/json' }).end('{"error":"Not found. Use /api/check."}');
      return;
    }
    const handler = handlers[req.method];
    if (!handler) {
      res.writeHead(405, { allow: 'GET, POST, OPTIONS' }).end();
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = ['GET', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(chunks);
    const response = await handler(new Request(url, { method: req.method, headers: req.headers, body }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 8787;
  apiServer().listen(port, () => console.log(`SafePlate API on http://localhost:${port}/api/check`));
}
