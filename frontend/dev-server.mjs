import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measures, indicators, districts } from '../docs/brief-analysis/dist/data.mjs';
import { demoResponse } from './services/demo-api.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const mime = { '.html':'text/html; charset=utf-8', '.mjs':'text/javascript; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml' };
export function createFrontendServer({ apiOrigin = process.env.SAMGA_API_ORIGIN } = {}) {
  if (apiOrigin && !/^https?:$/.test(new URL(apiOrigin).protocol)) throw new Error('SAMGA_API_ORIGIN must be an HTTP(S) URL.');
  return createServer(async (req, res) => {
    const json = (status, data) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (path.startsWith('/api/')) {
        if (!['GET', 'POST'].includes(req.method)) return json(405, { error: 'Метод не разрешён.' });
        if (req.method === 'POST' && (req.headers['x-samga-request'] !== '1' || !req.headers['content-type']?.startsWith('application/json') || (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host))) return json(403, { error: 'Недопустимый источник запроса.' });
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 16384) return json(413, { error: 'Запрос слишком большой.' }); }
        if (apiOrigin) {
          const headers = { 'Content-Type':'application/json', 'X-Samga-Request':'1', ...(req.headers.cookie ? { Cookie: req.headers.cookie } : {}) };
          const response = await fetch(new URL(path, apiOrigin), { method:req.method, headers, ...(req.method === 'GET' ? {} : { body:raw }), signal:AbortSignal.timeout(30000), redirect:'error' });
          const cookies = response.headers.getSetCookie();
          if (cookies.length) res.setHeader('Set-Cookie', cookies);
          return json(response.status, await response.json());
        }
        let body;
        try { body = raw ? JSON.parse(raw) : {}; } catch { return json(400, { error: 'Некорректный JSON.' }); }
        const response = demoResponse(path, body);
        return json(response.status, response.data);
      }
      if (!['GET','HEAD'].includes(req.method)) return json(405, { error: 'Метод не разрешён.' });
      if (path === '/catalog.json') return json(200, { measures, indicators, districts });
      const relative = decodeURIComponent(path === '/' ? '/index.html' : path);
      const target = resolve(root, `.${relative}`);
      const allowed = ['index.html','app.mjs','styles.css','control.css','scene.css','blue.css','journey.css','favicon.svg'].includes(relative.slice(1)) || /^\/(components|screens|lib)\/[A-Za-z-]+\.mjs$/.test(relative) || relative === '/services/api.mjs' || relative === '/data/astana-buildings.json' || ['/vendor/three/three.module.min.js','/vendor/three/three.core.min.js','/vendor/three/OrbitControls.js'].includes(relative);
      if (!target.startsWith(root + sep) || !allowed || !mime[extname(target)]) return json(404, { error: 'Страница не найдена.' });
      const data = await readFile(target);
      res.writeHead(200, { 'Content-Type':mime[extname(target)] }); res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) { json(error.code === 'ENOENT' ? 404 : 502, { error: error.code === 'ENOENT' ? 'Страница не найдена.' : 'Сервис временно недоступен. Попробуйте снова.' }); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.FRONTEND_PORT || 4173);
  const server = createFrontendServer();
  server.listen(port, '127.0.0.1', () => console.log(`SAMGA UI: http://127.0.0.1:${port} (${process.env.SAMGA_API_ORIGIN ? 'backend API' : 'demo server model'})`));
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Порт занят. Задайте FRONTEND_PORT.' : error.message); process.exitCode = 1; });
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => { server.close(); server.closeIdleConnections(); });
}
