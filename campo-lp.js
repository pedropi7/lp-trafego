/* Campo de isolinhas do herói — TINTA sobre papel. WebGL2, zero biblioteca.
 * Adaptação do campo do laboratório (aprovado pelo Pedro) para superfície clara:
 * linhas grafite desenhadas como tinta, sonda que ESCURECE sob o cursor (nada de
 * lima em fundo claro — 1,17:1, proibido no DESIGN.md). Reage à velocidade do
 * gesto com inércia. Mobile: um quadro estático. reduced-motion: idem. */
(() => {
  'use strict';

  const host  = document.getElementById('hero');
  const cv    = host && host.querySelector('.hero__campo');
  const bloco = document.getElementById('hero-bloco');
  if (!cv) return;

  const gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) { cv.remove(); return; }

  const VS = `#version 300 es
in vec2 aPos; void main(){ gl_Position = vec4(aPos,0.,1.); }`;

  const FS = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform vec2 uDir;
uniform float uMotion; uniform vec4 uBloco; uniform float uDpr;

const vec3 PAPEL = vec3(0.9451, 0.9569, 0.9608);   // #F1F4F5
const vec3 TINTA = vec3(0.0588, 0.0706, 0.0784);   // #0F1214
const float FORCA = 0.30, FORCA_BLOCO = 0.09, SONDA = 0.45;

// hash sem seno: sin() com argumento grande quebra em GPU real (licao do lab)
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx)*0.1031); q += dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float a=.5,s=0.; mat2 R=mat2(.8,.6,-.6,.8);
  for(int i=0;i<4;i++){ s+=a*vnoise(p); p=R*p*2.03; a*=.5; } return s; }
float bayer2(vec2 a){ a=floor(a); return fract(a.x*.5+a.y*a.y*.75); }
#define bayer4(a) (bayer2(.5*(a))*.25+bayer2(a))
#define bayer8(a) (bayer4(.5*(a))*.25+bayer2(a))

vec2 puxao(vec2 uv, float asp){
  vec2 rel = uv - uMouse/uRes; rel.x *= asp;
  float d = length(rel);
  float centro = pow(1.-smoothstep(0.,.41,d),2.);
  float amort  = pow(1.-clamp(abs(rel.y)/.656,0.,1.),2.2);
  float onda   = sin(d*13.-uTime*6.158)*exp(-d*6.);
  return uv + uDir*onda*.082*centro*amort*uMotion;
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  float asp = uRes.x/uRes.y;
  vec2 uv = puxao(frag/uRes, asp);
  vec2 p  = (uv-.5)*vec2(asp,1.);
  vec2 m  = (uMouse/uRes-.5)*vec2(asp,1.);

  float t = uTime*.035;
  vec2  q = vec2(fbm(p*1.5+t), fbm(p*1.5+vec2(3.1,7.4)-t));
  float h = fbm(p*1.7+1.4*q);

  float k = h*14. - uTime*.09;
  float dist = abs(fract(k-.5)-.5);
  // espessura em PIXEL, nao em altitude (licao do lab)
  float w  = max(fwidth(k),1e-4);
  float px = dist/w;
  float nivel  = floor(k);
  float indice = 1.-step(.001,abs(mod(nivel,5.)));
  float linha  = 1.-smoothstep(.35,1.05,px);
  float grossa = 1.-smoothstep(.60,1.90,px);
  linha = max(linha, grossa*indice);
  linha *= 1.-smoothstep(.30,.62,w);          // niveis colados: apaga, nao vira mingau

  float ret = step(bayer8(floor(frag/(3.*uDpr))),.34)*.05;
  float vin = smoothstep(1.75,.35,length(p*vec2(.72,1.)));
  float campo = clamp((linha+ret)*vin,0.,1.);

  vec2 a = uBloco.xy, b = uBloco.xy+uBloco.zw, pad = vec2(56.);
  vec2 s = smoothstep(a-pad,a,frag)*(1.-smoothstep(b,b+pad,frag));
  float dentro = s.x*s.y;

  float forca = mix(FORCA, FORCA_BLOCO, dentro);
  float sonda = exp(-dot(p-m,p-m)*9.);
  forca += SONDA*sonda*uMotion*(1.-dentro);   // a tinta ADENSA sob o gesto

  fragColor = vec4(mix(PAPEL, TINTA, campo*forca), 1.);
}`;

  function compilar(tipo, src){
    const s = gl.createShader(tipo);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = compilar(gl.VERTEX_SHADER, VS), fs = compilar(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { cv.remove(); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv.remove(); return; }
  gl.useProgram(prog);

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = n => gl.getUniformLocation(prog, n);
  const uRes=U('uRes'), uTime=U('uTime'), uMouse=U('uMouse'), uDir=U('uDir'),
        uMotion=U('uMotion'), uBloco=U('uBloco'), uDpr=U('uDpr');

  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const amplo = () => innerWidth >= 1024;
  let dpr=1, largura=0, altura=0, alvoX=.5, alvoY=.5, px=.5, py=.5;
  let dirX=0, dirY=0, energia=0, raf=0, ultimo=0, visivel=false;

  function dimensionar(){
    dpr = Math.min(devicePixelRatio||1, amplo() ? 1.5 : 2);
    largura = Math.max(1, Math.round(cv.clientWidth*dpr));
    altura  = Math.max(1, Math.round(cv.clientHeight*dpr));
    cv.width = largura; cv.height = altura;
    gl.viewport(0,0,largura,altura);
    gl.uniform2f(uRes,largura,altura); gl.uniform1f(uDpr,dpr);
    medirBloco();
  }
  function medirBloco(){
    if (!bloco){ gl.uniform4f(uBloco,-1e5,-1e5,1,1); return; }
    const rb = bloco.getBoundingClientRect(), rc = cv.getBoundingClientRect();
    gl.uniform4f(uBloco,(rb.left-rc.left)*dpr,(rc.bottom-rb.bottom)*dpr,rb.width*dpr,rb.height*dpr);
  }
  addEventListener('resize', () => { dimensionar(); desenharUm(); }, { passive:true });
  addEventListener('scroll', medirBloco, { passive:true });
  if (document.fonts) document.fonts.ready.then(() => { medirBloco(); desenharUm(); });

  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const r = cv.getBoundingClientRect();
    alvoX = (e.clientX-r.left)/r.width;
    alvoY = 1-(e.clientY-r.top)/r.height;
  }, { passive:true });

  function desenharUm(t){
    gl.uniform1f(uTime, t==null ? 12 : t);
    gl.uniform2f(uMouse, px*largura, py*altura);
    gl.uniform2f(uDir, dirX, dirY);
    gl.uniform1f(uMotion, energia);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let lentos=0;
  function quadro(agora){
    raf = requestAnimationFrame(quadro);
    const dt = Math.min((agora-ultimo)/1000,.05); ultimo = agora;
    const k = 1-Math.pow(.001,dt);
    const vx = alvoX-px, vy = alvoY-py;
    px += vx*k; py += vy*k;
    const vel = Math.hypot(vx,vy)*220;
    energia = Math.max(energia*Math.pow(.86,dt*60), Math.min(vel,1));
    if (vel>.002){ const l=Math.hypot(vx,vy)||1; dirX+=(vx/l-dirX)*.25; dirY+=(vy/l-dirY)*.25; }
    desenharUm(agora*.001);
    if (dt>.02){ if (++lentos>45 && dpr>1){ dpr=1; lentos=0; dimensionar(); } } else lentos=0;
  }
  function ligar(){ if (raf||calmo||!amplo()) return; ultimo=performance.now(); raf=requestAnimationFrame(quadro); }
  function desligar(){ if (raf){ cancelAnimationFrame(raf); raf=0; } }

  dimensionar();
  window.__campo = { desenharUm, estado: () => ({dpr,largura,altura,energia}) };
  if (calmo || !amplo()){ desenharUm(12); return; }
  new IntersectionObserver(([e]) => { visivel=e.isIntersecting; visivel?ligar():desligar(); },{threshold:0}).observe(host);
  document.addEventListener('visibilitychange', () => { document.hidden?desligar():(visivel&&ligar()); });
})();
