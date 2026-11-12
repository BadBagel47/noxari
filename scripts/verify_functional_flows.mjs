// Optional environment-provided Playwright; production UI only, no app dependencies.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.APP_URL || 'http://127.0.0.1:4194/noxari/';const results=[],errors=[];
async function make(viewport={width:390,height:844},url=base+'?skyRenderer=canvas') {
 const p=await browser.newPage({viewport,hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce',timezoneId:'Europe/Stockholm'});p.setDefaultTimeout(6000);
 p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-01-15T22:00:00Z'));
 await p.addInitScript(()=>{window.__shares=[];window.__clipboard=[];window.__gps=[];window.__sensorRequests=0;
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>window.__shares.push(data)});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__clipboard.push(text)}});
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(ok,error,options)=>window.__gps.push({ok,error,options})}});
  DeviceOrientationEvent.requestPermission=()=>{window.__sensorRequests++;return Promise.resolve('granted')};
 });await p.goto(url);await p.locator('.horizon-view canvas').waitFor();return p;
}
async function close(p){if(await p.getByRole('button',{name:'Close panel',exact:true}).count())await p.getByRole('button',{name:'Close panel',exact:true}).click();}
async function more(p,name){await close(p);await p.getByRole('button',{name:'More',exact:true}).click();await p.getByRole('button',{name,exact:true}).click();assert.equal(await p.getByRole('dialog').count(),1);}
async function layers(p){await close(p);await p.getByRole('button',{name:'Layers',exact:true}).click();assert.equal(await p.getByRole('dialog').count(),1);}
async function advanced(p){if(!(await p.locator('details.advanced-location').evaluate(d=>d.open)))await p.locator('details.advanced-location summary').click();}
async function search(p,query){await close(p);await p.getByRole('button',{name:'Search',exact:true}).click();await p.getByRole('button',{name:'Main catalog',exact:true}).click();await p.getByRole('button',{name:'All objects',exact:true}).click();await p.getByRole('textbox').fill(query);}
async function pick(p,query){await search(p,query);assert.equal(await p.locator('.row-main').count(),1);await p.locator('.row-main').click();}
async function wait(){await new Promise(r=>setTimeout(r,60));}
async function pinch(p,selector){const box=await p.locator(selector).boundingBox(),client=await p.context().newCDPSession(p),y=box.y+box.height*.55,cx=box.x+box.width*.5;
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-40,y,id:11},{x:cx+40,y,id:12}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-80,y,id:11},{x:cx+80,y,id:12}]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait();await client.detach();}
const positions=p=>p.locator('button.sky-object').evaluateAll(els=>Object.fromEntries(els.map(e=>[e.title,[e.style.left,e.style.top]])));
async function check(name,viewport,fn){if(process.env.ONLY && !name.includes(process.env.ONLY))return;const p=await make(viewport);try{await fn(p);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);results.push({name,viewport,pass:true});console.log('PASS',name,viewport.width,viewport.height);}catch(e){results.push({name,viewport,pass:false,error:e.message});await p.screenshot({path:'/tmp/noxari-f009-failure-'+results.length+'.png'});console.log('FAIL',name,e.message.slice(0,350));}finally{await p.close();}}
try {
 for(const viewport of [{width:390,height:844},{width:1280,height:800},{width:568,height:320}]) {
  await check('search, categories, candidates, selection, panel focus',viewport,async p=>{
   await p.evaluate(()=>window.__sky=document.querySelector('.horizon-view'));
   for(const query of ['M31','Ceres','Pluto']){await search(p,query);assert.equal(await p.locator('.row-main').count(),1);assert.match(await p.locator('.row-main').innerText(),query==='M31'?/Andromeda/:new RegExp(query));}
   await p.getByRole('textbox').fill('');await p.getByRole('button',{name:'Dwarf planet',exact:true}).click();assert.equal(await p.locator('.row-main').count(),5);
   await p.getByRole('button',{name:'Other objects (1)',exact:true}).click();assert.equal(await p.locator('.row-main').count(),1);assert.match(await p.getByRole('dialog').innerText(),/2026 ED138/);
   await p.getByRole('button',{name:'Main catalog',exact:true}).click();await p.getByRole('button',{name:'All objects',exact:true}).click();await p.getByRole('textbox').fill('zzzz-no-such-object');assert.equal(await p.locator('.row-main').count(),0);
   await p.keyboard.press('Escape');assert.equal(await p.getByRole('dialog').count(),0);assert.ok(await p.evaluate(()=>!document.activeElement.closest('[inert]')));
   await pick(p,'M31');assert.match(await p.locator('.object-preview').innerText(),/Andromeda/);await p.getByRole('button',{name:'Details',exact:true}).click();
   assert.match(await p.getByRole('dialog').innerText(),/Andromeda/);await p.locator('.object-photo img').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('.object-photo img')?.naturalWidth>0);assert.equal(await p.locator('.object-photo img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
   const links=await p.locator('.object-photo a').evaluateAll(els=>els.map(e=>e.href));assert.equal(links.length,2);
   await p.keyboard.press('Tab');assert.ok(await p.evaluate(()=>Boolean(document.activeElement.closest('[role=dialog]'))));
   await close(p);assert.equal(await p.evaluate(()=>window.__sky===document.querySelector('.horizon-view')),true);assert.equal(await p.evaluate(()=>window.__gps.length+window.__sensorRequests),0);
  });
  await check('bookmark reload and object/list share round trip',viewport,async p=>{
   await pick(p,'M31');await p.getByRole('button',{name:'Save object',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Remove bookmark',exact:true}).getAttribute('aria-pressed'),'true');
   await p.getByRole('button',{name:'Details',exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:'Share object',exact:true}).click();
   let url=await p.evaluate(()=>window.__shares.at(-1).url);assert.match(url,/\/noxari\/share\/en\/m31\/$/);
   const response=await p.request.get(url);assert.equal(response.status(),200);const html=await response.text();assert.match(html,/og:title/);assert.match(html,/object=m31/);
   await p.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:undefined}));await p.getByRole('dialog').getByRole('button',{name:'Share object',exact:true}).click();assert.equal(await p.evaluate(()=>window.__clipboard.at(-1)),url);
   await p.reload();await more(p,'Saved objects');assert.equal(await p.locator('.row-main').count(),1);assert.match(await p.locator('.row-main').innerText(),/Andromeda/);
   await p.getByRole('button',{name:'Share list',exact:true}).click();url=await p.evaluate(()=>window.__shares.at(-1).url);assert.equal(new URL(url).searchParams.get('list'),'m31');
   const other=await make(viewport,url);try{await other.locator('.panel-shared').waitFor();assert.equal(await other.locator('.row-main').count(),1);assert.equal(await other.evaluate(()=>JSON.parse(localStorage.getItem('noxari-saved')||'[]').length),0);await other.getByRole('button',{name:'Save all to my list',exact:true}).click();assert.deepEqual(await other.evaluate(()=>JSON.parse(localStorage.getItem('noxari-saved'))),['m31']);await other.reload();await other.locator('.panel-shared').waitFor();assert.equal(await other.locator('.row-main').count(),1);}finally{await other.close();}
   await p.getByRole('button',{name:'Remove bookmark',exact:true}).click();assert.match(await p.getByRole('dialog').innerText(),/Nothing saved yet/);
  });
  await check('Finder show-in-sky centering, stop and below-horizon guard',viewport,async p=>{
   await p.getByRole('button',{name:'Time & location',exact:true}).click();await p.getByRole('button',{name:'Now',exact:true}).click();await close(p);
   await pick(p,'M31');await p.getByRole('button',{name:'Guide',exact:true}).click();assert.equal(await p.locator('.guided-finder').count(),1);
   await p.locator('.finder-hud').getByRole('button',{name:'Details',exact:true}).click();assert.equal(await p.getByRole('dialog').getByRole('button',{name:'Show in sky',exact:true}).isEnabled(),true);await p.getByRole('dialog').getByRole('button',{name:'Show in sky',exact:true}).click();await p.locator('.guided-finder.is-centered').waitFor();assert.equal(await p.locator('.finder-orbit-arrow').count(),0);
   await p.getByRole('button',{name:'Stop Guided Finder',exact:true}).click();assert.equal(await p.locator('.guided-finder').count(),0);
   await pick(p,'M7');await p.getByRole('button',{name:'Guide',exact:true}).click();await p.locator('.guided-finder.is-below').waitFor();assert.equal(await p.locator('.finder-orbit-arrow').count(),0);assert.equal(await p.locator('.finder-target-ring').count(),0);
   await p.locator('.finder-hud').getByRole('button',{name:'Details',exact:true}).click();assert.equal(await p.getByRole('dialog').getByRole('button',{name:'Show in sky',exact:true}).isDisabled(),true);
  });
  await check('real CDP pinch in horizon and map without object selection',viewport,async p=>{
   const before=await positions(p);await pinch(p,'.horizon-view');const after=await positions(p);assert.notDeepEqual(after,before);assert.equal(await p.locator('.object-preview').count(),0);
   await layers(p);await p.getByRole('button',{name:'Sky map',exact:true}).click();await close(p);const mapBefore=await positions(p);await pinch(p,'.sky-map');assert.notDeepEqual(await positions(p),mapBefore);assert.equal(await p.locator('.object-preview').count(),0);
   await layers(p);await p.getByRole('button',{name:'Look around',exact:true}).click();await close(p);assert.equal(await p.locator('.horizon-view').count(),1);
  });
 }
 await check('timezones, fixed/Now/preview, coordinate validation and persistence',{width:390,height:844},async p=>{
  await p.getByRole('button',{name:'Time & location',exact:true}).click();await p.getByRole('button',{name:'Now',exact:true}).click();assert.match(await p.locator('.observation-chip').innerText(),/Now/);
  await p.locator('input[type=datetime-local]').fill('2026-01-20T20:00');assert.match(await p.locator('.observation-chip').innerText(),/Selected time/);
  await p.getByRole('combobox',{name:'Location',exact:true}).selectOption('London');assert.equal(await p.locator('input[type=datetime-local]').inputValue(),'2026-01-20T19:00');
  await advanced(p);await p.getByRole('spinbutton',{name:'Latitude',exact:true}).fill('91');await p.getByRole('button',{name:'Apply',exact:true}).click();assert.match(await p.locator('.toast').innerText(),/latitude/);assert.match(await p.locator('.observation-chip').innerText(),/London/);
  await p.getByRole('spinbutton',{name:'Latitude',exact:true}).fill('51.5');await p.getByRole('textbox',{name:'Timezone',exact:true}).fill('Not/AZone');await p.getByRole('button',{name:'Apply',exact:true}).click();assert.match(await p.locator('.toast').innerText(),/valid IANA/);
  await p.getByRole('textbox',{name:'Timezone',exact:true}).fill('Europe/London');await p.getByRole('button',{name:'Apply',exact:true}).click();assert.match(await p.locator('.observation-chip').innerText(),/Custom coordinates/);
  await p.locator('input[type=datetime-local]').fill('2026-03-29T01:30');assert.match(await p.locator('.toast').innerText(),/does not exist/);assert.equal(await p.locator('input[type=datetime-local]').inputValue(),'2026-01-20T19:00');
  await p.getByRole('button',{name:'Tonight (darkest)',exact:true}).click();assert.match(await p.locator('.observation-chip').innerText(),/Night preview/);await p.reload();assert.match(await p.locator('.observation-chip').innerText(),/Custom coordinates/);
 });
 await check('GPS opt in, denial/timeout/success and stale-result cancellation',{width:390,height:844},async p=>{
  assert.equal(await p.evaluate(()=>window.__gps.length),0);await p.getByRole('button',{name:'Time & location',exact:true}).click();
  await p.getByRole('button',{name:'Use my location',exact:true}).click();await p.evaluate(()=>window.__gps.at(-1).error({code:1}));await p.locator('.gps-status').filter({hasText:/denied/}).waitFor();assert.match(await p.locator('.gps-status').innerText(),/denied/);
  await p.getByRole('button',{name:'Use my location',exact:true}).click();await p.evaluate(()=>window.__gps.at(-1).error({code:3}));await p.locator('.gps-status').filter({hasText:/timed out/}).waitFor();assert.match(await p.locator('.gps-status').innerText(),/timed out/);
  await p.getByRole('button',{name:'Use my location',exact:true}).click();await p.evaluate(()=>window.__gps.at(-1).ok({coords:{latitude:51.5,longitude:-.1,accuracy:12}}));await p.locator('.observation-chip').filter({hasText:/Device location/}).waitFor();assert.match(await p.locator('.observation-chip').innerText(),/Device location/);assert.match(await p.locator('.gps-status').innerText(),/12 m/);
  await p.getByRole('button',{name:'Use my location',exact:true}).click();await p.getByRole('combobox',{name:'Location',exact:true}).selectOption('Sydney');await p.evaluate(()=>window.__gps.at(-1).ok({coords:{latitude:0,longitude:0,accuracy:1}}));await p.waitForTimeout(80);assert.match(await p.locator('.observation-chip').innerText(),/Sydney/);await advanced(p);assert.equal(await p.getByRole('spinbutton',{name:'Latitude',exact:true}).inputValue(),'-33.8688');
 });
 await check('Swedish settings persistence and localized sharing',{width:390,height:844},async p=>{
  await close(p);await p.getByRole('button',{name:'More',exact:true}).click();await p.getByRole('button',{name:'SV',exact:true}).click();await p.getByRole('button',{name:'Stäng panel',exact:true}).click();await p.reload();assert.equal(await p.getByRole('button',{name:'Sök',exact:true}).count(),1);
  await p.getByRole('button',{name:'Sök',exact:true}).click();await p.getByRole('textbox').fill('Pluto');await p.locator('.row-main').click();await p.getByRole('button',{name:'Detaljer',exact:true}).click();await p.getByRole('dialog').getByRole('button',{name:'Dela objekt',exact:true}).click();assert.match(await p.evaluate(()=>window.__shares.at(-1).url),/\/share\/sv\/pluto\/$/);await p.screenshot({path:'/tmp/noxari-f009-sv-mobile.png'});
 });
 assert.deepEqual(errors,[]);
}finally {writeFileSync(process.env.QA_OUTPUT || '/tmp/noxari-f009-results.json',JSON.stringify({expectedBuild:process.env.EXPECTED_BUILD || null,results,pageErrors:errors},null,2));await browser.close();}
console.log('TOTAL',results.filter(r=>r.pass).length,'PASS',results.filter(r=>!r.pass).length,'FAIL');

if(results.some(r=>!r.pass)||errors.length)process.exitCode=1;
