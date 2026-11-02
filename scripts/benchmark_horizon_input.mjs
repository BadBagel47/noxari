// Optional browser input-to-draw proxy; not presented-frame latency or physical FPS.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
const rows=[];try{
for(const variant of ['baseline','auto','gpu','gpu','auto','baseline']){
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});await page.clock.setFixedTime(new Date('2026-01-15T22:00:00Z'));
 await page.addInitScript(()=>{
  window.__measure={active:false,latest:null,draws:[],latencies:[],backends:[],trustedInputs:0};
  window.addEventListener('pointermove',event=>{if(window.__measure.active){window.__measure.latest=performance.now();if(event.isTrusted)window.__measure.trustedInputs++}},true);
  const set=CanvasRenderingContext2D.prototype.setTransform;
  CanvasRenderingContext2D.prototype.setTransform=function(...args){
   if(this.canvas.closest('.horizon-view')&&window.__measure.active){const t=performance.now(),input=window.__measure.latest;window.__measure.latest=null;queueMicrotask(()=>{window.__measure.draws.push(performance.now()-t);if(input!==null)window.__measure.latencies.push(performance.now()-input);window.__measure.backends.push(this.canvas.parentElement.dataset.skyRenderer||'legacy-canvas')})}
   return set.apply(this,args);
  };
 });
 const app=process.env.APP_URL || 'http://127.0.0.1:4194/noxari/';
 const url=variant==='baseline'?(process.env.BASELINE_URL || app+'?skyRenderer=canvas'):app+'?skyRenderer='+variant;
 await page.goto(url);await page.waitForTimeout(1500);await page.mouse.move(170,400);await page.mouse.down();
 const result=await page.evaluate(async()=>{
  const root=document.querySelector('.horizon-view'),times=[];window.__measure.active=true;let last=0,n=0;
  await new Promise(resolve=>{const tick=now=>{if(last)times.push(now-last);last=now;if(n++<90){root.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,buttons:1,clientX:170+n*1.1,clientY:400}));requestAnimationFrame(tick)}else resolve()};requestAnimationFrame(tick)});
  window.__measure.active=false;
  const stat=a=>{const s=[...a].sort((a,b)=>a-b);return {count:s.length,median:s[Math.floor(s.length*.5)]??0,p95:s[Math.floor(s.length*.95)]??0,max:s.at(-1)??0}};
  return {intervals:stat(times),over25:times.filter(t=>t>25).length,draw:stat(window.__measure.draws),inputToDrawEnd:stat(window.__measure.latencies),backends:[...new Set(window.__measure.backends)]};
 });
 await page.mouse.up();
 await page.evaluate(()=>{window.__measure={active:true,latest:null,draws:[],latencies:[],backends:[],trustedInputs:0}});
 await page.mouse.move(140,400);await page.mouse.down();
 for(let i=1;i<=20;i++)await page.mouse.move(140+i*3,400);
 await page.mouse.up();await page.waitForTimeout(100);
 const trustedSweep=await page.evaluate(()=>{
  window.__measure.active=false;const a=window.__measure.latencies.slice().sort((a,b)=>a-b);
  return {trustedPointerEvents:window.__measure.trustedInputs,drawCount:a.length,inputToDrawEnd:{median:a[Math.floor(a.length*.5)]??0,p95:a[Math.floor(a.length*.95)]??0,max:a.at(-1)??0}};
 });
 rows.push({variant,...result,trustedSweep});console.log(JSON.stringify(rows.at(-1)));await page.close();
}
if(process.env.PERF_OUTPUT)writeFileSync(process.env.PERF_OUTPUT,JSON.stringify(rows,null,2));
}finally{await browser.close()}
