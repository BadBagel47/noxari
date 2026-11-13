// Paired ordinary-app reports for short stop/start gestures. Software GPU timings
// are diagnostic only; physical phone responsiveness must be compared separately.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const rows=[];
try {
 for(const variant of ['before','after','after','before']){
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  await page.clock.setFixedTime(new Date('2026-01-15T22:00:00Z'));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__resources={active:false,atlasUploads:0,attachments:0,statusChecks:0,gpuSurfaceWrites:0};
   const gpuCanvases=new WeakSet(),get=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){const result=get.call(this,type,...args);if(type==='webgl2'&&result)gpuCanvases.add(this);return result};
   for(const name of ['width','height']){
    const descriptor=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,name);
    Object.defineProperty(HTMLCanvasElement.prototype,name,{...descriptor,set(value){if(window.__resources.active&&gpuCanvases.has(this))window.__resources.gpuSurfaceWrites++;descriptor.set.call(this,value)}});
   }
   const gl=WebGL2RenderingContext.prototype;
   for(const name of ['texImage2D','framebufferTexture2D','checkFramebufferStatus']){
    const original=gl[name];gl[name]=function(...a){
     const r=window.__resources;
     if(r.active){if(name==='texImage2D'&&a[3]===256&&a[4]===1024)r.atlasUploads++;if(name==='framebufferTexture2D')r.attachments++;if(name==='checkFramebufferStatus')r.statusChecks++;}
     return original.apply(this,a);
    };
   }
  });
  const base=variant==='before'?process.env.BASELINE_URL:process.env.APP_URL;
  assert.ok(base,'Set BASELINE_URL and APP_URL to the production previews');
  await page.goto(base+'?skyRenderer=gpu');await page.getByRole('button',{name:'Time & location',exact:true}).click();await page.getByRole('button',{name:'Now',exact:true}).click();await page.getByRole('button',{name:'Close panel'}).click();await page.waitForTimeout(1300);
  await page.getByRole('button',{name:'More',exact:true}).click();await page.locator('.more-advanced:not([open]) > summary').click().catch(()=>{});await page.getByRole('button',{name:'Performance report',exact:true}).click();
  await page.getByRole('button',{name:'Start recording',exact:true}).click();
  await page.evaluate(()=>{window.__resources.active=true;});
  for(let burst=0;burst<6;burst++){
   await page.mouse.move(140,370);await page.mouse.down();
   await page.evaluate(async()=>{
    const root=document.querySelector('.horizon-view');
    const emit=x=>root.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true,buttons:1,button:0,clientX:x,clientY:370}));
    await new Promise(resolve=>{let i=0;function move(){if(++i<=8){emit(140+i*4);requestAnimationFrame(move)}else resolve()}requestAnimationFrame(move)});
   });
   await page.mouse.up();await page.waitForTimeout(400);
  }
  await page.waitForTimeout(950);
  await page.evaluate(()=>{window.__resources.active=false;});
  await page.getByRole('button',{name:'Stop recording',exact:true}).click();
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save performance report',exact:true}).click();
  let json='';for await(const part of await(await pending).createReadStream())json+=part;
  const report=JSON.parse(json),frames=report.frames;
  const dprs=frames.map(f=>report.contexts[f.context].dpr);
  const changes=dprs.slice(1).filter((v,i)=>v!==dprs[i]).length;
  const row={variant,environment:'headless Chromium / SwiftShader, forced GPU',gestures:6,pauseMs:400,resources:await page.evaluate(()=>window.__resources),dprSwitches:changes,summary:report.summary};
  assert.ok(report.contexts.every(c=>c.backend==='gpu'&&c.layerMask===31&&c.figureMode==='all'));
  assert.deepEqual(errors,[]);rows.push(row);console.log(JSON.stringify(row));await page.close();
 }
 if(process.env.PERF_OUTPUT)writeFileSync(process.env.PERF_OUTPUT,JSON.stringify(rows,null,2));
} finally {await browser.close();}
