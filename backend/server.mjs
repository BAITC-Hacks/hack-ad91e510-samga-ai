import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {analyze,ApiError} from './ai.mjs';
import {requestSchema,analysisSchema,simulateSchema,validateSchema,validateRequest} from './contracts.mjs';
import {runSimulation} from './simulator-adapter.mjs';
import {validate} from '../docs/brief-analysis/dist/model.mjs';
async function readJson(req) {
  if (req.headers['content-type']?.split(';')[0].trim()!=='application/json') throw new ApiError(415,'CONTENT_TYPE','Используйте application/json.');
  const chunks=[];let size=0;
  for await (const chunk of req) {
    size+=chunk.length;
    if (size>65536) throw new ApiError(413,'BODY_TOO_LARGE','Максимальный размер JSON — 64 KiB.');
    chunks.push(chunk);
  }
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
  catch {throw new ApiError(400,'INVALID_JSON','Некорректный JSON.');}
}
export function createApp(config={}) {
  let active=0;
  return createServer(async (req,res)=>{
    const requestId=randomUUID();
    const send=(status,body)=>{
      res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Request-Id':requestId});
      res.end(JSON.stringify(body));
    };
    try {
      const origin=req.headers.origin;
      if (origin) {
        if (origin!==config.frontendOrigin) throw new ApiError(403,'ORIGIN_DENIED','Источник запроса не разрешён.');
        res.setHeader('Access-Control-Allow-Origin',origin);
        res.setHeader('Vary','Origin');
        res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers','Content-Type');
      }
      if (req.method==='OPTIONS') {res.writeHead(204);res.end();return;}
      if (req.method==='GET' && req.url==='/api/health') return send(200,{status:'ok',contractVersion:'1',aiMode:config.mode ?? 'openai',aiConfigured:Boolean(config.apiKey && config.model)});
      if (req.method==='GET' && req.url==='/api/contracts') return send(200,{requestSchema,analysisSchema,simulateSchema});
      if (!['/api/simulate','/api/analyze'].includes(req.url)) throw new ApiError(404,'NOT_FOUND','Маршрут не найден.');
      if (req.method!=='POST') {res.setHeader('Allow','POST');throw new ApiError(405,'METHOD_NOT_ALLOWED','Используйте POST.');}
      const input=await readJson(req);
      if (req.url==='/api/simulate') {
        const errors=validateSchema(input,simulateSchema);
        if (errors.length) throw new ApiError(422,'VALIDATION_ERROR','Проверьте решения.',errors);
        const result=runSimulation(input.choices);
        if (result.errors) throw new ApiError(422,'INVALID_SCENARIO','Набор решений недопустим.',result.errors);
        return send(200,result);
      }
      const errors=validateRequest(input);
      if (!errors.length) errors.push(...validate(input.choices));
      if (errors.length) throw new ApiError(422,'VALIDATION_ERROR','Проверьте JSON simulator.',errors);
      if (active>=2) throw new ApiError(429,'AI_BUSY','AI занят. Повторите позже.');
      active++;
      try {
        const result=await analyze(input,config);
        return send(200,{contractVersion:'1',scenarioId:input.scenarioId,score:input.result.score,...result});
      } finally {active--;}
    } catch(error) {
      const known=error instanceof ApiError;
      send(known?error.status:500,{error:{code:known?error.code:'INTERNAL_ERROR',message:known?error.message:'Внутренняя ошибка сервера.',requestId,...(known && error.details?{details:error.details}:{})}});
    }
  });
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const port=Number(process.env.PORT ?? 3001);
  const mode=process.env.AI_MODE ?? 'openai';
  if (!['demo','openai'].includes(mode)) throw new Error('AI_MODE must be openai or demo');
  if (!Number.isInteger(port) || port<1 || port>65535) throw new Error('PORT must be 1..65535');
  const app=createApp({mode,apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL,
    frontendOrigin:process.env.FRONTEND_ORIGIN ?? 'http://127.0.0.1:4193'});
  app.requestTimeout=30000;
  app.listen(port,'127.0.0.1',()=>console.log('SAMGA API http://127.0.0.1:'+port+' ('+mode+')'));
}
