import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createFrontendServer } from '../dev-server.mjs';
const output=fileURLToPath(new URL('../test-results/',import.meta.url));await mkdir(output,{recursive:true});
const server=createFrontendServer({apiOrigin:''});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const chrome=process.env.BROWSER_PATH??['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
let browser;
try{
  browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1600,height:1080},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.log('BROWSER ERROR:',error.message);});
  await page.goto(origin);
  await page.waitForSelector('#city-3d-host[data-buildings][data-camera]',{timeout:60000});
  assert.equal(await page.locator('.city-webgl-canvas').count(),1);
  await page.getByRole('button',{name:'Развернуть карту',exact:true}).click();
  await page.waitForFunction(()=>Boolean(document.fullscreenElement));
  await page.locator('.map-district-selector [data-district="Есиль"]').click();
  await page.waitForSelector('#city-3d-host[data-focus="Есиль"]');
  assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true,'District selection preserves fullscreen');
  await page.locator('[data-action="scene-fullscreen"]').click();
  await page.waitForFunction(()=>!document.fullscreenElement);
  await page.getByRole('button',{name:'Показать весь город'}).click();
  await page.waitForSelector('#city-3d-host[data-focus="city"]');
  assert.equal(await page.locator('.city-webgl-canvas').evaluate(canvas=>Boolean(canvas.getContext('webgl2'))),true);
  assert.ok(Number(await page.locator('#city-3d-host').getAttribute('data-buildings'))>1000);
  await page.locator('.city-map-panel').screenshot({path:`${output}/scene-overview.png`});
  await page.locator('.scene-district-label[data-district="Нура"]').click();
  await page.waitForSelector('#city-3d-host[data-focus="Нура"]');
  await page.waitForFunction(()=>{const c=document.querySelector('#city-3d-host')?.dataset.camera?.split(',').map(Number);return c&&c[1]<100;});
  await page.locator('.city-map-panel').screenshot({path:`${output}/scene-district.png`});
  const before=await page.locator('#city-3d-host').getAttribute('data-camera');
  const box=await page.locator('.city-webgl-canvas').boundingBox();
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.65);await page.mouse.down();await page.mouse.move(box.x+box.width*.6+75,box.y+box.height*.65-30,{steps:8});await page.mouse.up();
  await page.waitForFunction(old=>document.querySelector('#city-3d-host')?.dataset.camera!==old,before);
  assert.match(await page.locator('.inspector-heading h2').innerText(),/Нура/,'Orbit does not change the selected district');
  // Switching a problem must preserve the WebGL canvas/context and camera.
  await page.locator('.city-webgl-canvas').evaluate(canvas=>canvas.dataset.identity='same-scene');
  await page.locator('[data-action="map-issue"][data-issue="S1"]').click();
  assert.equal(await page.locator('.city-webgl-canvas').getAttribute('data-identity'),'same-scene');
  await page.getByRole('button',{name:'Показать здания',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Показать здания',exact:true}).getAttribute('aria-pressed'),'false');
  await page.getByRole('button',{name:'Показать здания',exact:true}).click();
  // Recenter and use real canvas clicks to inspect an OSM building.
  await page.locator('.map-district-selector [data-district="Нура"]').click();
  await page.waitForFunction(()=>Number(document.querySelector('#city-3d-host')?.dataset.camera?.split(',')[1])<100);
  const rect=await page.locator('.city-webgl-canvas').boundingBox();
  let found=false;
  for(const dy of [0,20,-20,40,-40]){
    for(const dx of [0,20,-20,40,-40]){
      await page.mouse.click(rect.x+rect.width/2+dx,rect.y+rect.height/2+dy);
      if(await page.locator('.building-popover:not([hidden])').count()){found=true;break;}
    }
    if(found)break;
  }
  assert.equal(found,true,'A rendered building can be picked on the canvas');
  assert.match(await page.locator('.building-popover').innerText(),/Высота|высота|этажам/);
  await page.locator('.city-map-panel').screenshot({path:`${output}/scene-building.png`});
  await page.getByRole('button',{name:'Закрыть сведения о здании'}).click();
  await page.getByRole('button',{name:'Показать весь город'}).click();
  await page.waitForSelector('#city-3d-host[data-focus="city"]');
  await page.locator('.city-webgl-canvas').focus();await page.keyboard.press('Enter');
  await page.waitForSelector('#city-3d-host[data-focus="Нура"]');
  await page.keyboard.press('Escape');await page.waitForSelector('#city-3d-host[data-focus="city"]');
  await page.locator('[data-action="map-mode"][data-mode="2d"]').click();await page.waitForSelector('#city-map');
  assert.equal(await page.locator('.city-webgl-canvas').count(),0);
  await page.locator('[data-action="map-mode"][data-mode="3d"]').click();await page.waitForSelector('#city-3d-host[data-buildings]');
  assert.equal(await page.locator('.city-webgl-canvas').count(),1);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.city-map-panel').screenshot({path:`${output}/scene-mobile.png`});
  await page.locator('.city-webgl-canvas').evaluate(canvas=>canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForSelector('#city-map');
  assert.equal(await page.locator('[data-action="map-mode"][data-mode="2d"]').getAttribute('aria-pressed'),'true','Lost GPU context falls back to the usable SVG map');
  assert.deepEqual(errors,[]);
  console.log('3D checks passed: WebGL, buildings, district drill-down, orbit, persistent scene, object inspection, fullscreen, keyboard, GPU-loss fallback and mobile viewport.');
}finally{await browser?.close();await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});}
