import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const version='0.186.0';
const files=[['build/three.module.min.js','three.module.min.js'],['build/three.core.min.js','three.core.min.js'],['examples/jsm/controls/OrbitControls.js','OrbitControls.js'],['LICENSE','LICENSE']];
const directory=new URL('../vendor/three/',import.meta.url);
await mkdir(directory,{recursive:true});
const manifest=await Promise.all(files.map(async([source,name])=>{
  const url=`https://cdn.jsdelivr.net/npm/three@${version}/${source}`;
  const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new Error(`${name}: ${response.status}`);
  let body=await response.text();
  if(name==='OrbitControls.js')body=body.replace(/from 'three'/g,"from './three.module.min.js'");
  if(name==='three.module.min.js')body=body.replaceAll('./three.core.js','./three.core.min.js');
  await writeFile(new URL(name,directory),body);
  return {file:name,source:url,sha256:createHash('sha256').update(body).digest('hex'),bytes:Buffer.byteLength(body)};
}));
await writeFile(new URL('manifest.json',directory),JSON.stringify({package:'three',version,license:'MIT',modifications:'OrbitControls bare import replaced with a local relative import; renderer core import points to the minified local core.',files:manifest},null,2)+'\n');
console.log(JSON.stringify({version,files:manifest.map(({file,bytes})=>({file,bytes}))}));
