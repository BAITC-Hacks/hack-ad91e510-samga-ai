import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {staticResponse} from './static.mjs';
import {analyze,ApiError} from './ai.mjs';
import {assist} from './assistant.mjs';
import {requestSchema,analysisSchema,simulateSchema,validateSchema,validateRequest} from './contracts.mjs';
import {runSimulation} from './simulator-adapter.mjs';
import {verifyScenario,calculateScenario,compareScenarios,MODEL_INFO,validateChoices} from '../analytics/scenarios.mjs';
import {defaultSelection,renderGroundedAnalysis} from '../analytics/grounding.mjs';
import {searchPlans} from '../analytics/search.mjs';
import {evidenceFor} from '../analytics/evidence.mjs';
import {districts,measures,indicators,groups} from '../docs/brief-analysis/dist/data.mjs';
import {simulate as simulateBaseline} from '../docs/brief-analysis/dist/model.mjs';
import {buildBrief,renderBriefHtml} from '../briefing/report.mjs';
async function readJson(req){
 if(req.headers['content-type']?.split(';')[0].trim()!=='application/json')throw new ApiError(415,'CONTENT_TYPE','Используйте application/json.');
 const chunks=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>65536)throw new ApiError(413,'BODY_TOO_LARGE','Максимальный размер JSON — 64 KiB.');chunks.push(chunk);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
 catch{throw new ApiError(400,'INVALID_JSON','Некорректный JSON.');}
}
const postPaths=['/api/simulate','/api/analyze','/api/compare','/api/search','/api/facts','/api/evidence','/api/assistant','/api/brief'];
function baseline(){
 const {districts:districtSnapshots,...snapshot}=simulateBaseline([]);
 return {...snapshot,districts:districtSnapshots.map(({profile,...district})=>district)};
}
function only(input,keys){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k)))
  throw new ApiError(422,'VALIDATION_ERROR','Неожиданные поля запроса.');
}
export function createApp(config={}){
 let active=0;
 const app=createServer(async(req,res)=>{
  const requestId=randomUUID();
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Request-Id':requestId});res.end(JSON.stringify(body));};
  try{
   const origin=req.headers.origin;
   if(origin){
    const sameOrigin=origin==='http://'+req.headers.host&&/^localhost:|^127\.0\.0\.1:/.test(req.headers.host??'');
    if(origin!==config.frontendOrigin&&!sameOrigin)throw new ApiError(403,'ORIGIN_DENIED','Источник запроса не разрешён.');
    res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
   }
   if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
   const requestUrl=new URL(req.url,'http://localhost'),path=requestUrl.pathname;
   if(req.method==='GET'&&path==='/'){res.writeHead(302,{Location:'/demos/astana-city/'+requestUrl.search,'Cache-Control':'no-store'});res.end();return;}
   if(req.method==='GET'){
    const asset=await staticResponse(path);
    if(asset){res.writeHead(200,{'Content-Type':asset.type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(asset.body);return;}
   }
   if(req.method==='GET'&&req.url==='/api/health')return send(200,{status:'ok',contractVersion:'1',aiMode:config.mode??'openai',aiConfigured:Boolean(config.apiKey&&config.model),modelVersion:MODEL_INFO.version});
   if(req.method==='GET'&&req.url==='/api/contracts')return send(200,{requestSchema,analysisSchema,simulateSchema,model:MODEL_INFO});
   if(req.method==='GET'&&req.url==='/api/catalog')return send(200,{districts,measures,indicators,groups,baseline:baseline(),model:MODEL_INFO});
   if(!postPaths.includes(req.url))throw new ApiError(404,'NOT_FOUND','Маршрут не найден.');
   if(req.method!=='POST'){res.setHeader('Allow','POST');throw new ApiError(405,'METHOD_NOT_ALLOWED','Используйте POST.');}
   const input=await readJson(req);
   if(req.url==='/api/brief'){
    only(input,['choices','comparisonChoices','title']);
    const brief=buildBrief(input);return send(200,{brief,html:renderBriefHtml(brief)});
   }
   if(req.url==='/api/simulate'){
    const errors=validateSchema(input,simulateSchema);
    if(errors.length)throw new ApiError(422,'VALIDATION_ERROR','Проверьте решения.',errors);
    const result=runSimulation(input.choices);
    if(result.errors)throw new ApiError(422,'INVALID_SCENARIO','Набор решений недопустим.',result.errors);
    return send(200,result);
   }
   if(req.url==='/api/compare'){only(input,['left','right']);return send(200,compareScenarios(input.left,input.right));}
   if(req.url==='/api/search')return send(200,await searchPlans(input));
   if(req.url==='/api/evidence'){only(input,['measureIds']);return send(200,evidenceFor(input.measureIds));}
   if(req.url==='/api/facts'){
    only(input,['choices','years']);const s=calculateScenario(input.choices,{years:input.years??2});
    return send(200,{mode:'verified',scenarioId:s.scenarioId,...renderGroundedAnalysis(defaultSelection(s),s)});
   }
   if(req.url==='/api/assistant'){
    only(input,['question','choices','comparisonChoices']);
    const invalid=validateChoices(input.choices);
    if(invalid.length)throw new ApiError(422,'INVALID_SCENARIO','Проверьте решения.',invalid);
    if(input.comparisonChoices&&validateChoices(input.comparisonChoices).length)throw new ApiError(422,'INVALID_SCENARIO','План сравнения недопустим.');
    if(active>=2)throw new ApiError(429,'AI_BUSY','AI занят. Повторите позже.');
    active++;try{return send(200,await assist(input,config));}finally{active--;}
   }
   const errors=validateRequest(input);
   if(errors.length)throw new ApiError(422,'VALIDATION_ERROR','Проверьте JSON simulator.',errors);
   const mismatch=verifyScenario(input);
   if(mismatch.length)throw new ApiError(422,'SCENARIO_MISMATCH','Результат изменён или устарел. Выполните расчёт заново.',mismatch);
   if(active>=2)throw new ApiError(429,'AI_BUSY','AI занят. Повторите позже.');
   active++;try{
    const trusted=calculateScenario(input.choices),result=await analyze(trusted,config);
    return send(200,{contractVersion:'1',scenarioId:trusted.scenarioId,score:trusted.result.score,...result});
   }finally{active--;}
  }catch(error){
   const known=error instanceof ApiError;
   let status=known?error.status:500,code=known?error.code:'INTERNAL_ERROR',message=known?error.message:'Внутренняя ошибка сервера.';
   if(!known){
    for(const prefix of ['INVALID_SCENARIO','INVALID_CONSTRAINTS','INVALID_MEASURE','HORIZON_UNSUPPORTED']){
     if(error.message.startsWith(prefix)){status=422;code=prefix;message=error.message;}
    }
    if(error.message==='SEARCH_BUSY'){status=429;code='SEARCH_BUSY';message='Поиск занят. Повторите позже.';}
    if(error.message==='SEARCH_TIMEOUT'){status=504;code='SEARCH_TIMEOUT';message='Время поиска истекло.';}
   }
   send(status,{error:{code,message,requestId,...(known&&error.details?{details:error.details}:{})}});
  }
 });
 app.requestTimeout=30000;return app;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const port=Number(process.env.PORT??4197),mode=process.env.AI_MODE??'demo';
 if(!['demo','openai'].includes(mode))throw new Error('AI_MODE must be openai or demo');
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be 1..65535');
 const app=createApp({mode,apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL,
 frontendOrigin:process.env.FRONTEND_ORIGIN??'http://127.0.0.1:4197'});
 app.listen(port,'127.0.0.1',()=>console.log('SAMGA AI http://127.0.0.1:'+port+' ('+mode+')'));
}
