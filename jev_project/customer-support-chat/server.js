// Servidor mínimo (sin dependencias): sirve los archivos estáticos y reenvía
// las consultas a Jev añadiendo la API key, que nunca llega al navegador.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

// Carga .env (KEY=valor) sin librerías.
try {
  for (const line of (await readFile(join(ROOT, '.env'), 'utf8')).split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && !line.trim().startsWith('#') && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
} catch { /* .env opcional */ }

const { JEV_API_KEY, JEV_BASE_URL = 'https://api.typesafe.ai', PORT = 3000 } = process.env;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'POST' && url.pathname === '/api/jev') {
    if (!JEV_API_KEY) return send(res, 500, { error: 'Falta JEV_API_KEY en el archivo .env' });
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const upstream = await fetch(`${JEV_BASE_URL}/v1/systemone`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${JEV_API_KEY}`, 'Content-Type': 'application/json' },
        body,
      });
      res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
      return res.end(await upstream.text());
    } catch (err) {
      return send(res, 502, { error: `No se pudo contactar con Jev: ${err.message}` });
    }
  }

  // Archivos estáticos (evita salir de la carpeta del proyecto).
  const path = normalize(url.pathname === '/' ? '/index.html' : url.pathname);
  if (!/^\/(index\.html|css\/|js\/)/.test(path) || path.includes('..')) return send(res, 404, { error: 'No encontrado' });
  try {
    const file = await readFile(join(ROOT, path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(file);
  } catch {
    send(res, 404, { error: 'No encontrado' });
  }
}).listen(PORT, () => console.log(`Chat de soporte en http://localhost:${PORT}`));

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
