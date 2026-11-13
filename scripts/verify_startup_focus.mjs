// Browser checks of opt-in startup and pointer/keyboard focus; sensors are simulated.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.APP_URL || 'http://127.0.0.1:4194/noxari/';
const errors=[];
async function setup(permission='granted'){
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-01-15T22:00:00Z')});
 await page.addInitScript(permission=>{
  window.__starts=0;window.__permissions=0;window.__live=new Set();const add=window.addEventListener,remove=window.removeEventListener;
  window.addEventListener=function(name,listener,...args){if(name==='deviceorientation'){window.__starts++;window.__live.add(listener);}return add.call(this,name,listener,...args)};
  window.removeEventListener=function(name,listener,...args){if(name==='deviceorientation')window.__live.delete(listener);return remove.call(this,name,listener,...args)};
  if(permission==='unsupported')Object.defineProperty(window,'DeviceOrientationEvent',{value:undefined});
  else DeviceOrientationEvent.requestPermission=()=>{window.__permissions++;if(permission==='pending')return new Promise(resolve=>window.__grant=()=>resolve('granted'));if(permission==='error')throw new Error('test permission failure');return Promise.resolve(permission)};
 },permission);
 await page.goto(base+'?skyRenderer=canvas');await page.clock.runFor(100);return page;
}
async function follow(page,panel=false){
 if(panel){await page.getByRole('button',{name:'More',exact:true}).click();await page.locator('.more-advanced:not([open]) > summary').click().catch(()=>{});await page.getByRole('button',{name:/^Phone direction/}).click();await page.getByRole('button',{name:'Follow phone',exact:true}).click();}
 else await page.getByRole('button',{name:'Follow the phone',exact:true}).click();
}
async function stable(page){
 for(let i=0;i<22;i++){
  await page.evaluate(()=>{for(const [type,absolute] of [['deviceorientation',false],['deviceorientationabsolute',true]]){const event=new DeviceOrientationEvent(type,{alpha:0,beta:90,gamma:0,absolute});Object.defineProperty(event,'timeStamp',{value:performance.now()});window.dispatchEvent(event);}});
  await page.clock.runFor(50);
 }
}
async function report(page){
 await page.getByRole('button',{name:'More',exact:true}).click();await page.locator('.more-advanced:not([open]) > summary').click().catch(()=>{});await page.getByRole('button',{name:/^Phone direction/}).click();await page.locator('.direction-diagnostics summary').click();
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'Download direction report',exact:true}).click();let json='';for await(const b of await(await event).createReadStream())json+=b;return JSON.parse(json);
}
try {
 const cold=await setup();await follow(cold,true);await cold.clock.runFor(1100);
 assert.equal(await cold.evaluate(()=>window.__starts),2,'one-second cold-start resubscription');assert.equal(await cold.evaluate(()=>window.__permissions),1);
 assert.equal(await cold.locator('.direction-chip').innerText(),'Waiting');assert.match(await cold.locator('.phone-notice').innerText(),/Restarting|Retrying/);
 await stable(cold);assert.equal(await cold.locator('.direction-chip').innerText(),'Following');
 const r=await report(cold);assert.equal(r.startup.listenerRestarts,1);assert.equal(r.startup.phase,'receiving');assert.ok(r.startup.usableDirections>0);assert.equal(r.reportVersion,2);
 await cold.close();console.log('PASS simulated silent first subscription recovers in same opt-in session; one permission request; startup report');
 const absent=await setup();await follow(absent);
 for(let second=1;second<=7;second++){await absent.clock.runFor(1000);assert.equal(await absent.evaluate(()=>window.__starts),second+1,'one retry on each second');}
 await absent.clock.runFor(1000);assert.equal(await absent.locator('.direction-chip').innerText(),'Follow');
 assert.equal(await absent.evaluate(()=>window.__starts),8);assert.equal(await absent.evaluate(()=>window.__live.size),0);assert.match(await absent.locator('.phone-notice').innerText(),/No usable phone direction/);
 const missing=await report(absent);assert.equal(missing.startup.phase,'missing');assert.equal(missing.startup.usableDirections,0);assert.equal(missing.startup.listenerRestarts,7);await absent.close();console.log('PASS original no-data deadline, bounded retry and zero-data failure report');
 const normal=await setup();await follow(normal);await stable(normal);assert.equal(await normal.locator('.direction-chip').innerText(),'Following');
 await normal.clock.runFor(9500);assert.equal(await normal.evaluate(()=>window.__starts),1,'no startup retry after usable primary data');assert.equal(await normal.evaluate(()=>window.__live.size),0);await normal.close();console.log('PASS normal first start and original primary-data-loss shutdown');
 for(const action of ['stop','hidden','pending-stop','pending-hidden']){
  const pending=action.startsWith('pending'),p=await setup(pending?'pending':'granted');await follow(p);
  if(action.endsWith('hidden'))await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
  else await p.getByRole('button',{name:'Stop following the phone',exact:true}).click();
  if(pending)await p.evaluate(()=>window.__grant());await p.clock.runFor(9500);
  assert.equal(await p.evaluate(()=>window.__starts),pending?0:1);assert.equal(await p.evaluate(()=>window.__live.size),0);assert.equal(await p.locator('.direction-chip').innerText(),'Follow');await p.close();console.log('PASS cancellation',action);
 }
 for(const permission of ['denied','error','unsupported']){
  const p=await setup(permission);await follow(p);await p.clock.runFor(9500);assert.equal(await p.evaluate(()=>window.__starts),0);
  const notice=await p.locator('.phone-notice').innerText();assert.match(notice,permission==='denied'?/access was denied/:permission==='error'?/could not be requested/:/unavailable in this browser/);
  await p.close();console.log('PASS distinct startup failure and no auto permission retry',permission);
 }
 // Real pointer stream, preserving keyboard focus even after pointer steering.
 for(const touch of [false,true]){
  const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'?skyRenderer=canvas');
  const root=p.locator('.horizon-view');await root.focus();await p.keyboard.press('ArrowRight');
  assert.equal(await root.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
  if(touch){const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:160,y:430}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:210,y:430}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else {await p.mouse.move(160,430);await p.mouse.down();await p.mouse.move(210,430,{steps:4});await p.mouse.up();}
  assert.equal(await root.evaluate(e=>getComputedStyle(e).outlineStyle),'none','no pointer frame');
  await root.focus();await p.keyboard.press('ArrowRight');assert.equal(await root.evaluate(e=>getComputedStyle(e).outlineStyle),'solid','arrow keys restore visible focus');
  await p.keyboard.press('Tab');assert.notEqual(await p.evaluate(()=>document.activeElement?.className),'sky-canvas horizon-view ');await p.close();console.log('PASS pointer frame and keyboard focus',touch?'touch':'mouse');
 }
 assert.deepEqual(errors,[]);console.log('PASS no page errors; browser checks do not establish physical sensor behavior');
} finally {await browser.close();}
