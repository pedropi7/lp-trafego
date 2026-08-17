/* Campo de isolinhas — agora em DUAS instâncias: tinta sobre papel no herói e
 * papel sobre tinta no clímax escuro. O dinamismo que abria a página passa a
 * fechá-la também — a assinatura vira moldura, não introdução (queixa do Pedro:
 * "os elementos somem depois do começo"). Cores e força viraram uniforms.
 * D11 respeitada: o campo só toca fundo abstrato, nunca conteúdo figurativo. */
(() => {
  'use strict';

  const VS = `#version 300 es
in vec2 aPos; void main(){ gl_Position = vec4(aPos,0.,1.); }`;

  const FS = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform vec2 uDir;
uniform float uMotion; uniform vec4 uBloco; uniform float uDpr;
uniform vec3 uFundo; uniform vec3 uLinha; uniform vec2 uForca; // x: base, y: no bloco

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
  float w  = max(fwidth(k),1e-4);
  float px = dist/w;                                  // espessura em pixel
  float nivel  = floor(k);
  float indice = 1.-step(.001,abs(mod(nivel,5.)));
  float linha  = 1.-smoothstep(.35,1.05,px);
  float grossa = 1.-smoothstep(.60,1.90,px);
  linha = max(linha, grossa*indice);
  linha *= 1.-smoothstep(.30,.62,w);

  float ret = step(bayer8(floor(frag/(3.*uDpr))),.34)*.05;
  float vin = smoothstep(1.75,.35,length(p*vec2(.72,1.)));
  float campo = clamp((linha+ret)*vin,0.,1.);

  vec2 a = uBloco.xy, b = uBloco.xy+uBloco.zw, pad = vec2(56.);
  vec2 s = smoothstep(a-pad,a,frag)*(1.-smoothstep(b,b+pad,frag));
  float dentro = s.x*s.y;

  float forca = mix(uForca.x, uForca.y, dentro);
  float sonda = exp(-dot(p-m,p-m)*9.);
  forca += .45*sonda*uMotion*(1.-dentro);

  fragColor = vec4(mix(uFundo, uLinha, campo*forca), 1.);
}`;

  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const amplo = () => innerWidth >= 1024;

  function montar(cfg){
    const host  = document.querySelector(cfg.host);
    const cv    = host && host.querySelector('canvas.campo');
    const bloco = cfg.bloco ? document.querySelector(cfg.bloco) : null;
    if (!cv) return;
    const gl = cv.getContext('webgl2', { alpha:false, antialias:false, depth:false, stencil:false, powerPreference:'low-power' });
    if (!gl) { cv.remove(); return; }

    const mk = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    const vs = mk(gl.VERTEX_SHADER, VS), fs = mk(gl.FRAGMENT_SHADER, FS);
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
    gl.uniform3fv(U('uFundo'), cfg.fundo);
    gl.uniform3fv(U('uLinha'), cfg.linha);
    gl.uniform2fv(U('uForca'), cfg.forca);
    const uRes=U('uRes'), uTime=U('uTime'), uMouse=U('uMouse'), uDir=U('uDir'),
          uMotion=U('uMotion'), uBloco=U('uBloco'), uDpr=U('uDpr');

    let dpr=1, teto=1.5, W=0, H=0, alvoX=.5, alvoY=.5, px=.5, py=.5;
    let dirX=0, dirY=0, energia=0, raf=0, ultimo=0, visivel=false, lentos=0;

    function dimensionar(){
      // O CELULAR renderizava em resolucao MAIOR que o desktop (2 contra 1,5) —
      // passava despercebido enquanto o quadro era estatico.
      dpr = Math.min(devicePixelRatio||1, teto);
      const nW = Math.max(1, Math.round(cv.clientWidth*dpr));
      const nH = Math.max(1, Math.round(cv.clientHeight*dpr));
      // No iOS a barra do Safari recolhendo dispara resize NO MEIO DA ROLAGEM.
      // Sem esta guarda, cada evento realoca o framebuffer dos DOIS canvas e
      // redesenha o shader inteiro. Navegador de desktop nao dispara resize ao
      // rolar — por isso era invisivel em toda verificacao que eu fiz.
      // Compara a MEDIDA DO ELEMENTO, nao innerWidth: rotacao ainda redesenha.
      if (nW === W && nH === H) return;
      W = nW; H = nH;
      cv.width = W; cv.height = H;
      gl.viewport(0,0,W,H);
      gl.uniform2f(uRes,W,H); gl.uniform1f(uDpr,dpr);
      medirBloco();
    }
    function medirBloco(){
      if (!bloco){ gl.uniform4f(uBloco,-1e5,-1e5,1,1); return; }
      const rb = bloco.getBoundingClientRect(), rc = cv.getBoundingClientRect();
      gl.uniform4f(uBloco,(rb.left-rc.left)*dpr,(rc.bottom-rb.bottom)*dpr,rb.width*dpr,rb.height*dpr);
    }
    addEventListener('resize', () => { dimensionar(); desenharUm(); }, { passive:true });
    // so escuta scroll quem vai de fato redesenhar: no celular o campo desenha
    // UM quadro, entao medir o bloco a cada evento alimentava um uniform morto
    if (!calmo && amplo()) addEventListener('scroll', medirBloco, { passive:true });
    if (document.fonts) document.fonts.ready.then(() => { medirBloco(); desenharUm(); });
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const r = cv.getBoundingClientRect();
      alvoX = (e.clientX-r.left)/r.width;
      alvoY = 1-(e.clientY-r.top)/r.height;
    }, { passive:true });

    function desenharUm(t){
      gl.uniform1f(uTime, t==null ? cfg.fase : t);
      gl.uniform2f(uMouse, px*W, py*H);
      gl.uniform2f(uDir, dirX, dirY);
      gl.uniform1f(uMotion, energia);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function quadro(agora){
      raf = requestAnimationFrame(quadro);
      const dt = Math.min((agora-ultimo)/1000,.05); ultimo = agora;
      const k = 1-Math.pow(.001,dt);
      const vx = alvoX-px, vy = alvoY-py;
      px += vx*k; py += vy*k;
      const vel = Math.hypot(vx,vy)*220;
      energia = Math.max(energia*Math.pow(.86,dt*60), Math.min(vel,1));
      if (vel>.002){ const l=Math.hypot(vx,vy)||1; dirX+=(vx/l-dirX)*.25; dirY+=(vy/l-dirY)*.25; }
      desenharUm(agora*.001 + cfg.fase);
      // A degradacao era LETRA MORTA: baixava dpr e dimensionar() o recalculava
      // na linha seguinte. Agora baixa o TETO, que e o que dimensionar() respeita.
      if (dt>.02){ if (++lentos>45 && teto>1){ teto=1; lentos=0; dimensionar(); desenharUm(agora*.001+cfg.fase); } } else lentos=0;
    }
    const ligar = () => { if (raf||calmo||!amplo()) return; ultimo=performance.now(); raf=requestAnimationFrame(quadro); };
    const desligar = () => { if (raf){ cancelAnimationFrame(raf); raf=0; } };

    dimensionar();
    if (calmo || !amplo()){ desenharUm(cfg.fase); return; }
    new IntersectionObserver(([e]) => { visivel=e.isIntersecting; visivel?ligar():desligar(); },{threshold:0}).observe(host);
    document.addEventListener('visibilitychange', () => { document.hidden?desligar():(visivel&&ligar()); });
    if (cfg.expor) window.__campo = { desenharUm, estado: () => ({dpr,largura:W,altura:H,energia}) };
  }

  const PAPEL = [0.9451, 0.9569, 0.9608];   // #F1F4F5
  const TINTA = [0.0588, 0.0706, 0.0784];   // #0F1214
  const CASO  = [0.0902, 0.1020, 0.1098];   // --tinta-04 aprox

  // herói: tinta sobre papel
  montar({ host:'#hero', bloco:'#hero-bloco', fundo:PAPEL, linha:TINTA, forca:[.30,.09], fase:12, expor:true });
  // clímax: papel sobre tinta, mais quieto — eco, não repetição
  montar({ host:'.case', bloco:'#caso-bloco', fundo:CASO, linha:PAPEL, forca:[.16,.05], fase:47 });
})();
