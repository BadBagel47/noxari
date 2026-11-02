import type {MilkyWayTexture} from './milkyWay';
import type {PreparedHorizontalStar, ViewDirection} from './skyProjection';
import {stellarBrightness} from './skyVisibility';

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
  float value=texture(skyTexture,vec2(longitude,0.5-latitude/PI)).r;
  float alpha=value*0.68;
  color=vec4(vec3(132.0,154.0,180.0)/255.0*alpha,alpha);
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
uniform vec4 pose;
uniform vec2 viewport;
uniform vec2 pixelViewport;
uniform float focal;
uniform float dpr;
uniform vec2 visibility;
uniform bool below;
flat out float spriteSize;flat out vec2 tile;flat out float alpha;
void main(){
  float ch=pose.x,sh=pose.y,cp=pose.z,sp=pose.w;
  float forward=direction.x*ch+direction.y*sh;
  float depth=forward*cp+direction.z*sp;
  alpha=(direction.z<0.0?max(visibility.x,visibility.y):visibility.x)*brightness;
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
flat in float spriteSize;flat in vec2 tile;flat in float alpha;out vec4 color;
uniform sampler2D starAtlas;
void main(){
  ivec2 pixel=ivec2(tile+8.0-spriteSize*0.5+floor(gl_PointCoord*spriteSize));
  float a=alpha*texelFetch(starAtlas,pixel,0).a;
  color=vec4(vec3(227.0,241.0,255.0)/255.0*a,a);
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

export function packStars(stars: PreparedHorizontalStar[]) {
  const packed = new Float32Array(stars.length * 5);
  stars.forEach((star, index) => packed.set([
    star.cosAltitude * star.cosAzimuth,
    star.cosAltitude * star.sinAzimuth,
    star.sinAltitude,
    star.magnitude < 0 ? 3 : star.magnitude < 2 ? 2.2 : star.magnitude < 4 ? 1.5 : .9,
    .28 + stellarBrightness(star.magnitude) * .72,
  ], index * 5));
  return packed;
}

/** Shared horizon layers. Snapshot into 2D at their existing positions in the draw order. */
export class GpuSky {
  readonly gl: WebGL2RenderingContext;
  private programs: WebGLProgram[] = [];
  private shaders: WebGLShader[] = [];
  private buffers: WebGLBuffer[] = [];
  private textures: WebGLTexture[] = [];
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
  private atlasTexture!: WebGLTexture;
  private atlasDpr = 0;
  private atlases = new Map<number, ImageData>();
  private rasterWidth = 0;
  private rasterHeight = 0;
  private starCount = 0;
  private sceneStars: PreparedHorizontalStar[] | null = null;
  private sceneTexture: MilkyWayTexture | null = null;
  private rasterKey = '';
  private disposed = false;
  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation>>();

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: false});
    if (!gl) throw new Error('WebGL 2 är inte tillgängligt.');
    this.gl = gl;
    try {
      this.mwProgram = this.program(quadVertex, milkyFragment);
      this.copyProgram = this.program(quadVertex, copyFragment);
      this.starsProgram = this.program(starVertex, starFragment);
      this.quad = this.array();
      this.starsVao = this.array();
      const buffer = gl.createBuffer();
      if (!buffer) throw new Error('GPU-buffert kunde inte skapas.');
      this.buffers.push(buffer); this.starsBuffer = buffer;
      gl.bindVertexArray(this.starsVao);gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      for (const [index, size, offset] of [[0, 3, 0], [1, 1, 12], [2, 1, 16]]) {
        gl.enableVertexAttribArray(index);gl.vertexAttribPointer(index, size, gl.FLOAT, false, 20, offset);
      }
      this.sourceTexture = this.texture(true);this.rasterTexture = this.texture(false);this.atlasTexture = this.texture(false);
      this.framebuffer = gl.createFramebuffer();
      if (!this.framebuffer) throw new Error('GPU-raster kunde inte skapas.');
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.DITHER);
      gl.clearColor(0, 0, 0, 0);
    } catch (error) { this.dispose(); throw error; }
  }

  get available() { return !this.disposed && !this.gl.isContextLost(); }

  info() {
    const extension = this.gl.getExtension('WEBGL_debug_renderer_info');
    return {
      version: this.gl.getParameter(this.gl.VERSION),
      renderer: this.gl.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? this.gl.RENDERER),
      pointRange: Array.from(this.gl.getParameter(this.gl.ALIASED_POINT_SIZE_RANGE) as Float32Array),
    };
  }

  setScene(stars: PreparedHorizontalStar[], texture: MilkyWayTexture | null) {
    const gl = this.gl;
    if (stars !== this.sceneStars) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.starsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, packStars(stars), gl.STATIC_DRAW);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('GPU-stjärnbufferten kunde inte laddas.');
      this.starCount = stars.length;
      this.sceneStars = stars;
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
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, w, h);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  drawMilkyWay(context: CanvasRenderingContext2D, width: number, height: number, dpr: number, view: ViewDirection, visibility: number, below: boolean, zoom: number, basis: Float32Array, sceneKey: string) {
    if (visibility <= 0) return;
    const gl = this.gl;
    const scale = Math.max(width, height) / 240;
    const cols = Math.max(1, Math.round(width / scale)), rows = Math.max(1, Math.round(height / scale));
    const key = [sceneKey, width, height, view.heading, view.pitch, below].join('|');
    if (this.rasterKey !== key) {
      gl.bindTexture(gl.TEXTURE_2D, this.rasterTexture);
      if (cols !== this.rasterWidth || rows !== this.rasterHeight) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cols, rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        this.rasterWidth = cols; this.rasterHeight = rows;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.rasterTexture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('GPU-framebuffer ofullständig.');
      gl.viewport(0, 0, cols, rows);gl.disable(gl.BLEND);
      gl.useProgram(this.mwProgram);gl.bindVertexArray(this.quad);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
      gl.uniform1i(this.uniform(this.mwProgram, 'skyTexture'), 0);
      gl.uniform2f(this.uniform(this.mwProgram, 'rasterSize'), cols, rows);
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
    context.drawImage(this.canvas, 0, 0, width, height);
  }

  drawStars(context: CanvasRenderingContext2D, width: number, height: number, dpr: number, view: ViewDirection, starVisibility: number, belowReveal: number, zoom: number) {
    this.surface(width, height, dpr);
    if (this.atlasDpr !== dpr) {
      let image = this.atlases.get(dpr);
      if (!image) {
        image = starCoverageAtlas(dpr);
        if (this.atlases.size === 2) this.atlases.delete(this.atlases.keys().next().value!);
        this.atlases.set(dpr, image);
      }
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.atlasTexture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, image.width, image.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image.data);
      if (this.gl.getError() !== this.gl.NO_ERROR) throw new Error('GPU-stjärnbilderna kunde inte laddas.');
      this.atlasDpr = dpr;
    }
    const gl = this.gl;
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.starsProgram);gl.bindVertexArray(this.starsVao);
    this.pose(this.starsProgram, view);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
    gl.uniform1i(this.uniform(this.starsProgram, 'starAtlas'), 0);
    gl.uniform2f(this.uniform(this.starsProgram, 'pixelViewport'), this.canvas.width, this.canvas.height);
    gl.uniform2f(this.uniform(this.starsProgram, 'viewport'), width, height);
    gl.uniform1f(this.uniform(this.starsProgram, 'focal'), Math.max(width, height) / 2 * zoom);
    gl.uniform1f(this.uniform(this.starsProgram, 'dpr'), dpr);
    gl.uniform2f(this.uniform(this.starsProgram, 'visibility'), starVisibility, belowReveal);
    gl.uniform1i(this.uniform(this.starsProgram, 'below'), Number(belowReveal > 0));
    gl.drawArrays(gl.POINTS, 0, this.starCount);
    context.drawImage(this.canvas, 0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
  }

  private array() {
    const vao = this.gl.createVertexArray();if (!vao) throw new Error('GPU-VAO saknas.');
    this.arrays.push(vao);return vao;
  }

  private texture(repeat: boolean) {
    const gl = this.gl, texture = gl.createTexture();if (!texture) throw new Error('GPU-textur saknas.');
    this.textures.push(texture);gl.bindTexture(gl.TEXTURE_2D, texture);
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
