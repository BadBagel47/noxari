const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({root:process.cwd(),configFile:false,cacheDir:'/tmp/noxari-horizon-gpu-ssr-cache',server:{middlewareMode:true},logLevel:'error'});
const astro=await server.ssrLoadModule('/src/astronomy.ts'),proj=await server.ssrLoadModule('/src/skyProjection.ts'),{objects}=await server.ssrLoadModule('/src/data.ts');
const date=new Date('2026-01-15T22:00:00Z');const position=astro.objectPosition(objects.find(o=>o.id==='sirius'),date,astro.stockholm);
await server.close();
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
try {for(const viewport of [{width:390,height:844},{width:1280,height:800},{width:568,height:320}]){
 const dpr=viewport.width===1280?1:2;
 const page=await browser.newPage({viewport,hasTouch:true,deviceScaleFactor:dpr});await page.emulateMedia({reducedMotion:'reduce'});await page.clock.setFixedTime(date);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});
 await page.addInitScript(()=>{window.__draws=0;const transform=CanvasRenderingContext2D.prototype.setTransform;CanvasRenderingContext2D.prototype.setTransform=function(...args){if(this.canvas.closest('.horizon-view')){window.__draws++;window.__drawHeading=document.querySelector('.horizon-heading')?.textContent;}return transform.apply(this,args)}});
 await page.addInitScript(()=>{
 const gl=WebGL2RenderingContext.prototype, get=gl.getUniformLocation,uniform=gl.uniform4f,draw=gl.drawArrays;
 const names=new WeakMap();gl.getUniformLocation=function(p,n){const l=get.call(this,p,n);if(l)names.set(l,n);return l};
 gl.uniform4f=function(l,ch,sh,cp,sp){if(names.get(l)==='pose')window.__pose={heading:(Math.atan2(sh,ch)*180/Math.PI+360)%360,pitch:Math.atan2(sp,cp)*180/Math.PI};return uniform.call(this,l,ch,sh,cp,sp)};
 gl.drawArrays=function(...args){if(args[0]===this.POINTS){window.__gpuPose=window.__pose;window.__gpuCount=args[2]}return draw.apply(this,args)};
 });
 await page.goto((process.env.APP_URL || 'http://127.0.0.1:4194/noxari/')+'?skyRenderer=gpu');await page.getByRole('button',{name:'Time & location',exact:true}).click();await page.getByRole('button',{name:'Now',exact:true}).click();await page.getByRole('button',{name:'Close panel'}).click();await page.waitForTimeout(400);
 const box=await page.locator('.horizon-view').boundingBox(),x=box.width*.4,y=box.height*.4;
 await page.mouse.move(x,y);await page.mouse.down();
 await page.evaluate(({x,y})=>{window.__draws=0;const root=document.querySelector('.horizon-view');for(let i=1;i<=36;i++)root.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true,buttons:1,button:0,clientX:x+i*2,clientY:y}));},{x,y});
 await page.waitForTimeout(70);assert.equal(await page.evaluate(()=>window.__draws),1,'burst should draw once');await page.mouse.up();
 const focal=Math.max(viewport.width,viewport.height)/2,hf=2*Math.atan(viewport.width/(2*focal))*180/Math.PI;
 const view={heading:180-72*hf/viewport.width,pitch:Math.atan(.76*viewport.height/Math.max(viewport.width,viewport.height))*180/Math.PI};
 const expected=proj.projectPerspective(position,view,viewport.width,viewport.height);
 if(expected){const actual=await page.locator('.sky-object').filter({hasText:'Sirius'}).evaluate(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)}));assert(Math.hypot(actual.x-expected.x,actual.y-expected.y)<.01,'marker uses latest accumulated pose');}
 const pose=await page.evaluate(()=>window.__gpuPose);assert(pose,'GPU star draw must run');assert(Math.abs(pose.heading-view.heading)<.0001);assert(Math.abs(pose.pitch-view.pitch)<.0001);
 assert.equal(await page.evaluate(()=>window.__gpuCount),8922);

 const drawnHeading=await page.evaluate(()=>window.__drawHeading);assert.equal(drawnHeading,await page.locator('.horizon-heading').textContent());
 await page.mouse.move(x,y);await page.mouse.down();await page.evaluate(async({x,y})=>{const root=document.querySelector('.horizon-view');await new Promise(resolve=>{let n=0;function tick(){if(n++<20){root.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true,buttons:1,button:0,clientX:x+n*1.2,clientY:y}));requestAnimationFrame(tick)}else resolve()}requestAnimationFrame(tick)})},{x,y});
 assert.equal(await page.locator('.horizon-view canvas').evaluate(c=>c.width),Math.round(viewport.width*Math.min(dpr,1.5)));view.heading-=24*hf/viewport.width;
 const during=proj.projectPerspective(position,view,viewport.width,viewport.height);
 if(during){const actual=await page.locator('.sky-object').filter({hasText:'Sirius'}).evaluate(e=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top)}));assert(Math.hypot(actual.x-during.x,actual.y-during.y)<.01,'moving marker matches exact pose');}
 const movingPose=await page.evaluate(()=>window.__gpuPose);assert(Math.abs(movingPose.heading-view.heading)<.0001);

 await page.mouse.up();await page.waitForTimeout(400);assert.equal(await page.locator('.horizon-view canvas').evaluate(c=>c.width),Math.round(viewport.width*Math.min(dpr,1.5)),'short pause retains motion resolution');
 await page.waitForTimeout(550);assert.equal(await page.locator('.horizon-view canvas').evaluate(c=>c.width),viewport.width*dpr);
 const idle=await page.evaluate(()=>window.__draws);await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.__draws),idle,'idle RAF must stop');
 // Two-pointer pinch changes projection, releases cleanly and selects no marker.
 await page.evaluate(()=>{const el=document.querySelector('.horizon-view');const emit=(type,id,x)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',isPrimary:id===11,buttons:1,button:0,clientX:x,clientY:200}));emit('pointerdown',11,120);emit('pointerdown',12,220);emit('pointermove',12,270);emit('pointerup',12,270);emit('pointerup',11,120)});await page.waitForTimeout(80);assert.equal(await page.locator('.object-preview').count(),0);
 // Releasing a marker-origin drag must not activate it; a subsequent tap does.
 const target=page.locator('button.sky-object').filter({hasText:'Sirius'});if(await target.count()&&await target.isVisible()){const r=await target.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+25,r.y+r.height/2,{steps:4});await page.mouse.up();assert.equal(await page.locator('.object-preview').count(),0);if(await target.isVisible()){await target.click();assert.equal(await page.locator('.object-preview').count(),1);}}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS',viewport,'coalesced burst, accumulated camera, star/marker/HUD alignment, pinch/tap, idle shutdown');await page.close();}
 // Synthetic sensor publication across panel and map transitions.
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{DeviceOrientationEvent.requestPermission=()=>Promise.resolve('granted')});await page.goto((process.env.APP_URL || 'http://127.0.0.1:4194/noxari/')+'?skyRenderer=gpu');
 const emit=alpha=>page.evaluate(a=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:a,beta:90,gamma:0,absolute:false})),alpha);
 await page.getByRole('button',{name:'Follow',exact:true}).click();await emit(0);await page.waitForTimeout(100);await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('button',{name:'Phone direction',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Align north',exact:true}).click();await page.getByRole('button',{name:'Close panel'}).click();await page.waitForTimeout(60);
 await page.evaluate(()=>{for(const alpha of [350,340,330])window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha,beta:90,gamma:0,absolute:false}))});await page.waitForTimeout(80);assert.match(await page.locator('.horizon-heading').innerText(),/30°/);
 await page.getByRole('button',{name:'All results and filters',exact:true}).click();await emit(320);await page.getByRole('button',{name:'Close panel'}).click();await page.waitForTimeout(70);assert.match(await page.locator('.horizon-heading').innerText(),/40°/);assert.equal(await page.getByRole('button',{name:'Stop',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('button',{name:'Sky display',exact:true}).click();await page.getByRole('button',{name:'Sky map',exact:true}).click();await emit(310);await page.getByRole('button',{name:'Look around',exact:true}).click();await page.getByRole('button',{name:'Close panel'}).click();await page.waitForTimeout(70);assert.match(await page.locator('.horizon-heading').innerText(),/50°/);
 await page.evaluate(()=>{window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:300,beta:90,gamma:0,absolute:false}));[...document.querySelectorAll('.quick-tools button')].find(b=>b.textContent==='Stop').click()});await page.waitForTimeout(70);assert.match(await page.locator('.horizon-heading').innerText(),/50°/);assert(await page.getByRole('button',{name:'Follow',exact:true}).isVisible());assert.deepEqual(errors,[]);console.log('PASS synthetic sensors: latest sample, manual north, search persistence, map resume, Stop cancels pending publication');await page.close();
 // Resource recovery and bounded fallback on the real production component.
 for(const scenario of ['auto','canvas','gpu','unavailable','shader-error','draw-error','atlas-error','raster-error']){
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(date);await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(scenario=>{
   window.__contexts=[];window.__uploads=0;const get=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'&&scenario==='unavailable')return null;const result=get.call(this,type,...args);if(type==='webgl2'&&result&&!window.__contexts.includes(result))window.__contexts.push(result);return result};
   const gl=WebGL2RenderingContext.prototype,buffer=gl.bufferData;gl.bufferData=function(...args){window.__uploads++;return buffer.apply(this,args)};
   if(scenario==='shader-error')gl.getShaderParameter=()=>false;
   if(scenario==='atlas-error'){const upload=gl.texImage2D;gl.texImage2D=function(...args){if(args[3]===256&&args[4]===1024)throw new Error('injected atlas upload failure');return upload.apply(this,args)}};
   if(scenario==='raster-error')gl.checkFramebufferStatus=()=>0;
   if(scenario==='draw-error'){const draw=gl.drawArrays;gl.drawArrays=function(...args){if(args[0]===this.POINTS)throw new Error('injected draw failure');return draw.apply(this,args)}};
  },scenario);
  const preference=scenario==='auto'?'':scenario==='canvas'?'canvas':'gpu';
  await page.goto((process.env.APP_URL || 'http://127.0.0.1:4194/noxari/')+'?skyRenderer='+preference);
  await page.waitForTimeout(400);const root=page.locator('.horizon-view');
  const expected=await page.evaluate(scenario=>{if(scenario!=='auto')return scenario==='gpu'?'gpu':'canvas';const gl=window.__contexts[0];if(!gl)return 'canvas';const ext=gl.getExtension('WEBGL_debug_renderer_info');return /swiftshader|llvmpipe|software rasterizer/i.test(gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL||gl.RENDERER))?'canvas':'gpu'},scenario);
  assert.equal(await root.getAttribute('data-sky-renderer'),expected,scenario);
  const uploaded=await page.evaluate(()=>window.__uploads);
  await root.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.__uploads),uploaded,'camera movement must not upload the star catalog');
  if(scenario==='gpu'){
   await page.evaluate(()=>{const gl=window.__contexts.at(-1),ext=gl.getExtension('WEBGL_lose_context');window.__restore=()=>ext.restoreContext();ext.loseContext()});
   await page.waitForFunction(()=>document.querySelector('.horizon-view').dataset.skyRenderer==='canvas');
   await root.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(100);
   const last=await page.locator('.horizon-heading').textContent();
   await page.evaluate(()=>window.__restore());await page.waitForFunction(()=>document.querySelector('.horizon-view').dataset.skyRenderer==='gpu');
   assert.equal(await page.locator('.horizon-heading').textContent(),last,'context recovery preserves latest pose');
   await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('button',{name:'Sky display',exact:true}).click();
   for(let i=0;i<3;i++){
    await page.getByRole('button',{name:'Sky map',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.__contexts.at(-1).isContextLost()),true,'map switch releases GPU context');
    await page.getByRole('button',{name:'Look around',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.horizon-view').dataset.skyRenderer==='gpu');
   }
   await page.getByRole('button',{name:'Close panel'}).click();
   await page.screenshot({path:'/tmp/noxari-horizon-gpu.png'});
  }
  assert.deepEqual(errors,[]);console.log('PASS production backend / fallback / ownership',scenario);await page.close();
 }
}finally{await browser.close()}
