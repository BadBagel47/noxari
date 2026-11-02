import type {MilkyWayTexture} from '../../src/milkyWay';
import type {PreparedHorizontalStar, ViewDirection} from '../../src/skyProjection';
import {stellarBrightness} from '../../src/skyVisibility';

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
const starVertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 direction;
layout(location=1) in float radius;
layout(location=2) in float brightness;
uniform vec4 pose;
uniform vec2 viewport;
uniform float focal;
uniform float dpr;
uniform vec2 visibility;
uniform bool below;
out float alpha;out float radiusPx;out float spriteSize;
void main(){
  float ch=pose.x,sh=pose.y,cp=pose.z,sp=pose.w;
  float forward=direction.x*ch+direction.y*sh;
  float depth=forward*cp+direction.z*sp;
  alpha=(direction.z<0.0?max(visibility.x,visibility.y):visibility.x)*brightness;
  radiusPx=radius*dpr;spriteSize=radiusPx*2.0+2.0;
  gl_PointSize=spriteSize;
  if(depth<=0.0||(direction.z<0.0&&!below)||alpha<=0.0){gl_Position=vec4(2.0,2.0,2.0,1.0);return;}
  float right=direction.y*ch-direction.x*sh;
  float up=direction.z*cp-forward*sp;
  gl_Position=vec4(2.0*focal*vec2(right/viewport.x,up/viewport.y)/depth,0.0,1.0);
}`;
const starFragment = `#version 300 es
precision highp float;
in float alpha;in float radiusPx;in float spriteSize;out vec4 color;
void main(){
  float distancePx=length((gl_PointCoord-0.5)*spriteSize);
  float a=alpha*clamp(radiusPx+0.5-distancePx,0.0,1.0);
  color=vec4(vec3(227.0,241.0,255.0)/255.0*a,a);
}`;

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

/** Experimental GPU-to-2D bridge, used only by the separate lab page. */
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
  private rasterWidth = 0;
  private rasterHeight = 0;
  private starCount = 0;
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
      this.sourceTexture = this.texture(true);this.rasterTexture = this.texture(false);
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

  setScene(stars: PreparedHorizontalStar[], texture: MilkyWayTexture) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.starsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, packStars(stars), gl.STATIC_DRAW);
    this.starCount = stars.length;
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texture.width, texture.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, texture.pixels);
    this.rasterKey = '';
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
    const gl = this.gl;
    gl.enable(gl.BLEND);gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.starsProgram);gl.bindVertexArray(this.starsVao);
    this.pose(this.starsProgram, view);
    gl.uniform2f(this.uniform(this.starsProgram, 'viewport'), width, height);
    gl.uniform1f(this.uniform(this.starsProgram, 'focal'), Math.max(width, height) / 2 * zoom);
    gl.uniform1f(this.uniform(this.starsProgram, 'dpr'), dpr);
    gl.uniform2f(this.uniform(this.starsProgram, 'visibility'), starVisibility, belowReveal);
    gl.uniform1i(this.uniform(this.starsProgram, 'below'), Number(belowReveal > 0));
    gl.drawArrays(gl.POINTS, 0, this.starCount);
    context.drawImage(this.canvas, 0, 0, width, height);
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
    for (const shader of this.shaders) this.gl.deleteShader(shader);
    for (const program of this.programs) this.gl.deleteProgram(program);
    for (const buffer of this.buffers) this.gl.deleteBuffer(buffer);
    for (const texture of this.textures) this.gl.deleteTexture(texture);
    for (const vao of this.arrays) this.gl.deleteVertexArray(vao);
    if (this.framebuffer) this.gl.deleteFramebuffer(this.framebuffer);
  }
}
