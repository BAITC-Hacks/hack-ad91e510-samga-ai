// Локальная сборка панели рядом с уже существующим входом АКИМ.
// index.html, login.css, ui.js, config.js и root/assets не изменяются.
import {mkdir,readFile,writeFile,copyFile,cp,access} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const source=dirname(fileURLToPath(import.meta.url));
const target=process.argv[2]&&resolve(process.argv[2]);
if(!target)throw new Error('Укажите каталог существующей входной группы: node export-local.mjs /path/to/site');
const entry=await readFile(join(target,'index.html'),'utf8');
if(!entry.includes('akim-login'))throw new Error('В каталоге назначения не найдена входная группа АКИМ.');
const output=join(target,'simulator');
await mkdir(output,{recursive:true});
for(const file of ['base.css','style.css','theme.js','shell.mjs','widget-layout.mjs','app.mjs','catalog-ui.mjs'])await copyFile(join(source,file),join(output,file));
for(const file of ['onboarding.mjs','onboarding.css'])await copyFile(join(source,file),join(output,file));
await cp(join(source,'assets'),join(output,'assets'),{recursive:true});
for(const file of ['comparison.mjs','planner.mjs']){
 const module=(await readFile(join(source,file),'utf8')).replaceAll('../../docs/brief-analysis/dist/','./model/');
 await writeFile(join(output,file),module);
}
await mkdir(join(output,'model'),{recursive:true});
for(const file of ['data.mjs','model.mjs'])await copyFile(join(source,'../../docs/brief-analysis/dist',file),join(output,'model',file));
const map=(await readFile(join(source,'map.mjs'),'utf8')).replaceAll('../astana-city/','./map-assets/');
await writeFile(join(output,'map.mjs'),map);
await mkdir(join(output,'map-assets'),{recursive:true});
for(const file of ['base-style.json','astana.geojson'])await copyFile(join(source,'../astana-city',file),join(output,'map-assets',file));
await cp(join(source,'../astana-city/vendor'),join(output,'map-assets/vendor'),{recursive:true});
let html=await readFile(join(source,'main.html'),'utf8');
for(const file of ['base.css','style.css','theme.js','shell.mjs','widget-layout.mjs','app.mjs'])html=html.replaceAll('./'+file,'./simulator/'+file);
html=html.replaceAll('./onboarding.mjs','./simulator/onboarding.mjs');
html=html.replaceAll('./assets/','./simulator/assets/').replaceAll('../astana-city/','./simulator/map-assets/');
try{await access(join(target,'main-template.html'));}
catch(error){if(error.code!=='ENOENT')throw error;await copyFile(join(target,'main.html'),join(target,'main-template.html'));}
await writeFile(join(target,'main.html'),html);
console.log('Панель выгружена: '+join(target,'main.html'));
console.log('Входная группа сохранена. Исходный шаблон главной: main-template.html');
