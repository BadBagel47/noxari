// Optional production-browser check. Software GPU timings are not phone evidence.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.APP_URL||'http://127.0.0.1:58980/noxari/';
const errors=[];
async function pageFor(sv=false) {
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});
 page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-01-15T22:00:00Z'));
 await page.addInitScript(()=>{
  window.__permissionCalls=0;window.__gpsCalls=0;window.__contexts=[];window.__sizes=[];window.__draws=0;
  DeviceOrientationEvent.requestPermission=()=>{window.__permissionCalls++;return Promise.resolve('granted')};
  Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){window.__gpsCalls++}}});
  const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){const result=get.call(this,t,...a);if(t==='webgl2'&&result&&!window.__contexts.includes(result))window.__contexts.push(result);return result};
  const transform=CanvasRenderingContext2D.prototype.setTransform;CanvasRenderingContext2D.prototype.setTransform=function(...a){if(this.canvas.closest('.horizon-view'))window.__draws++;return transform.apply(this,a)};
  const image=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(source,...a){if(this.canvas.closest('.horizon-view')&&source instanceof HTMLCanvasElement&&a.length===8)window.__sizes.push({source:[source.width,source.height],crop:a.slice(0,4),destination:a.slice(4),scale:this.getTransform().a});return image.call(this,source,...a)};
 });
 await page.goto(base+'?skyRenderer=gpu'+(sv?'&lang=sv':''));
 await page.waitForFunction(()=>document.querySelector('.horizon-view')?.dataset.skyRenderer==='gpu');await page.waitForTimeout(1200);return page;
}
async function start(page,sv=false){await page.getByRole('button',{name:sv?'Mer':'More',exact:true}).click();await page.getByRole('button',{name:sv?'Prestandarapport':'Performance report',exact:true}).click();await page.getByRole('button',{name:sv?'Starta kontrollerad jämförelse':'Start controlled comparison',exact:true}).click();}
async function save(page,sv=false){const pending=page.waitForEvent('download');await page.getByRole('button',{name:sv?'Spara jämförelserapport':'Save comparison report',exact:true}).click();const download=await pending;assert.equal(download.suggestedFilename(),'noxari-surface-comparison.json');let data='';for await(const c of await download.createReadStream())data+=c;return JSON.parse(data);}
try {
 const p=await pageFor();const original=await p.locator('.horizon-heading').textContent();const stamp=await p.locator('.observation-chip').textContent();
 await p.evaluate(()=>{window.__sizes=[]});await start(p);
 await p.getByRole('button',{name:'View report',exact:true}).waitFor({timeout:65000});
 assert.ok((await p.locator('.performance-capture').textContent()).includes('Comparison complete'));
 assert.equal(await p.locator('.horizon-heading').textContent(),original);assert.equal(await p.locator('.observation-chip').textContent(),stamp);
 await p.getByRole('button',{name:'View report',exact:true}).click();const report=await save(p);
 console.log('Completed browser ABBA capture');assert.equal(report.valid,true);assert.equal(report.active,false);assert.deepEqual(report.runs.map(r=>r.policy),['exact','retained','retained','exact']);
 assert.deepEqual(report.runs.map(r=>r.report.frames.length),[240,240,240,240]);
 for(const run of report.runs){assert.ok(run.report.contexts.every(c=>c.backend==='gpu'&&!c.following&&c.timeMode==='fixed'));assert.deepEqual([...new Set(run.report.contexts.map(c=>c.dpr))].sort(),[1.5,2]);assert.ok(run.report.frames.every(f=>f.inputs['scripted-view']===1&&f.inputs['manual-view']===0&&f.inputs['phone-publication']===0));assert.ok(run.report.summary.rafWaitMs.count>=239);assert.ok(run.report.summary.callbackToDrawEndMs.count===240);}
 const sizes=await p.evaluate(()=>window.__sizes);assert.ok(sizes.some(s=>s.source[0]>s.crop[2]),'retained source remains larger than active crop');assert.ok(sizes.some(s=>s.source[0]===s.crop[2]),'exact source matches active crop');
 for(const s of sizes){assert.equal(s.crop[2],Math.round(s.destination[2]*s.scale));assert.equal(s.crop[3],Math.round(s.destination[3]*s.scale));assert.equal(s.crop[1],s.source[1]-s.crop[3]);}
 assert.deepEqual(await p.evaluate(()=>[window.__permissionCalls,window.__gpsCalls,window.__contexts.length]),[0,0,1]);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.screenshot({path:'/tmp/noxari-comparison-panel.png'});writeFileSync('/tmp/noxari-surface-comparison-browser.json',JSON.stringify(report,null,2));
 // A fresh ordinary recording supersedes the completed comparison badge; both reports remain saveable.
 await p.getByRole('button',{name:'Start recording',exact:true}).click();assert.equal(await p.locator('.performance-capture').count(),1);
 await p.locator('.horizon-view').focus();await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);
 await p.getByRole('button',{name:'Stop recording',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Save performance report',exact:true}).isEnabled(),true);
 assert.equal((await save(p)).valid,true);
 await p.getByRole('button',{name:'Close panel',exact:true}).click();await p.waitForTimeout(2000);let draws=await p.evaluate(()=>window.__draws);await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>window.__draws),draws,'idle after restore');
 await start(p);await p.waitForTimeout(300);await p.mouse.click(170,360);await p.getByRole('button',{name:'View report',exact:true}).click();assert.equal((await save(p)).reason,'user-interaction');
 await p.getByRole('button',{name:'Close panel',exact:true}).click();await start(p);await p.waitForTimeout(300);await p.setViewportSize({width:400,height:844});await p.getByRole('button',{name:'View report',exact:true}).click();assert.equal((await save(p)).reason,'scene-changed');
 await p.getByRole('button',{name:'Close panel',exact:true}).click();await start(p);await p.waitForTimeout(300);await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden});await p.getByRole('button',{name:'View report',exact:true}).click();assert.equal((await save(p)).reason,'page-hidden');
 await p.getByRole('button',{name:'Close panel',exact:true}).click();await start(p);await p.waitForTimeout(300);await p.evaluate(()=>window.__contexts[0].getExtension('WEBGL_lose_context').loseContext());await p.getByRole('button',{name:'View report',exact:true}).click();assert.equal((await save(p)).reason,'gpu-unavailable');await p.close();
 const sv=await pageFor(true);await start(sv,true);await sv.getByRole('button',{name:'Stoppa jämförelse',exact:true}).click();assert.equal((await save(sv,true)).reason,'manual');await sv.close();
 assert.deepEqual(errors,[]);console.log('PASS controlled ABBA mobile run: 4×240 samples, actual buffer/crop policies, scheduling metrics, view/time restoration, one context, idle, input/resize/hide/GPU/Stop cancellation, EN/SV, no permissions/errors.');
} finally {await browser.close();}
