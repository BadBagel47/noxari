// Compare ordinary Canvas output against a production baseline; no timing during readback.
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.APP_URL || 'http://127.0.0.1:4194/noxari/';
assert.ok(process.env.BASELINE_URL,'Set BASELINE_URL to the previous production build');
const results=[],errors=[];
async function snapshot(p){await p.waitForTimeout(950);return p.locator('.sky-canvas canvas').evaluate(c=>c.toDataURL());}
async function display(p){await p.getByRole('button',{name:'More',exact:true}).click();await p.getByRole('button',{name:'Sky display',exact:true}).click();}
try {
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const pages=[];
  for(const url of [process.env.BASELINE_URL,base]){
   const p=await browser.newPage({viewport,deviceScaleFactor:2,hasTouch:true,reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date('2026-01-15T22:00:00Z'));await p.goto(url+'?skyRenderer=canvas');await p.getByRole('button',{name:'Time & location',exact:true}).click();await p.getByRole('button',{name:'Now',exact:true}).click();await p.getByRole('button',{name:'Close panel'}).click();pages.push(p);
  }
  for(const mode of ['horizon','common','names-off','below','pinch','map']){
   for(const p of pages){
    if(mode==='common'){await display(p);await p.getByRole('button',{name:'Common (24)',exact:true}).click();await p.getByRole('button',{name:'Close panel'}).click();}
    if(mode==='names-off'){await display(p);await p.getByRole('checkbox',{name:'Latin names',exact:true}).uncheck();await p.getByRole('button',{name:'All (88)',exact:true}).click();await p.getByRole('button',{name:'Close panel'}).click();}
    if(mode==='below'){await display(p);await p.getByRole('checkbox',{name:'Latin names',exact:true}).check();await p.getByRole('button',{name:'Close panel'}).click();await p.locator('.horizon-view').focus();await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowDown');}
    if(mode==='pinch')await p.evaluate(()=>{const el=document.querySelector('.horizon-view');const emit=(type,id,x)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:id,pointerType:'touch',isPrimary:id===11,buttons:1,button:0,clientX:x,clientY:300}));emit('pointerdown',11,120);emit('pointerdown',12,220);emit('pointermove',12,270);emit('pointerup',12,270);emit('pointerup',11,120)});
    if(mode==='map'){await display(p);await p.getByRole('button',{name:'Sky map',exact:true}).click();await p.getByRole('button',{name:'Close panel'}).click();}
   }
   const images=await Promise.all(pages.map(snapshot));
   const stats=await pages[1].evaluate(async urls=>{
    const images=await Promise.all(urls.map(url=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.src=url})));
    const pixels=images.map(image=>{const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,c.width,c.height).data});
    const [a,b]=pixels;if(a.length!==b.length)throw new Error('Canvas size differs');
    let sum=0,sq=0,max=0,count=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);sum+=d;sq+=d*d;max=Math.max(max,d);if(d)count++;}
    return {mean:sum/a.length,rmse:Math.sqrt(sq/a.length),max,changedChannels:count};
   },images);
   const row={viewport,mode,...stats};results.push(row);assert.ok(row.rmse<.1,JSON.stringify(row));console.log('PASS canvas coverage',JSON.stringify(row));
  }
  for(const p of pages)await p.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS names/selection, below-horizon, pinch and map invalidation; no page errors');
} finally {await browser.close();}
