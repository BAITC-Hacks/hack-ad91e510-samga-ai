// Versioned contract. No score calculation belongs here.
const object = properties => ({type:'object', properties, required:Object.keys(properties), additionalProperties:false});
const number = (minimum, maximum) => ({type:'number', minimum, maximum});
const string = {type:'string', minLength:1, maxLength:2000};
const array = (items, minItems=0, maxItems=50) => ({type:'array', items, minItems, maxItems});
const indicatorIds = ['T1','T2','E1','E2','S1','S2','B1','B2','C1','C2'];
const districtName = {type:'string',enum:['Есиль','Алматы','Сарыарка','Байконур','Нура']};
const indicator = {type:'string',enum:indicatorIds};
const snapshot = object({
  cost:number(0,100), score:number(-50,100), average:number(0,100), minimum:number(0,100),
  critical:{type:'integer',minimum:0,maximum:50},
  districts:array(object({name:districtName,pop:number(0,1),
    values:object(Object.fromEntries(indicatorIds.map(id=>[id,number(0,100)]))),
    score:number(0,100),critical:array(indicator,0,10)}),5,5),
  synergies:array(object({pair:string,district:districtName,indicator,bonus:number(0,100)}),0,3),
});
export const choiceSchema = {type:'object',properties:{
  id:{type:'string',enum:Array.from({length:14},(_,i)=>'M'+(i+1))},district:districtName,
},required:['id'],additionalProperties:false};
export const simulateSchema = object({choices:array(choiceSchema,5,5)});
export const requestSchema = object({
  contractVersion:{type:'string',enum:['1']},scenarioId:{type:'string',minLength:1,maxLength:100},
  choices:array(choiceSchema,5,5),baseline:snapshot,result:snapshot,
});
const evidence = {type:'string',enum:['baseline.score','result.score','result.cost','result.average','result.minimum','result.critical','result.districts','result.synergies','choices']};
const finding = object({text:string,evidence:array(evidence,1,9)});
export const analysisSchema = object({
  summary:string,strengths:array(finding,0,5),risks:array(finding,0,5),recommendations:array(finding,0,5),
});
// Implements only the JSON Schema keywords used above.
export function validateSchema(value,schema,path='$') {
  if (schema.anyOf) return schema.anyOf.some(s=>validateSchema(value,s,path).length===0)?[]:[path+': no matching variant'];
  if (schema.type==='null') return value===null?[]:[path+': expected null'];
  const errors=[];
  const valid = schema.type==='object' ? value!==null && typeof value==='object' && !Array.isArray(value)
    : schema.type==='array' ? Array.isArray(value)
    : schema.type==='integer' ? Number.isInteger(value)
    : schema.type==='number' ? typeof value==='number' && Number.isFinite(value)
    : typeof value===schema.type;
  if (!valid) return [path+': expected '+schema.type];
  if (schema.enum && !schema.enum.includes(value)) errors.push(path+': unsupported value');
  if (schema.type==='object') {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value,key)) errors.push(path+'.'+key+': required');
    for (const key of Object.keys(value)) {
      if (!Object.hasOwn(schema.properties,key)) errors.push(path+': unexpected field');
      else errors.push(...validateSchema(value[key],schema.properties[key],path+'.'+key));
    }
  }
  if (schema.type==='array') {
    if (value.length<schema.minItems || value.length>schema.maxItems) errors.push(path+': invalid length');
    value.forEach((item,i)=>errors.push(...validateSchema(item,schema.items,path+'['+i+']')));
  }
  if (schema.type==='string' && (value.length<schema.minLength || value.length>schema.maxLength)) errors.push(path+': invalid length');
  if (['number','integer'].includes(schema.type) && (value<schema.minimum || value>schema.maximum)) errors.push(path+': out of range');
  return errors;
}
export function validateRequest(value) {
  const errors=validateSchema(value,requestSchema);
  if (errors.length) return errors;
  for (const key of ['baseline','result']) {
    if (new Set(value[key].districts.map(d=>d.name)).size!==5) errors.push(key+': duplicate districts');
    for (const d of value[key].districts) if (new Set(d.critical).size!==d.critical.length) errors.push(key+': duplicate critical indicators');
  }
  return errors;
}
