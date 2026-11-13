// Opt-in collector overhead: paired ordinary-app sweeps with the same external timing probe.
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const rows=[];try{
 for(const recording of [false,true,true,false]){
  const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  await p.clock.setFixedTime(new Date('2026-01-15T22:00:00Z'));
  await p.addInitScript(()=>{
   window.__probe={active:false,latest:null,draw:[],input:[]};
   window.addEventListener('pointermove',()=>{if(window.__probe.active)window.__probe.latest=performance.now()},true);
   const set=CanvasRenderingContext2D.prototype.setTransform;
   CanvasRenderingContext2D.prototype.setTransform=function(...a){if(this.canvas.closest('.horizon-view')&&window.__probe.active){const t=performance.now(),latest=window.__probe.latest;window.__probe.latest=null;queueMicrotask(()=>{window.__probe.draw.push(performance.now()-t);if(latest!==null)window.__probe.input.push(performance.now()-latest)})}return set.apply(this,a)};
  });
  await p.goto((process.env.APP_URL || 'http://127.0.0.1:4194/noxari/')+'?skyRenderer='+(process.env.SKY_RENDERER || 'auto'));await p.waitForTimeout(1300);
  if(recording){await p.getByRole('button',{name:'More',exact:true}).click();await p.locator('.more-advanced:not([open]) > summary').click().catch(()=>{});await p.getByRole('button',{name:'Performance report',exact:true}).click();await p.getByRole('button',{name:'Start recording',exact:true}).click();}
  await p.waitForTimeout(400);await p.mouse.move(170,400);await p.mouse.down();
  const metrics=await p.evaluate(async()=>{
   const root=document.querySelector('.horizon-view'),times=[];window.__probe.active=true;
   await new Promise(resolve=>{let n=0,last=0;const tick=now=>{if(last)times.push(now-last);last=now;if(n++<90){root.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,buttons:1,clientX:170+n*1.1,clientY:400}));requestAnimationFrame(tick)}else resolve()};requestAnimationFrame(tick)});
   window.__probe.active=false;const stat=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,median:s[Math.floor(s.length*.5)]??0,p95:s[Math.floor(s.length*.95)]??0,max:s.at(-1)??0}};
   return {cadence:stat(times),over25ms:times.filter(x=>x>25).length,drawTask:stat(window.__probe.draw),handledInputToTaskEnd:stat(window.__probe.input),backend:root.dataset.skyRenderer};
  });
  await p.mouse.up();let internal=null;
  if(recording){await p.getByRole('button',{name:'Stop recording',exact:true}).click();const event=p.waitForEvent('download');await p.getByRole('button',{name:'Save performance report',exact:true}).click();let json='';for await(const b of await(await event).createReadStream())json+=b;const r=JSON.parse(json);internal={build:r.build,summary:r.summary,contextCount:r.contexts.length};}
  const row={recording,...metrics,internal};rows.push(row);console.log(JSON.stringify(row));await p.close();
 }
 if(process.env.PERF_OUTPUT)writeFileSync(process.env.PERF_OUTPUT,JSON.stringify(rows,null,2));
}finally{await browser.close()}
