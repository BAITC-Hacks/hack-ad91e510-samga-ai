import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createFrontendServer } from '../dev-server.mjs';

async function serve(server, t) {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}
test('demo HTTP API serves the UI and only exposes browser assets', async t => {
  const origin = await serve(createFrontendServer({apiOrigin:''}),t);
  assert.equal((await fetch(origin)).status,200);
  const data = await (await fetch(`${origin}/catalog.json`)).json();
  assert.equal(data.measures.length,14);
  assert.equal(data.districts.length,5);
  assert.equal((await fetch(`${origin}/services/demo-api.mjs`)).status,404);
  assert.equal((await fetch(`${origin}/dev-server.mjs`)).status,404);
  assert.equal((await fetch(`${origin}/shared/model.mjs`)).status,404);
  assert.equal((await fetch(`${origin}/api/evaluate`,{method:'POST',body:'{}'})).status,403);
  const headers = {'Content-Type':'application/json','X-Samga-Request':'1'};
  assert.equal((await fetch(`${origin}/api/evaluate`,{method:'POST',headers,body:'{broken'})).status,400);
  assert.equal((await fetch(`${origin}/api/evaluate`,{method:'POST',headers,body:'null'})).status,422);
  assert.equal((await fetch(`${origin}/api/evaluate`,{method:'POST',headers:{...headers,Origin:'https://elsewhere.example'},body:'{}'})).status,403);
  assert.equal((await fetch(`${origin}/api/evaluate`,{method:'POST',headers,body:' '.repeat(17000)})).status,413);
});
test('backend proxy preserves cookies, request validation and non-success responses', async t => {
  const received = [];
  const upstream = await serve(createServer(async (req,res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    received.push({ path:req.url, method:req.method, cookie:req.headers.cookie, marker:req.headers['x-samga-request'], origin:req.headers.origin, body });
    res.setHeader('Content-Type','application/json');
    if (req.url === '/api/auth/guest') {
      res.setHeader('Set-Cookie','samga_session=example; Path=/; HttpOnly; SameSite=Strict');
      res.end(JSON.stringify({user:{name:'Гость'}}));
    } else { res.statusCode = 422; res.end(JSON.stringify({error:'Нужно ровно 5 решений.'})); }
  }),t);
  const origin = await serve(createFrontendServer({apiOrigin:upstream}),t);
  const headers = {'Content-Type':'application/json','X-Samga-Request':'1',Origin:origin};
  const login = await fetch(`${origin}/api/auth/guest`,{method:'POST',headers,body:'{}'});
  assert.match(login.headers.get('set-cookie'),/samga_session=example/);
  const response = await fetch(`${origin}/api/evaluate`,{method:'POST',headers:{...headers,Cookie:'samga_session=example'},body:'{"choices":[]}'});
  assert.equal(response.status,422);
  assert.match((await response.json()).error,/5 решений/);
  assert.equal(received[1].cookie,'samga_session=example');
  assert.equal(received[1].marker,'1');
  assert.equal(received[1].origin,undefined);
  assert.deepEqual(JSON.parse(received[1].body),{choices:[]});
});
