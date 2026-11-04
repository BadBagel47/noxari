// Optional environment-provided Playwright; runs against the ordinary production preview.
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
const base = process.env.APP_URL || 'http://127.0.0.1:4194/noxari/';
const allErrors = [], reports = [];
const words = sv => sv ? {more:'Mer', report:'Prestandarapport', start:'Starta mätning', stop:'Stoppa mätning', save:'Spara prestandarapport'} : {more:'More', report:'Performance report', start:'Start recording', stop:'Stop recording', save:'Save performance report'};
async function open(page, sv=false) { const w=words(sv);await page.getByRole('button',{name:w.more,exact:true}).click();await page.getByRole('button',{name:w.report,exact:true}).click(); }
async function start(page, sv=false) {await open(page,sv);await page.getByRole('button',{name:words(sv).start,exact:true}).click();await page.locator('.performance-capture').waitFor();assert.equal(await page.getByRole('dialog').count(),0);}
async function save(page, sv=false, stop=true) {
 if(stop)await page.getByRole('button',{name:words(sv).stop,exact:true}).click();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:words(sv).save,exact:true}).click();const download=await pending;
 assert.equal(download.suggestedFilename(),'noxari-performance.json');let data='';for await(const chunk of await download.createReadStream())data+=chunk;const report=JSON.parse(data);reports.push(report);return report;
}
async function pageFor({width=390,height=844,dpr=2,sv=false,mode='auto'}={}) {
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr,hasTouch:true});page.on('pageerror',e=>allErrors.push(e.message));
 await page.clock.setFixedTime(new Date('2026-01-15T22:00:00Z'));await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>{
  window.__draws=0;window.__permissionCalls=0;window.__gpsCalls=0;window.__contexts=[];
  DeviceOrientationEvent.requestPermission=()=>{window.__permissionCalls++;return Promise.resolve('granted')};
  Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){window.__gpsCalls++}}});
  const transform=CanvasRenderingContext2D.prototype.setTransform;CanvasRenderingContext2D.prototype.setTransform=function(...a){if(this.canvas.closest('.horizon-view'))window.__draws++;return transform.apply(this,a)};
  const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){const result=get.call(this,t,...a);if(t==='webgl2'&&result&&!window.__contexts.includes(result))window.__contexts.push(result);return result};
 });
 await page.goto(base+'?skyRenderer='+mode+(sv?'&lang=sv':''));await page.waitForFunction(()=>document.querySelector('.horizon-view')?.dataset.skyRenderer);await page.waitForTimeout(250);return page;
}
function validate(report) {
 assert.equal(report.kind,'sky-performance');assert.equal(report.reportVersion,1);assert.match(report.build.commit,/^[a-f0-9]{12}$/);
 assert.equal(report.active,false);assert.ok(report.frames.length>0);assert.ok(report.frames.length<=1200);assert.ok(report.contexts.length<=64);
 assert.equal(report.summary.frames,report.frames.length);
 for(const frame of report.frames){
  assert.ok(report.contexts[frame.context]);assert.ok(frame.frameTaskMs>=frame.commitMs);assert.ok(frame.frameTaskMs>=frame.drawMs);
  assert.ok(frame.gpuCopySubmissionMs<=frame.stagesMs.milkyWay+frame.stagesMs.stars+.006);
  for(const value of Object.values(frame.stagesMs))assert.ok(Number.isFinite(value)&&value>=0);
 }
 for(const context of report.contexts){assert.equal(context.starCount,8922);assert.equal(context.layerMask,31);assert.equal(context.figureMode,'all');}
 const keys=[];const visit=value=>{if(value&&typeof value==='object')for(const [key,v] of Object.entries(value)){keys.push(key);visit(v)}};visit(report);
 for(const field of ['latitude','longitude','location','selectedTime','heading','pitch','alpha','beta','gamma','userAgent','url','search','saved'])assert.ok(!keys.includes(field),field);
}
try {
 for(const test of [{width:390,height:844,dpr:2,mode:'gpu'},{width:1280,height:800,dpr:2,mode:'auto'},{width:568,height:320,dpr:1.25,sv:true,mode:'canvas'}]){
  const p=await pageFor(test),w=words(test.sv);assert.equal(await p.locator('.performance-capture').count(),0);
  await start(p,test.sv);const x=test.width*.4,y=test.height*.42;
  await p.mouse.move(x,y);await p.mouse.down();for(let i=1;i<=25;i++)await p.mouse.move(x+i*3,y+(i%3));await p.mouse.up();
  await p.waitForTimeout(350);const draws=await p.evaluate(()=>window.__draws);await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>window.__draws),draws,'diagnostics must remain idle');
  const report=await save(p,test.sv);validate(report);assert.equal(report.stopReason,'manual');assert.ok(report.frames.some(f=>f.inputs['manual-view']>0));
  if(test.mode==='gpu'){assert.ok(report.contexts.every(c=>c.backend==='gpu'));assert.ok(report.frames.some(f=>f.gpuCopyCalls===2));assert.ok(report.summary.gpuCopySubmissionMs.count>0);}
  assert.deepEqual(await p.evaluate(()=>[window.__permissionCalls,window.__gpsCalls]),[0,0]);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(test.width===390)await p.screenshot({path:'/tmp/noxari-performance-panel.png'});
  assert.equal(await p.getByRole('button',{name:w.save,exact:true}).isEnabled(),true);
  console.log('PASS ordinary report manual/idle/download/layout',test,report.frames.length);await p.close();
 }
 // Follow requests retain their source; the nested camera setter is not counted as manual input.
 const p=await pageFor({mode:'gpu'});await p.getByRole('button',{name:'Follow',exact:true}).click();
 const emit=alpha=>p.evaluate(alpha=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha,beta:90,gamma:0,absolute:false})),alpha);
 await emit(0);await p.waitForTimeout(80);await p.getByRole('button',{name:'More',exact:true}).click();await p.getByRole('button',{name:'Phone direction',exact:true}).click();
 await p.getByRole('dialog').getByRole('button',{name:'Align north',exact:true}).click();await p.getByRole('button',{name:'Close panel'}).click();await start(p);
 for(let i=1;i<=12;i++){await emit(360-i);await p.waitForTimeout(30);}
 const phone=await save(p);validate(phone);assert.ok(phone.frames.some(f=>f.inputs['phone-publication']>0));assert.ok(phone.frames.every(f=>f.inputs['manual-view']===0));
 assert.ok(phone.contexts.some(c=>c.following));assert.equal(await p.evaluate(()=>window.__permissionCalls),1);await p.close();console.log('PASS phone publication source without raw sensor data');
 // Runtime GPU loss is represented by real Canvas/fallback contexts in the report.
 const loss=await pageFor({mode:'gpu'});await start(loss);await loss.locator('.horizon-view').focus();await loss.keyboard.press('ArrowRight');await loss.waitForTimeout(100);
 await loss.evaluate(()=>window.__contexts.at(-1).getExtension('WEBGL_lose_context').loseContext());
 await loss.waitForFunction(()=>document.querySelector('.horizon-view').dataset.skyRenderer==='canvas');await loss.locator('.horizon-view').focus();await loss.keyboard.press('ArrowRight');await loss.waitForTimeout(100);
 const fallback=await save(loss);validate(fallback);assert.ok(fallback.contexts.some(c=>c.backend==='gpu'));assert.ok(fallback.contexts.some(c=>c.backend==='canvas'&&c.reason==='context-lost'));await loss.close();console.log('PASS runtime fallback identity');
 // A real map transition stops capture but retains the downloadable report.
 const map=await pageFor();await start(map);await map.locator('.horizon-view').focus();await map.keyboard.press('ArrowRight');await map.waitForTimeout(100);
 await map.getByRole('button',{name:'More',exact:true}).click();await map.getByRole('button',{name:'Sky display',exact:true}).click();await map.getByRole('button',{name:'Sky map',exact:true}).click();await map.getByRole('button',{name:'Close panel'}).click();await open(map);
 assert.equal(await map.getByRole('button',{name:'New recording',exact:true}).isDisabled(),true);const mapReport=await save(map,false,false);assert.equal(mapReport.stopReason,'view-unavailable');await map.close();console.log('PASS map transition / retained report');
 // Simulated page visibility transition stops the recorder and preserves its report.
 const hidden=await pageFor();await start(hidden);await hidden.locator('.horizon-view').focus();await hidden.keyboard.press('ArrowRight');await hidden.waitForTimeout(100);
 await hidden.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
 await hidden.getByRole('button',{name:'View report',exact:true}).click();const hiddenReport=await save(hidden,false,false);assert.equal(hiddenReport.stopReason,'page-hidden');await hidden.close();console.log('PASS simulated hidden-page cleanup');
 // Advance only the diagnostic session's timer; avoid a 30-second wall-clock wait.
 const timer=await pageFor();await timer.clock.install();await start(timer);await timer.locator('.horizon-view').focus();await timer.keyboard.press('ArrowRight');await timer.clock.runFor(100);
 await timer.clock.runFor(30_000);await timer.getByRole('button',{name:'View report',exact:true}).click();const timed=await save(timer,false,false);assert.equal(timed.stopReason,'time-limit');await timer.close();console.log('PASS automatic time limit');
 assert.deepEqual(allErrors,[]);if(process.env.QA_OUTPUT)writeFileSync(process.env.QA_OUTPUT,JSON.stringify(reports,null,2));console.log('PASS no page errors, opt-in recording, local reports');
} finally {await browser.close();}
