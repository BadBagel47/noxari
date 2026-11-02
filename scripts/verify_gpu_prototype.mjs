// Optional browser verification; Playwright is supplied by the execution environment.
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,reducedMotion:'reduce'});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.LAB_URL || 'http://127.0.0.1:4194/noxari/labs/gpu-sky/');await page.waitForFunction(()=>window.skyLab);
const verified=await page.evaluate(()=>{
 const {GpuSky,prepareHorizontalStars,projectPerspective,MilkyWayPainter,texture}=skyLab.testing;
 const gpu=new GpuSky(document.createElement('canvas'));
 const w=390,h=844,dpr=2;
 const canvas=()=>{const c=document.createElement('canvas');c.width=w*dpr;c.height=h*dpr;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.setTransform(dpr,0,0,dpr,0,0);return ctx};
 const cpu=canvas(),out=canvas();
 const pixels=ctx=>ctx.getImageData(0,0,w*dpr,h*dpr).data;
 const clear=ctx=>ctx.clearRect(0,0,w,h);
 const stats=ctx=>{const p=pixels(ctx);let sum=0,x=0,y=0;for(let i=3;i<p.length;i+=4){const a=p[i];sum+=a;x+=((i-3)/4%(w*dpr)+.5)*a;y+=(Math.floor((i-3)/4/(w*dpr))+.5)*a}return {alpha:sum,center:sum?{x:x/sum/dpr,y:y/sum/dpr}:null}};
 const cases=[
  [{heading:180,pitch:31},170,36,1,1,0],
  [{heading:359,pitch:31},1,25,3,1,0],
  [{heading:1,pitch:89.9},270,89,1,1,0],
  [{heading:240,pitch:-89.9},90,-89,3,0,.8],
  [{heading:0,pitch:-25},5,-26,1,0,1],
  [{heading:0,pitch:-25},5,-26,1,0,0],
  [{heading:180,pitch:0},0,0,1,1,0],
  [{heading:180,pitch:31},180,31,1,0,0],
 ];
 const starResults=[];
 for(const [view,azimuth,altitude,zoom,visibility,below] of cases)for(const magnitude of [-1,1,3,6.5]){
  const star=prepareHorizontalStars([{azimuth,altitude,magnitude,hip:1}])[0];gpu.setScene([star],texture);clear(out);gpu.drawStars(out,w,h,dpr,view,visibility,below,zoom);
  const actual=stats(out);const expected=(visibility>0||altitude<0&&below>0)?projectPerspective(star,view,w,h,true,below>0,zoom):null;
  const error=expected&&actual.center?Math.hypot(expected.x-actual.center.x,expected.y-actual.center.y):null;
  starResults.push({view,azimuth,altitude,zoom,magnitude,visible:!!actual.center,expectedVisible:!!expected,error});
 }
 const energy=[];
 for(const magnitude of [-1,1,3,6.5]){
  const star=prepareHorizontalStars([{azimuth:180,altitude:31,magnitude,hip:1}])[0];
  gpu.setScene([star],texture);clear(out);gpu.drawStars(out,w,h,dpr,{heading:180,pitch:31},1,0,1);
  clear(cpu);cpu.fillStyle='#e3f1ff';const brightness=magnitude<=5.8?Math.max(.18,Math.min(1,(6.1-magnitude)/5.8)):Math.max(.05,.18-(magnitude-5.8)*.13/.7);cpu.globalAlpha=.28+brightness*.72;cpu.beginPath();cpu.arc(w/2,h/2,magnitude<0?3:magnitude<2?2.2:magnitude<4?1.5:.9,0,2*Math.PI);cpu.fill();cpu.globalAlpha=1;
  energy.push({magnitude,ratio:stats(out).alpha/stats(cpu).alpha});
 }
 gpu.setScene(skyLab.scene().stars,texture);
 const mw=[];const painter=new MilkyWayPainter();
 for(const view of [{heading:180,pitch:31},{heading:359.9,pitch:0},{heading:.1,pitch:0},{heading:30,pitch:89.9},{heading:250,pitch:-89.9}])for(const zoom of [1,3]){
  clear(cpu);clear(out);painter.draw(cpu,texture,skyLab.scene().time,skyLab.scene().location,w,h,1,view,view.pitch<0,zoom);
  gpu.drawMilkyWay(out,w,h,dpr,view,1,view.pitch<0,zoom,skyLab.scene().basis,skyLab.scene().key);
  const a=pixels(cpu),b=pixels(out);let s=0,sq=0,max=0;
  for(let i=3;i<a.length;i+=4){const diff=Math.abs(a[i]-b[i]);s+=diff;sq+=diff*diff;max=Math.max(max,diff)}
  mw.push({view,zoom,alphaMeanError:s/(a.length/4),alphaRmse:Math.sqrt(sq/(a.length/4)),alphaMax:max});
 }
 const glError=gpu.gl.getError();gpu.dispose();return {starResults,energy,mw,glError};
});
assert.equal(verified.glError,0);
for(const c of verified.starResults){assert.equal(c.visible,c.expectedVisible);if(c.error!==null)assert.ok(c.error<.4,JSON.stringify(c));}
for(const c of verified.mw)assert.ok(c.alphaRmse<2,JSON.stringify(c));
assert.equal(errors.length,0,errors.join('\n'));
// Exercise the real controller's fallback and resource recreation.
await page.evaluate(()=>{const ext=skyLab.gpu().gl.getExtension('WEBGL_lose_context');window.restoreGpu=()=>ext.restoreContext();ext.loseContext();});
await page.waitForFunction(()=>!skyLab.gpu());
assert.equal(await page.evaluate(()=>{skyLab.configure({mode:'gpu'});return skyLab.render().effective;}),'canvas');
await page.evaluate(()=>window.restoreGpu());await page.waitForFunction(()=>skyLab.gpu()?.available);
assert.equal(await page.evaluate(()=>skyLab.render().effective),'gpu');
for(const size of [{width:390,height:844},{width:1280,height:800},{width:568,height:320}]){
 await page.setViewportSize(size);await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.ok(await page.locator('#compare').isVisible());
 await page.locator('summary').click();
 await page.locator('#stage').focus();await page.keyboard.press('ArrowRight');
 await page.locator('summary').click();
}
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
await page.evaluate(()=>{window.cancelResult=skyLab.sweep('gpu',90).then(()=>false,()=>true);setTimeout(()=>skyLab.cancel(),50);});
assert.equal(await page.evaluate(()=>window.cancelResult),true);
assert.equal(await page.locator('#compare').isEnabled(),true);
await page.evaluate(()=>{window.resizeResult=skyLab.sweep('gpu',90).then(()=>false,()=>true);});
await page.setViewportSize({width:400,height:844});
assert.equal(await page.evaluate(()=>window.resizeResult),true);
// Manual gesture path: pinch zoom and then one-finger pan, without sensors.
await page.locator('summary').click();
const cdp=await context.newCDPSession(page);
const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y}))});
await touch('touchStart',[[1,130,420],[2,230,420]]);
await touch('touchMove',[[1,80,420],[2,280,420]]);await touch('touchEnd',[]);
await page.waitForTimeout(100);
assert.match(await page.locator('#pose').textContent(),/2[.,]00×/);
const before=await page.locator('#pose').textContent();
await touch('touchStart',[[1,180,420]]);await touch('touchMove',[[1,260,450]]);await touch('touchEnd',[]);
await page.waitForTimeout(100);assert.notEqual(await page.locator('#pose').textContent(),before);
await page.screenshot({path:'/tmp/noxari-gpu-collapsed.png'});
await page.locator('summary').click();
await page.locator('#compare').click();await page.waitForFunction(()=>!document.querySelector('#download').disabled,{},{timeout:30000});
const downloadEvent=page.waitForEvent('download');await page.locator('#download').click();const downloaded=await downloadEvent;
assert.equal(downloaded.suggestedFilename(),'noxari-gpu-prototype.json');
const stream=await downloaded.createReadStream();let json='';for await(const chunk of stream)json+=chunk;
const report=JSON.parse(json);assert.deepEqual(report.runs.map(r=>r.effective),['canvas','gpu','gpu','canvas']);
assert.equal(JSON.stringify(report).includes('latitude'),false);
const fallback=await browser.newPage({viewport:{width:390,height:844}});
await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args)};});
await fallback.goto(process.env.LAB_URL || 'http://127.0.0.1:4194/noxari/labs/gpu-sky/');await fallback.waitForFunction(()=>window.skyLab);
assert.equal(await fallback.evaluate(()=>skyLab.render().effective),'canvas');
assert.equal(await fallback.locator('#mode option[value="gpu"]').evaluate(option=>option.disabled),true);
assert.equal(errors.length,0,errors.join('\n'));
if(process.env.QA_OUTPUT)writeFileSync(process.env.QA_OUTPUT,JSON.stringify(verified,null,2));
console.log(JSON.stringify({starCases:verified.starResults.length,maxCentroidError:Math.max(...verified.starResults.map(c=>c.error||0)),energyRatios:verified.energy,milkyCases:verified.mw.length,maxAlphaRmse:Math.max(...verified.mw.map(c=>c.alphaRmse)),contextRecovery:true,fallback:true,resizeCancel:true,errors},null,2));
} finally { await browser.close(); }
