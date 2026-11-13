import type {MilkyWayTexture} from './milkyWay';
import type {PreparedHorizontalStar, ViewDirection} from './skyProjection';
import {starRadius, stellarBrightness} from './skyVisibility';
import {faintCount, type FaintSky} from './binocularStars';
import {MILKY_WAY_COLOR_STRENGTH, MILKY_WAY_RASTER} from './milkyWay';
import {faintStarBrightness} from './skyLevel';
import type {PerformanceFrame} from './skyPerformance';

const quadVertex = `#version 300 es
precision highp float;
out vec2 uv;
void main(){
  vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
  uv=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);
}`;
const milkyFragment = `#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
uniform sampler2D skyTexture;
uniform mat3 horizontalToEquatorial;
uniform vec2 rasterSize;
uniform vec4 pose;
uniform bool below;
uniform bool colorTexture;
uniform float colorStrength;
const float PI=3.141592653589793;
void main(){
  vec2 ray=(uv-0.5)*rasterSize/(max(rasterSize.x,rasterSize.y)*0.5);
  float ch=pose.x,sh=pose.y,cp=pose.z,sp=pose.w;
  vec3 hor=vec3(cp*ch-ray.x*sh-ray.y*sp*ch,
              -cp*sh-ray.x*ch+ray.y*sp*sh,sp+ray.y*cp);
  if(hor.z<0.0&&!below){color=vec4(0.0);return;}
  vec3 eq=horizontalToEquatorial*hor;
  float longitude=atan(eq.y,eq.x)/(2.0*PI);
  float latitude=atan(eq.z,length(eq.xy));
  vec4 texel=texture(skyTexture,vec2(longitude,0.5-latitude/PI));
  // F-056: colour texture keeps brightness in A and colour in RGB; the grey grid keeps the old tint.
  float alpha=colorTexture?texel.a*colorStrength:texel.r*0.68;
  vec3 tint=colorTexture?texel.rgb:vec3(132.0,154.0,180.0)/255.0;
  color=vec4(tint*alpha,alpha);
}`;
const copyFragment = `#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
uniform sampler2D image;
uniform float zoom;
uniform float visibility;
void main(){color=texture(image,(uv-0.5)/zoom+0.5)*visibility;}
`;
// Reuse Canvas circle coverage in a small phase atlas: four radii, 16×16 subpixel phases.
// This preserves the existing tiny-star brightness without per-frame arc/fill calls.
const PHASES = 16, TILE = 16;
const starVertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 direction;
layout(location=1) in float radius;
layout(location=2) in float brightness;
layout(location=3) in float magnitude;
layout(location=4) in float colorIndex;
uniform vec4 pose;
uniform vec2 viewport;
uniform vec2 pixelViewport;
uniform float focal;
uniform float dpr;
uniform vec2 visibility;
uniform bool below;
uniform float magnitudeLimit;
uniform float faintDim;
flat out float spriteSize;flat out vec2 tile;flat out float alpha;flat out vec3 tint;
// F-049: same B–V colour ramp as src/starColor.ts.
vec3 ramp(float ci){
  vec3 c=vec3(155.,178.,255.);
  c=mix(c,vec3(196.,212.,255.),clamp((ci+.33)/.33,0.,1.));
  c=mix(c,vec3(236.,240.,255.),clamp(ci/.3,0.,1.));
  c=mix(c,vec3(255.,247.,236.),clamp((ci-.3)/.28,0.,1.));
  c=mix(c,vec3(255.,234.,206.),clamp((ci-.58)/.23,0.,1.));
  c=mix(c,vec3(255.,216.,172.),clamp((ci-.81)/.34,0.,1.));
  c=mix(c,vec3(255.,190.,136.),clamp((ci-1.15)/.45,0.,1.));
  c=mix(c,vec3(255.,168.,112.),clamp((ci-1.6)/.4,0.,1.));
  return c/255.;
}
void main(){
  tint=ramp(colorIndex);
  float ch=pose.x,sh=pose.y,cp=pose.z,sp=pose.w;
  float forward=direction.x*ch+direction.y*sh;
  float depth=forward*cp+direction.z*sp;
  alpha=(direction.z<0.0?max(visibility.x,visibility.y):visibility.x)*brightness;
  // F-049: stars dim a little close to the horizon (atmospheric extinction look); sin(15°)≈0.259.
  if(direction.z>=0.0)alpha*=0.55+0.45*clamp(direction.z/0.259,0.0,1.0);
  // F-043: stars fainter than V 6.5 fade in as the zoom-dependent limit passes them.
  if(magnitude>6.5)alpha*=(magnitude>magnitudeLimit?0.0:clamp((magnitudeLimit-magnitude)/0.4+0.25,0.0,1.0))*faintDim;
  spriteSize=ceil(radius*dpr+1.0)*2.0;gl_PointSize=spriteSize;tile=vec2(0.0);
  if(depth<=0.0||(direction.z<0.0&&!below)||alpha<=0.0){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  float right=direction.y*ch-direction.x*sh;
  float up=direction.z*cp-forward*sp;
  vec2 point=viewport*0.5+focal*vec2(right,-up)/depth;
  if(any(lessThan(point,vec2(0.0)))||any(greaterThan(point,viewport))){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  vec2 center=point*dpr;
  vec2 snapped=floor(center*16.0+0.5);
  vec2 phase=mod(snapped,16.0);
  float tier=radius<1.0?0.0:radius<2.0?1.0:radius<2.5?2.0:3.0;
  tile=vec2(phase.x,phase.y+tier*16.0)*16.0;
  vec2 pixel=floor(snapped/16.0);
  gl_Position=vec4(vec2(2.0,-2.0)*pixel/pixelViewport+vec2(-1.0,1.0),0.0,1.0);
}`;
const starFragment = `#version 300 es
precision highp float;
flat in float spriteSize;flat in vec2 tile;flat in float alpha;flat in vec3 tint;out vec4 color;
uniform sampler2D starAtlas;
void main(){
  ivec2 pixel=ivec2(tile+8.0-spriteSize*0.5+floor(gl_PointCoord*spriteSize));
  float a=alpha*texelFetch(starAtlas,pixel,0).a;
  color=vec4(tint*a,a);
}`;

export function starCoverageAtlas(dpr: number) {
  const canvas = document.createElement('canvas');
  canvas.width = PHASES * TILE; canvas.height = 4 * PHASES * TILE;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff';
  for (const [tier, radius] of [.9, 1.5, 2.2, 3].entries()) {
    for (let y = 0; y < PHASES; y++) for (let x = 0; x < PHASES; x++) {
      context.beginPath();
      context.arc(x * TILE + TILE / 2 + x / PHASES, (tier * PHASES + y) * TILE + TILE / 2 + y / PHASES, radius * dpr, 0, Math.PI * 2);
      context.fill();
    }
  }
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

const STRIDE = 7;
export function packStars(stars: PreparedHorizontalStar[], faint: FaintSky | null = null) {
  const packed = new Float32Array((stars.length + (faint?.count ?? 0)) * STRIDE);
  stars.forEach((star, index) => packed.set([
    star.cosAltitude * star.cosAzimuth,
    star.cosAltitude * star.sinAzimuth,
    star.sinAltitude,
    starRadius(star.magnitude),
    .28 + stellarBrightness(star.magnitude) * .72,
    // The bright subset is always drawn in full; only F-043 faint stars carry a real fade magnitude.
    Math.min(6.5, star.magnitude),
    star.ci ?? .45,
  ], index * STRIDE));
  if (faint) for (let i = 0, offset = stars.length * STRIDE; i < faint.count; i++, offset += STRIDE) {
    packed[offset] = faint.direction[i * 3];packed[offset + 1] = faint.direction[i * 3 + 1];packed[offset + 2] = faint.direction[i * 3 + 2];
    packed[offset + 3] = .8;packed[offset + 4] = faintStarBrightness(faint.magnitude[i]);packed[offset + 5] = faint.magnitude[i];packed[offset + 6] = faint.ci ? faint.ci[i] : .45;
  }
  return packed;
}

/** Shared horizon layers. Snapshot into 2D at their existing positions in the draw order. */
export class GpuSky {
  measurement: PerformanceFrame | null = null;
  readonly gl: WebGL2RenderingContext;
  private programs: WebGLProgram[] = [];
  private shaders: WebGLShader[] = [];
  private buffers: WebGLBuffer[] = [];
  private textures = new Set<WebGLTexture>();
  private arrays: WebGLVertexArrayObject[] = [];
  private framebuffer: WebGLFramebuffer | null = null;
  private mwProgram!: WebGLProgram;
  private copyProgram!: WebGLProgram;
  private starsProgram!: WebGLProgram;
  private quad!: WebGLVertexArrayObject;
  private starsVao!: WebGLVertexArrayObject;
  private starsBuffer!: WebGLBuffer;
  private sourceTexture!: WebGLTexture;
  private rasterTexture!: WebGLTexture;
  private atlases = new Map<number, WebGLTexture>();
  private retainSurface = true;
  private surfaceWidth = 0;
  private surfaceHeight = 0;
  private surfaceDpr = 0;
  private pixelWidth = 1;
  private pixelHeight = 1;
  private rasterWidth = 0;
  private rasterHeight = 0;
  private starCount = 0;
  private sceneStars: PreparedHorizontalStar[] | null = null;
  private sceneFaint: FaintSky | null = null;
  private sceneTexture: MilkyWayTexture | null = null;
  private rasterKey = '';
  private disposed = false;
  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation>>();

  constructor(readonly canvas: HTMLCanvasElement, retainSurface?: boolean) {
    const gl = canvas.getContext('webgl2', {alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false});
    if (!gl) throw new Error('WebGL 2 är inte tillgängligt.');
    this.gl = gl;
    try {
      this.retainSurface = retainSurface ?? !/swiftshader|llvmpipe|software rasterizer/i.test(this.info().renderer);
      this.mwProgram = this.program(quadVertex, milkyFragment);
      this.copyProgram = this.program(quadVertex, copyFragment);
      this.starsProgram = this.program(starVertex, starFragment);
      this.quad = this.array();
      this.starsVao = this.array();
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error('GPU-buffert kunde inte skapas.');
      this.buffers.push(buffer); this.starsBuffer = buffer;
      gl.bindVertexArray(this.starsVao);gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      for (const [index, size, offset] of [[0, 3, 0], [1, 1, 12], [2, 1, 16], [3, 1, 20], [4, 1, 24]]) {
        gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index, size, gl.FLOAT, false, STRIDE * 4, offset);
      }
      this.sourceTexture = this.texture(true);this.rasterTexture = this.texture(false);
      this.framebuffer = gl.createFramebuffer();
      if (!this.framebuffer) throw new Error('GPU-raster kunde inte skapas.');
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.DITHER);
      gl.clearColor(0, 0, 0, 0);
    } catch (error) { this.dispose(); throw error; }
  }

  get surfacePolicy() { return this.retainSurface ? 'retained' as const : 'exact' as const; }

  get available() { return !this.disposed && !this.gl.isContextLost(); }

  info() {
    const extension = this.gl.getExtension('WEBGL_debug_renderer_info');
    return {
      version: this.gl.getParameter(this.gl.VERSION),
      renderer: this.gl.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? this.gl.RENDERER),
      pointRange: Array.from(this.gl.getParameter(this.gl.ALIASED_POINT_SIZE_RANGE) as Float32Array),
    };
  }

  setScene(stars: PreparedHorizontalStar[], texture: MilkyWayTexture | null, faint: FaintSky | null = null) {
    const gl = this.gl;
    if (stars !== this.sceneStars || faint !== this.sceneFaint) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.starsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, packStars(stars, faint), gl.STATIC_DRAW);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('GPU-stjärnbufferten kunde inte laddas.');
      this.starCount = stars.length;
      this.sceneStars = stars;
      this.sceneFaint = faint;
    }
    if (texture && texture !== this.sceneTexture) {
      gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texture.width, texture.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, texture.pixels);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('GPU-himmelstexturen kunde inte laddas.');
      this.rasterKey = '';
    }
    this.sceneTexture = texture;
  }

  private uniform(program: WebGLProgram, name: string) {
    let entries = this.uniforms.get(program);
    if (!entries) { entries = new Map(); this.uniforms.set(program, entries); }
    let location = entries.get(name);
    if (!location) {
      const found = this.gl.getUniformLocation(program, name);
      if (!found) throw new Error(`GPU-uniform saknas: ${name}`);
      location = found; entries.set(name, found);
    }
    return location;
  }

  private pose(program: WebGLProgram, view: ViewDirection) {
    const heading = view.heading * Math.PI / 180, pitch = view.pitch * Math.PI / 180;
    this.gl.uniform4f(this.uniform(program, 'pose'), Math.cos(heading), Math.sin(heading), Math.cos(pitch), Math.sin(pitch));
  }

  private surface(width: number, height: number, dpr: number) {
    const w = Math.max(1, Math.round(width * dpr)), h = Math.max(1, Math.round(height * dpr));
    // Keep one backing store at the highest requested density for this CSS
    // viewport. Motion/rest transitions only change its active lower-left area.
    if (!this.retainSurface || width !== this.surfaceWidth || height !== this.surfaceHeight) this.surfaceDpr = dpr;
    else this.surfaceDpr = Math.max(this.surfaceDpr, dpr);
    this.surfaceWidth = width; this.surfaceHeight = height;
    const capacityWidth = Math.max(1, Math.round(width * this.surfaceDpr));
    const capacityHeight = Math.max(1, Math.round(height * this.surfaceDpr));
    if (this.canvas.width !== capacityWidth) this.canvas.width = capacityWidth;
    if (this.canvas.height !== capacityHeight) this.canvas.height = capacityHeight;
    this.pixelWidth = w; this.pixelHeight = h;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);
  }

  drawMilkyWay(context: CanvasRenderingContext2D, width: number, height: number, dpr: number, view: ViewDirection, visibility: number, below: boolean, zoom: number, basis: Float32Array, sceneKey: string) {
    if (visibility <= 0) return;
    const gl = this.gl;
    const scale = Math.max(width, height) / MILKY_WAY_RASTER;
    const cols = Math.max(1, Math.round(width / scale)), rows = Math.max(1, Math.round(height / scale));
    const key = [sceneKey, width, height, view.heading, view.pitch, below].join('|');
    if (this.rasterKey !== key) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.bindTexture(gl.TEXTURE_2D, this.rasterTexture);
      if (cols !== this.rasterWidth || rows !== this.rasterHeight) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        // The attachment survives camera/DPR changes and drawing-buffer resizes.
        // Check completeness when its storage changes, not on every new pose.
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.rasterTexture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('GPU-framebuffer ofullständig.');
        this.rasterWidth = cols; this.rasterHeight = rows;
      }
      gl.viewport(0, 0, cols, rows);gl.disable(gl.BLEND);
      gl.useProgram(this.mwProgram);gl.bindVertexArray(this.quad);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
      gl.uniform1i(this.uniform(this.mwProgram, 'skyTexture'), 0);
      gl.uniform2f(this.uniform(this.mwProgram, 'rasterSize'), cols, rows);
      gl.uniform1i(this.uniform(this.mwProgram, 'colorTexture'), Number(Boolean(this.sceneTexture?.color)));gl.uniform1f(this.uniform(this.mwProgram, 'colorStrength'), MILKY_WAY_COLOR_STRENGTH);
      gl.uniformMatrix3fv(this.uniform(this.mwProgram, 'horizontalToEquatorial'), false, basis);
      gl.uniform1i(this.uniform(this.mwProgram, 'below'), Number(below));this.pose(this.mwProgram, view);
      gl.drawArrays(gl.TRIANGLES, 0, 3);this.rasterKey = key;
    }
    this.surface(width, height, dpr);
    gl.disable(gl.BLEND);gl.useProgram(this.copyProgram);gl.bindVertexArray(this.quad);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D, this.rasterTexture);
    gl.uniform1i(this.uniform(this.copyProgram, 'image'), 0);
    gl.uniform1f(this.uniform(this.copyProgram, 'zoom'), zoom);
    gl.uniform1f(this.uniform(this.copyProgram, 'visibility'), visibility);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.copy(context, this.pixelWidth / dpr, this.pixelHeight / dpr);
  }

  drawStars(context: CanvasRenderingContext2D, width: number, height: number, dpr: number, view: ViewDirection, starVisibility: number, belowReveal: number, zoom: number, magnitudeLimit = 6.5, faintDim = 1) {
    this.surface(width, height, dpr);
    const atlas = this.starAtlas(dpr);
    const gl = this.gl;
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.starsProgram);gl.bindVertexArray(this.starsVao);
    this.pose(this.starsProgram, view);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.uniform1i(this.uniform(this.starsProgram, 'starAtlas'), 0);
    gl.uniform2f(this.uniform(this.starsProgram, 'pixelViewport'), this.pixelWidth, this.pixelHeight);
    gl.uniform2f(this.uniform(this.starsProgram, 'viewport'), width, height);
    gl.uniform1f(this.uniform(this.starsProgram, 'focal'), Math.max(width, height) / 2 * zoom);
    gl.uniform1f(this.uniform(this.starsProgram, 'dpr'), dpr);
    gl.uniform2f(this.uniform(this.starsProgram, 'visibility'), starVisibility, belowReveal);
    gl.uniform1i(this.uniform(this.starsProgram, 'below'), Number(belowReveal > 0));
    gl.uniform1f(this.uniform(this.starsProgram, 'magnitudeLimit'), magnitudeLimit);
    // F-062: faint stars step back where the DSS images (which show their own stars) take over.
    gl.uniform1f(this.uniform(this.starsProgram, 'faintDim'), faintDim);
    // Faint stars are sorted by magnitude, so only the prefix up to the limit is submitted.
    gl.drawArrays(gl.POINTS, 0, this.starCount + (magnitudeLimit > 6.5 && this.sceneFaint ? faintCount(this.sceneFaint.magnitude, magnitudeLimit) : 0));
    this.copy(context, this.pixelWidth / dpr, this.pixelHeight / dpr);
  }

  private starAtlas(dpr: number) {
    let atlas = this.atlases.get(dpr);
    if (atlas) {
      // Keep the two most recently used densities (normally full and moving).
      this.atlases.delete(dpr);this.atlases.set(dpr, atlas);
      return atlas;
    }
    const gl = this.gl;
    if (this.atlases.size === 2) {
      const [oldDpr, oldAtlas] = this.atlases.entries().next().value!;
      this.atlases.delete(oldDpr);this.textures.delete(oldAtlas);gl.deleteTexture(oldAtlas);
    }
    atlas = this.texture(false);
    const image = starCoverageAtlas(dpr);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
    if (gl.getError() !== gl.NO_ERROR) throw new Error('GPU-stjärnbilderna kunde inte laddas.');
    // The CPU image is transient; both density textures remain resident on GPU.
    this.atlases.set(dpr, atlas);
    return atlas;
  }

  private copy(context: CanvasRenderingContext2D, width: number, height: number) {
    const frame = this.measurement, started = frame?.clock();
    // WebGL's active viewport is bottom-left; Canvas crop coordinates are top-left.
    context.drawImage(this.canvas, 0, this.canvas.height - this.pixelHeight, this.pixelWidth, this.pixelHeight, 0, 0, width, height);
    if (frame && started !== undefined) { frame.copyMs += frame.clock() - started;frame.copyCalls++; }
  }

  private array() {
    const vao = this.gl.createVertexArray();if (!vao) throw new Error('GPU-VAO saknas.');
    this.arrays.push(vao);return vao;
  }

  private texture(repeat: boolean) {
    const gl = this.gl, texture = gl.createTexture();if (!texture) throw new Error('GPU-textur saknas.');
    this.textures.add(texture);gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  private program(vertex: string, fragment: string) {
    const gl = this.gl, program = gl.createProgram();if (!program) throw new Error('GPU-program saknas.');
    this.programs.push(program);
    for (const [kind, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]] as const) {
      const shader = gl.createShader(kind);if (!shader) throw new Error('GPU-shader saknas.');
      this.shaders.push(shader);gl.shaderSource(shader, source);gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'GPU-kompilering misslyckades.');
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'GPU-länkning misslyckades.');
    return program;
  }

  dispose() {
    this.disposed = true;
    this.atlases.clear();
    for (const shader of this.shaders) this.gl.deleteShader(shader);
    for (const program of this.programs) this.gl.deleteProgram(program);
    for (const buffer of this.buffers) this.gl.deleteBuffer(buffer);
    for (const texture of this.textures) this.gl.deleteTexture(texture);
    for (const vao of this.arrays) this.gl.deleteVertexArray(vao);
    if (this.framebuffer) this.gl.deleteFramebuffer(this.framebuffer);
  }
}
