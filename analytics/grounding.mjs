import {buildFacts,MODEL_INFO} from './scenarios.mjs';
import {evidenceFor} from './evidence.mjs';
const NEXT_ACTIONS=['compare','optimize','evidence'];
export function groundingSchema(snapshot){
 const ids=buildFacts(snapshot).map(f=>f.id);
 const list={type:'array',items:{type:'string',enum:ids},minItems:0,maxItems:5};
 return {type:'object',additionalProperties:false,required:['strengthIds','riskIds','nextAction'],
 properties:{strengthIds:list,riskIds:list,nextAction:{type:'string',enum:NEXT_ACTIONS}}};
}
export function validateGrounding(selection,snapshot){
 const facts=buildFacts(snapshot),byId=new Map(facts.map(f=>[f.id,f])),errors=[];
 if(!selection||typeof selection!=='object'||Array.isArray(selection))return ['Expected object'];
 if(Object.keys(selection).some(k=>!['strengthIds','riskIds','nextAction'].includes(k)))errors.push('Unknown field');
 for(const key of ['strengthIds','riskIds']){
  const ids=selection[key];if(!Array.isArray(ids)||ids.length>5){errors.push('Invalid fact list');continue;}
  if(new Set(ids).size!==ids.length)errors.push('Duplicate facts');
  for(const id of ids){
   const f=byId.get(id);if(!f){errors.push('Unknown fact');continue;}
   if(key==='strengthIds'&&f.polarity!=='positive')errors.push('Fact is not a strength');
   if(key==='riskIds'&&!(f.polarity==='negative'||(id.startsWith('district.')&&f.value<40)))errors.push('Fact is not a risk');
  }
 }
 if(!NEXT_ACTIONS.includes(selection.nextAction))errors.push('Unknown next action');
 return errors;
}
export function defaultSelection(snapshot){
 const facts=buildFacts(snapshot);
 const priority=f=>f.id==='result.score'?1000:f.id==='result.critical'?900:f.before<40&&f.value>=40?800+(f.delta??0):(f.delta??0);
 return {strengthIds:facts.filter(f=>f.polarity==='positive').sort((a,b)=>priority(b)-priority(a)).slice(0,4).map(f=>f.id),
 riskIds:facts.filter(f=>f.polarity==='negative'||(f.id.startsWith('district.')&&f.value<40)).slice(0,4).map(f=>f.id),nextAction:'compare'};
}
export function renderGroundedAnalysis(selection,snapshot){
 const errors=validateGrounding(selection,snapshot);
 if(errors.length)throw new Error('UNGROUNDED_RESPONSE: '+errors.join('; '));
 const facts=buildFacts(snapshot),byId=new Map(facts.map(f=>[f.id,f]));
 const path=id=>id.startsWith('district.')?'result.districts':id.startsWith('synergy.')?'result.synergies':id;
 const finding=id=>({text:byId.get(id).text,evidence:[path(id)]});
 const riskIds=[...new Set([...defaultSelection(snapshot).riskIds,...selection.riskIds])].slice(0,4);
 const next={compare:'Сравните текущий план с альтернативой: улучшение общего Score может сопровождаться потерями отдельного района.',
 optimize:'Выберите цель поиска и обязательные меры. Предложение можно применить после просмотра рассчитанных последствий.',
 evidence:'Откройте источники по выбранным мерам и ограничения применимости международного опыта.'};
 return {analysis:{summary:[byId.get('result.cost').text,byId.get('result.score').text,byId.get('result.critical').text].join(' '),
 strengths:selection.strengthIds.map(finding),
 risks:[...riskIds.map(finding),{text:MODEL_INFO.assumptions[2],evidence:['result.score']}],
 recommendations:[{text:next[selection.nextAction],evidence:['choices']}]},
 grounding:{scenarioId:snapshot.scenarioId,model:MODEL_INFO,facts:selection.strengthIds.concat(riskIds).map(id=>byId.get(id)),
 evidence:evidenceFor(snapshot.choices.map(c=>c.id)),method:'Selected fact IDs are verified; factual text is rendered by the server.'}};
}
