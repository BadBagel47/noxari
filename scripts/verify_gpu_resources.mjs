// Real WebGL resource/coverage checks. Playwright is provided by the environment.
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
try {
 const page = await browser.newPage(), errors = [];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(process.env.LAB_URL || 'http://127.0.0.1:4194/noxari/labs/gpu-sky/');
 await page.waitForFunction(()=>window.skyLab);
 const result = await page.evaluate(()=>{
  const {GpuSky,texture} = skyLab.testing;
  const gpu = new GpuSky(document.createElement('canvas'),true), gl=gpu.gl;
  const counts={atlasUploads:0,attachments:0,statusChecks:0,maxTextures:0,resizes:0};
  const tracked=new Set(),created=new Set(),deleted=new Set();
  const original={};
  for(const name of ['texImage2D','framebufferTexture2D','checkFramebufferStatus','createTexture','deleteTexture']){
   original[name]=gl[name].bind(gl);
   gl[name]=(...args)=>{
    if(name==='texImage2D' && args[3]===256 && args[4]===1024)counts.atlasUploads++;
    if(name==='framebufferTexture2D')counts.attachments++;
    if(name==='checkFramebufferStatus')counts.statusChecks++;
    const value=original[name](...args);
    if(name==='createTexture' && value){tracked.add(value);created.add(value);counts.maxTextures=Math.max(counts.maxTextures,tracked.size);}
    if(name==='deleteTexture'){tracked.delete(args[0]);deleted.add(args[0]);}
    return value;
   };
  }
  for(const name of ['width','height']){
   const descriptor=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,name);
   Object.defineProperty(gpu.canvas,name,{get(){return descriptor.get.call(this)},set(value){counts.resizes++;descriptor.set.call(this,value)}});
  }
  gpu.setScene(skyLab.scene().stars,texture);
  const canvas=document.createElement('canvas'),out=canvas.getContext('2d',{willReadFrequently:true});
  const paint=(dpr,heading=180,width=96,height=128)=>{
   canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);out.setTransform(dpr,0,0,dpr,0,0);
   const view={heading,pitch:31};
   gpu.drawMilkyWay(out,width,height,dpr,view,1,false,1,skyLab.scene().basis,skyLab.scene().key);
   gpu.drawStars(out,width,height,dpr,view,1,0,1);
   return Array.from(out.getImageData(0,0,canvas.width,canvas.height).data);
  };
  const firstFull=paint(2),firstMotion=paint(1.5);
  const capacity=[gpu.canvas.width,gpu.canvas.height];
  const reference=new GpuSky(document.createElement('canvas'),true);reference.setScene(skyLab.scene().stars,texture);
  const check=document.createElement('canvas');check.width=144;check.height=192;const ctx=check.getContext('2d',{willReadFrequently:true});ctx.setTransform(1.5,0,0,1.5,0,0);
  reference.drawMilkyWay(ctx,96,128,1.5,{heading:180,pitch:31},1,false,1,skyLab.scene().basis,skyLab.scene().key);
  reference.drawStars(ctx,96,128,1.5,{heading:180,pitch:31},1,0,1);
  const fresh=ctx.getImageData(0,0,144,192).data;
  const retainedMatchesFresh=firstMotion.every((value,i)=>value===fresh[i]);reference.dispose();
  const warm={...counts};
  let equal=true;
  for(let i=0;i<8;i++){
   // Force both changed and unchanged Milky Way poses, then compare warmed coverage.
   paint(i%2?1.5:2,182+i);
   const image=paint(i%2?1.5:2),expected=i%2?firstMotion:firstFull;
   equal &&= image.length===expected.length && image.every((v,j)=>v===expected[j]);
  }
  const reused={...counts};
  paint(1.25); // Evict the least recently used atlas, never grow past two.
  paint(1.5);
  const afterThird={...counts};
  paint(2,180,128,96); // A genuine aspect/raster-size change needs a new FBO check.
  const resized={...counts};
  let fractionalMaxDifference=0;
  for(const ratio of [1.25,1.5]){
   paint(2,60,96.25,128.5);const retained=paint(ratio,210,96.25,128.5);
   const freshGpu=new GpuSky(document.createElement('canvas'),true);freshGpu.setScene(skyLab.scene().stars,texture);
   const c=document.createElement('canvas');c.width=Math.round(96.25*ratio);c.height=Math.round(128.5*ratio);const ctx=c.getContext('2d',{willReadFrequently:true});ctx.setTransform(ratio,0,0,ratio,0,0);
   freshGpu.drawMilkyWay(ctx,96.25,128.5,ratio,{heading:210,pitch:31},1,false,1,skyLab.scene().basis,skyLab.scene().key);
   freshGpu.drawStars(ctx,96.25,128.5,ratio,{heading:210,pitch:31},1,0,1);
   const freshPixels=ctx.getImageData(0,0,c.width,c.height).data;
   for(let i=0;i<retained.length;i++)fractionalMaxDifference=Math.max(fractionalMaxDifference,Math.abs(retained[i]-freshPixels[i]));
   freshGpu.dispose();
  }
  const glError=gl.getError();
  gpu.dispose();
  const allNewTexturesDeleted=[...created].every(t=>deleted.has(t));
  return {warm,reused,afterThird,resized,equal,capacity,retainedMatchesFresh,fractionalMaxDifference,glError,liveAfterDispose:tracked.size,allNewTexturesDeleted};
 });
 assert.deepEqual(result.capacity,[192,256]);assert.equal(result.retainedMatchesFresh,true,'retained-buffer crop matches a fresh exact-density renderer');
 assert.equal(result.warm.resizes,2);assert.equal(result.reused.resizes,2,'DPR alternation does not resize the backing store');assert.equal(result.afterThird.resizes,2);assert.equal(result.resized.resizes,4,'real CSS resize replaces capacity');
 assert.equal(result.fractionalMaxDifference,0,'fractional CSS size and low densities preserve fresh-renderer coverage');
 assert.equal(result.glError,0);assert.equal(result.equal,true,'cached DPR coverage must match the first draw exactly');
 assert.equal(result.warm.atlasUploads,2);assert.equal(result.reused.atlasUploads,2,'DPR alternation must not upload warmed atlases');
 assert.equal(result.warm.attachments,1);assert.equal(result.reused.attachments,1,'pose and DPR changes retain raster attachment');
 assert.equal(result.reused.statusChecks,1);assert.equal(result.afterThird.atlasUploads,3,'third density creates only its atlas');
 assert.equal(result.afterThird.maxTextures,2,'two resident atlas textures maximum');
 assert.equal(result.resized.attachments,2);assert.equal(result.resized.statusChecks,2,'changed raster storage is checked');
 assert.equal(result.liveAfterDispose,0);assert.equal(result.allNewTexturesDeleted,true);assert.deepEqual(errors,[]);
 console.log('PASS real WebGL atlas reuse, exact warmed coverage, bounded eviction, raster recheck and disposal',JSON.stringify(result));
} finally {await browser.close();}
