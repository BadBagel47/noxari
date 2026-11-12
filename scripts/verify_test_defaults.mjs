// F-021/F-022: ordinary production UI, real pointers and simulated sensors.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({root:process.cwd(),configFile:false,cacheDir:'/tmp/noxari-defaults-ssr-cache',server:{middlewareMode:true},logLevel:'error'});
const astro=await server.ssrLoadModule('/src/astronomy.ts'),{objects}=await server.ssrLoadModule('/src/data.ts');
const date=new Date('2026-01-15T22:00:00Z'),target=astro.objectPosition(objects.find(o=>o.id==='sirius'),date,astro.stockholm);await server.close();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.APP_URL || 'http://127.0.0.1:4194/noxari/',errors=[];
async function pageFor({viewport={width:390,height:844},pending=false,location=null,when=date,sv=false}={}){
 const p=await browser.newPage({viewport,hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(when);
 await p.addInitScript(({pending,location})=>{
  window.__permissions=0;window.__gps=0;window.__starts=0;window.__live=new Set();
  if(location)localStorage.setItem('noxari-location',JSON.stringify(location));
  DeviceOrientationEvent.requestPermission=()=>{window.__permissions++;return pending?new Promise(resolve=>window.__grant=()=>resolve('granted')):Promise.resolve('granted')};
  Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){window.__gps++}}});
  const add=window.addEventListener,remove=window.removeEventListener;
  window.addEventListener=function(name,handler,...args){if(name==='deviceorientation'){window.__starts++;window.__live.add(handler)}return add.call(this,name,handler,...args)};
  window.removeEventListener=function(name,handler,...args){if(name==='deviceorientation')window.__live.delete(handler);return remove.call(this,name,handler,...args)};
  const gl=WebGL2RenderingContext.prototype,parameter=gl.getParameter;gl.getParameter=function(name){return name===0x9246?'Brave':parameter.call(this,name)};
  const get=gl.getUniformLocation,u4=gl.uniform4f,u1=gl.uniform1f,names=new WeakMap();
  gl.getUniformLocation=function(program,name){const loc=get.call(this,program,name);if(loc)names.set(loc,name);return loc};
  gl.uniform4f=function(loc,ch,sh,cp,sp){if(names.get(loc)==='pose')window.__pose={heading:(Math.atan2(sh,ch)*180/Math.PI+360)%360,pitch:Math.atan2(sp,cp)*180/Math.PI};return u4.call(this,loc,ch,sh,cp,sp)};
  gl.uniform1f=function(loc,value){if(names.get(loc)==='focal')window.__focal=value;return u1.call(this,loc,value)};
 },{pending,location});
 await p.goto(base+'?skyRenderer=gpu'+(sv?'&lang=sv':''));await p.waitForTimeout(200);return p;
}
async function now(p){await p.getByRole('button',{name:'Time & location',exact:true}).click();await p.getByRole('button',{name:'Now',exact:true}).click();await p.getByRole('button',{name:'Close panel'}).click();}
const emit=(p,heading=0,pitch=0)=>p.evaluate(({heading,pitch})=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:(360-heading)%360,beta:90+pitch,gamma:0,absolute:false})),{heading,pitch});
async function tracking(p){await p.getByRole('button',{name:'Follow the phone',exact:true}).click();await emit(p);await p.waitForTimeout(70);await p.locator('.direction-chip').click();await p.getByRole('dialog').getByRole('button',{name:'Align north',exact:true}).click();await p.getByRole('button',{name:'Close panel'}).click();await p.waitForTimeout(70);assert.equal(await p.locator('.direction-chip').innerText(),'Following');}
const pinch=(p,distance)=>p.evaluate(distance=>{const el=document.querySelector('.horizon-view');const emit=(type,id,x)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',isPrimary:id===11,buttons:1,button:0,clientX:x,clientY:400}));emit('pointerdown',11,120);emit('pointerdown',12,220);emit('pointermove',12,120+distance);emit('pointerup',12,120+distance);emit('pointerup',11,120)},distance);
try {
 for(const test of [{},{location:{name:'Sydney',latitude:-33.8688,longitude:151.2093,timeZone:'Australia/Sydney'}},{location:{name:'Tromso',latitude:69.6492,longitude:18.9553,timeZone:'Europe/Oslo'},when:new Date('2026-06-21T12:00:00Z'),sv:true}]){
  const p=await pageFor(test);assert.match(await p.locator('.observation-chip').innerText(),test.sv?/Kvällshimmel/:/Night preview/);assert.equal(await p.evaluate(()=>window.__permissions+window.__gps),0);
  if(test.sv)assert.match(await p.locator('.toast').innerText(),/Midnattssol/);
  else {const stamp=await p.locator('.observation-chip').innerText();await p.clock.setFixedTime(new Date(date.getTime()+60_000));assert.equal(await p.locator('.observation-chip').innerText(),stamp);if(!test.location){await p.getByRole('button',{name:'Time & location',exact:true}).click();await p.locator('input[type=datetime-local]').fill('2026-01-20T20:00');await p.getByRole('button',{name:'Close panel'}).click();assert.match(await p.locator('.observation-chip').innerText(),/Selected time/);}
   await now(p);assert.match(await p.locator('.observation-chip').innerText(),/Now/);await p.reload();assert.match(await p.locator('.observation-chip').innerText(),/Night preview/);}
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.close();console.log('PASS labeled test preview, stored location/Now/reload, no permissions',test.location?.name||'Stockholm');
 }
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const p=await pageFor({viewport});await now(p);await tracking(p);await emit(p,target.azimuth,target.altitude);await p.waitForTimeout(90);
  const sirius=p.locator('button.sky-object').filter({hasText:'Sirius'});assert.ok(await sirius.isVisible());await sirius.click();assert.equal(await p.getByRole('button',{name:'Stop following the phone',exact:true}).getAttribute('aria-pressed'),'true','object tap preserves following');await p.getByRole('button',{name:'Clear object',exact:true}).click();
  await p.getByRole('button',{name:'Search',exact:true}).click();await p.getByRole('button',{name:'Close panel'}).click();assert.ok(await p.getByRole('button',{name:'Stop following the phone',exact:true}).isVisible());
  const startX=viewport.width*.35,startY=viewport.height*.6;
  await p.mouse.move(startX,startY);await p.mouse.down();await p.mouse.move(startX+3,startY+1);await p.mouse.up();assert.ok(await p.getByRole('button',{name:'Stop following the phone',exact:true}).isVisible(),'tap jitter preserves following');
  const focal=await p.evaluate(()=>window.__focal);await pinch(p,150);await p.waitForTimeout(70);assert.ok((await p.evaluate(()=>window.__focal))>focal);assert.ok(await p.getByRole('button',{name:'Stop following the phone',exact:true}).isVisible(),'pinch keeps following');await pinch(p,50);await p.waitForTimeout(70);
  const before=await p.evaluate(()=>window.__pose);await p.mouse.move(startX,startY);await p.mouse.down();
  await p.evaluate(({x,y})=>{window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:90,beta:90,gamma:0,absolute:false}));document.querySelector('.horizon-view').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,buttons:1,clientX:x+60,clientY:y}));},{x:startX,y:startY});
  await p.waitForTimeout(90);await p.mouse.up();const after=await p.evaluate(()=>window.__pose);
  const field=2*Math.atan(viewport.width/Math.max(viewport.width,viewport.height))*180/Math.PI,expected=(before.heading-60*field/viewport.width+360)%360;
  assert.ok(Math.abs((after.heading-expected+540)%360-180)<.0001,'same gesture keeps first delta and cancels queued sensor pose');assert.ok(Math.abs(after.pitch-before.pitch)<.0001);
  assert.equal(await p.evaluate(()=>window.__live.size),0);assert.ok(await p.getByRole('button',{name:'Follow the phone',exact:true}).isVisible());
  await emit(p,180);await p.waitForTimeout(80);assert.deepEqual(await p.evaluate(()=>window.__pose),after,'sensor events cannot pull back manual view');await p.close();console.log('PASS follow tap/panel/pinch preservation and same-frame manual takeover',viewport);
 }
 // Real touch drag beginning on an object must take over without selecting it.
 const touch=await pageFor();await now(touch);await tracking(touch);await emit(touch,target.azimuth,target.altitude);await touch.waitForTimeout(90);
 const r=await touch.locator('button.sky-object').filter({hasText:'Sirius'}).boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2,cdp=await touch.context().newCDPSession(touch);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x+40,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.waitForTimeout(100);
 assert.ok(await touch.getByRole('button',{name:'Follow the phone',exact:true}).isVisible());assert.equal(await touch.locator('.object-preview').count(),0);await touch.close();console.log('PASS marker-origin real touch takeover without selection');
 const pending=await pageFor({pending:true});await pending.getByRole('button',{name:'Follow the phone',exact:true}).click();await pending.mouse.move(70,450);await pending.mouse.down();await pending.mouse.move(110,450);await pending.mouse.up();await pending.evaluate(()=>window.__grant());await pending.waitForTimeout(150);assert.ok(await pending.getByRole('button',{name:'Follow the phone',exact:true}).isVisible());assert.equal(await pending.evaluate(()=>window.__starts),0);await pending.close();console.log('PASS manual drag cancels pending permission');
 assert.deepEqual(errors,[]);console.log('PASS no page errors; sensors are simulated');
}finally{await browser.close();}
