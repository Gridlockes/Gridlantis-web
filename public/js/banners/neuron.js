/**
 * CPU / biological neuron banner.
 *
 * Transformed from the original standalone fragment:
 *   - DOM lookups scoped to the slide root instead of document
 *   - the `paused` flag replaced by explicit start()/stop() lifecycle
 *   - removed a corrupted leftover line (`'#2C4party'.slice(0,7)`) that was
 *     immediately overwritten by the real colour on the next statement
 *   - respects prefers-reduced-motion by painting a single static frame
 *
 * This is the heaviest of the three (ribbon fills per dendrite segment per
 * frame), which is why the carousel only ever runs the visible slide.
 */

import { fitCanvas, onResize, prefersReducedMotion } from "./canvas-util.js";

export function createNeuronBanner(root) {
const cv=root.querySelector('canvas');
  let ctx=fitCanvas(cv);
  const W=1200,H=400;
const PAL=['#4DD0E1','#FF7A6B','#FFD93D','#8DE86B','#C084FC','#FF9F45'];
const IDLE='#3A5490',DIM='#243C6E',SHEATH='#4A6BB0';
function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rnd=mul(23);
const SWC=`# synthetic sample in SWC format: id type x y z radius parent
1 1 0 0 0 5 -1
2 3 -2 -8 0 2.0 1
3 3 -3 -18 0 1.8 2
4 3 -4 -28 0 1.6 3
5 3 -12 -36 0 1.1 4
6 3 -18 -46 0 0.8 5
7 3 -6 -38 0 1.1 4
8 3 -4 -50 0 0.8 7
9 3 4 -34 0 1.0 4
10 3 10 -44 0 0.7 9
11 3 -10 4 0 2.0 1
12 3 -20 8 0 1.4 11
13 3 -30 4 0 0.9 12
14 3 -27 17 0 0.9 12
15 3 8 6 0 2.0 1
16 3 18 11 0 1.4 15
17 3 27 7 0 0.9 16
18 3 25 20 0 0.9 16
19 3 -2 10 0 1.8 1
20 3 -5 21 0 1.2 19
21 3 -14 28 0 0.8 20
22 3 4 28 0 0.8 20`;
function parseSWC(txt){
  const pts={},segs=[];
  txt.split('\n').forEach(l=>{l=l.trim();if(!l||l[0]==='#')return;
    const f=l.split(/\s+/);if(f.length<7)return;
    pts[+f[0]]={t:+f[1],x:+f[2],y:+f[3],r:+f[5],p:+f[6]};});
  Object.keys(pts).forEach(k=>{const n=pts[k],pa=pts[n.p];
    if(!pa||n.t===1)return;
    segs.push({x1:pa.x,y1:pa.y,x2:n.x,y2:n.y,w1:pa.r,w2:n.r});});
  return segs;
}
const SWCSEG=parseSWC(SWC);
function lsys(it){let s='F';const r='F[+F]F[-F]F';for(let i=0;i<it;i++)s=s.split('').map(c=>c==='F'?r:c).join('');return s;}
const LS=lsys(2);
function turtle(x,y,a,len,w){
  const segs=[],st=[];let cx=x,cy=y,ca=a,cl=len,cw=w;
  for(const c of LS){
    if(c==='F'){const nx=cx+Math.cos(ca)*cl,ny=cy+Math.sin(ca)*cl;
      segs.push({x1:cx,y1:cy,x2:nx,y2:ny,w1:cw,w2:cw*0.88});cx=nx;cy=ny;cw*=0.88;}
    else if(c==='['){st.push([cx,cy,ca,cl,cw]);cl*=0.72;cw*=0.62;}
    else if(c===']'){const s=st.pop();if(s){cx=s[0];cy=s[1];ca=s[2];cl=s[3];cw=s[4];}}
    else if(c==='+')ca+=0.45+(rnd()-0.5)*0.3;
    else if(c==='-')ca-=0.45+(rnd()-0.5)*0.3;
  }
  return segs;
}
const cols=[195,330,465,600,735,870,1000],rows=[122,200,278],nodes=[],edges=[];
cols.forEach((x,ci)=>rows.forEach((y,ri)=>{
  nodes.push({x:x+(rnd()*26-13),y:y+(rnd()*30-15),col:ci,flash:0,refr:0,color:PAL[0],out:[],soma:[],ls:[],swc:[]});}));
nodes.forEach(n=>{
  const k=9,p=[];
  for(let i=0;i<k;i++){const a=i/k*6.2832,r=8+Math.sin(a*3+n.x)*1.9+Math.cos(a*2+n.y)*1.6;
    p.push({x:n.x+Math.cos(a)*r,y:n.y+Math.sin(a)*r*0.85});}
  n.soma=p;
  const c=4+Math.floor(rnd()*2);
  for(let i=0;i<c;i++){const a=1.95+(i/(c-1))*2.4+(rnd()-0.5)*0.35;n.ls=n.ls.concat(turtle(n.x,n.y,a,7.5,2.3));}
  const rot=1.35+(rnd()-0.5)*0.9,cs=Math.cos(rot),sn=Math.sin(rot),sc=0.52;
  n.swc=SWCSEG.map(s=>({x1:n.x+(s.x1*cs-s.y1*sn)*sc,y1:n.y+(s.x1*sn+s.y1*cs)*sc,
    x2:n.x+(s.x2*cs-s.y2*sn)*sc,y2:n.y+(s.x2*sn+s.y2*cs)*sc,w1:Math.max(0.5,s.w1*0.9),w2:Math.max(0.4,s.w2*0.9)}));
});
function bez(a,b,gap){
  const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L,o=(rnd()-0.5)*70;
  const bx=b.x-dx/L*gap,by=b.y-dy/L*gap;
  const c1={x:a.x+dx*0.35+nx*o,y:a.y+dy*0.35+ny*o},c2={x:a.x+dx*0.68+nx*o*0.5,y:a.y+dy*0.68+ny*o*0.5},p=[];
  for(let i=0;i<=40;i++){const t=i/40,u=1-t;
    p.push({x:u*u*u*a.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*bx,y:u*u*u*a.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*by});}
  return p;
}
nodes.forEach(n=>{
  if(n.col>=cols.length-1)return;
  const nx=nodes.filter(m=>m.col===n.col+1).sort((a,b)=>Math.abs(a.y-n.y)-Math.abs(b.y-n.y));
  nx.slice(0,1+Math.floor(rnd()*2)).forEach(m=>{
    const p=bez(n,m,14),segs=[];let L=0;
    for(let i=1;i<p.length;i++){const d=Math.hypot(p[i].x-p[i-1].x,p[i].y-p[i-1].y);segs.push(d);L+=d;}
    const e={a:n,b:m,p,L,segs,ran:[]},K=Math.max(3,Math.round(L/38));
    for(let k=0;k<=K;k++)e.ran.push(k/K);
    edges.push(e);n.out.push(e);});
});
function ribbon(pts,w0,w1){
  const L=pts.length,l=[],r=[];
  for(let i=0;i<L;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(L-1,i+1)];
    let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;
    const nx=-dy/d,ny=dx/d,w=w0+(w1-w0)*(i/(L-1||1));
    l.push({x:pts[i].x+nx*w,y:pts[i].y+ny*w});r.push({x:pts[i].x-nx*w,y:pts[i].y-ny*w});}
  ctx.beginPath();ctx.moveTo(l[0].x,l[0].y);
  for(let i=1;i<L;i++)ctx.lineTo(l[i].x,l[i].y);
  for(let i=L-1;i>=0;i--)ctx.lineTo(r[i].x,r[i].y);
  ctx.closePath();ctx.fill();
}
function segRib(s){ribbon([{x:s.x1,y:s.y1},{x:s.x2,y:s.y2}],s.w1,s.w2);}
function pointAt(e,t){let d=t*e.L,i=0;while(i<e.segs.length&&d>e.segs[i]){d-=e.segs[i];i++;}
  if(i>=e.segs.length)return e.p[e.p.length-1];
  const a=e.p[i],b=e.p[i+1],f=e.segs[i]?d/e.segs[i]:0;return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};}
let sig=[],ves=[],sparks=[],amb=[],t0=0,den=1,myelin=true,morph='lsys';
  let running=false,raf=null;
for(let i=0;i<70;i++)amb.push({x:rnd()*W,y:rnd()*H,r:rnd()*1.6+0.4,s:rnd()*0.25+0.05,a:rnd()*0.35+0.1});
const REFR=0.5,HOP=0.075;
function fire(n,color){
  if(n.refr>0)return;
  n.flash=1;n.refr=REFR;n.color=color;
  n.out.forEach(e=>{if(Math.random()<0.88)sig.push({e,k:0,u:0,color,phase:'axon'});});
}
function seed(){const c=PAL[Math.floor(Math.random()*PAL.length)],c0=nodes.filter(n=>n.col===0&&n.refr<=0);
  if(c0.length)fire(c0[Math.floor(Math.random()*c0.length)],c);}
function burst(){PAL.forEach((c,i)=>setTimeout(()=>{const c0=nodes.filter(n=>n.col===0);fire(c0[i%c0.length],c);},i*90));}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
/**
 * The chip, the axon ribbons with their myelin sheaths and every unlit
 * dendrite arbor are fixed geometry - close to a thousand ribbon fills that
 * used to be rebuilt from scratch on every frame. Painting them once into an
 * offscreen canvas and blitting that is what lets this run at frame rate.
 */
const staticCv=document.createElement('canvas');
let staticDirty=true;

function drawStaticLayer(){
  ctx.globalAlpha=1;ctx.fillStyle='#FFC93D';
  for(let x=140;x<1080;x+=26){ctx.fillRect(x,34,12,16);ctx.fillRect(x,350,12,16);}
  ctx.fillStyle='#15224A';rr(120,50,960,300,16);ctx.fill();
  ctx.strokeStyle='#2B3F78';ctx.lineWidth=3;rr(120,50,960,300,16);ctx.stroke();
  ctx.fillStyle='#1B2C5C';rr(150,78,900,244,10);ctx.fill();
  ctx.strokeStyle='#33508F';ctx.lineWidth=2;rr(150,78,900,244,10);ctx.stroke();
  ctx.save();rr(150,78,900,244,10);ctx.clip();
  ctx.globalAlpha=den*0.5;ctx.fillStyle=DIM;
  nodes.forEach(n=>(morph==='swc'?n.swc:n.ls).forEach(segRib));
  ctx.globalAlpha=1;
  edges.forEach(e=>{
    ctx.fillStyle=IDLE;ribbon(e.p,2.6,1.1);
    if(myelin)for(let k=0;k<e.ran.length-1;k++){
      const a=e.ran[k]+0.035,b=e.ran[k+1]-0.035;if(b<=a)continue;
      const seg=[];for(let i=0;i<=8;i++)seg.push(pointAt(e,a+(b-a)*i/8));
      ctx.fillStyle=SHEATH;ctx.globalAlpha=0.75;ribbon(seg,4.4,3.4);ctx.globalAlpha=1;}
    const b=e.p[e.p.length-1];ctx.fillStyle=IDLE;ctx.beginPath();ctx.arc(b.x,b.y,4.4,0,6.3);ctx.fill();
    ctx.fillStyle='#22386B';ctx.beginPath();ctx.arc(b.x,b.y,2.2,0,6.3);ctx.fill();});
  ctx.restore();
}

function buildStatic(){
  // Match the live context's device scale so the cached art stays crisp.
  const q=Math.min(3,Math.max(1,ctx.getTransform().a));
  staticCv.width=Math.round(W*q);staticCv.height=Math.round(H*q);
  const sctx=staticCv.getContext('2d');
  sctx.setTransform(q,0,0,q,0,0);
  const live=ctx;ctx=sctx;   // ribbon()/rr()/segRib() all paint through `ctx`
  drawStaticLayer();
  ctx=live;
  staticDirty=false;
}

function draw(ts){
  const dt=Math.min(0.05,(ts-t0)/1000||0.016);t0=ts;
  if(staticDirty)buildStatic();

  ctx.fillStyle='#0B1026';ctx.fillRect(0,0,W,H);
  // dt-scaled so the drift reads the same whether we get 30fps or 144
  amb.forEach(p=>{p.x+=p.s*dt*60;if(p.x>W)p.x=-4;ctx.globalAlpha=p.a;ctx.fillStyle='#3C5A9A';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.3);ctx.fill();});
  ctx.globalAlpha=1;

  ctx.drawImage(staticCv,0,0,W,H);

  ctx.save();rr(150,78,900,244,10);ctx.clip();

  // only arbors that are actually firing get redrawn; the rest are in the blit
  nodes.forEach(n=>{
    if(n.flash<=0.05)return;
    ctx.globalAlpha=den*0.9;ctx.fillStyle=n.color;
    (morph==='swc'?n.swc:n.ls).forEach(segRib);});
  ctx.globalAlpha=1;

  {
    const step=myelin?HOP:HOP*0.55;
    sig.forEach(s=>{
      // Advance continuously along the axon rather than one node per tick, so
      // the spike glides instead of stuttering between nodes of Ranvier.
      const span=Math.max(1,s.e.ran.length-1);
      s.u+=dt/(step*span);
      while(s.k<s.e.ran.length&&s.u>=s.e.ran[s.k]){
        const pt=pointAt(s.e,s.e.ran[s.k]);
        sparks.push({x:pt.x,y:pt.y,a:1,c:s.color});
        s.k++;}
      if(s.u>=1&&s.phase==='axon'){
        s.phase='cleft';
        const tp=s.e.p[s.e.p.length-1],tg=s.e.b;
        for(let v=0;v<7;v++)ves.push({x:tp.x,y:tp.y,tx:tg.x+(rnd()*10-5),ty:tg.y+(rnd()*10-5),t:0,sp:2.6+rnd(),c:s.color,tgt:tg});
      }});
    ves.forEach(v=>{v.t=Math.min(1,v.t+dt*v.sp);if(v.t>=1&&!v.done){v.done=true;fire(v.tgt,v.c);}});
    ves=ves.filter(v=>v.t<1);
    sparks.forEach(s=>s.a-=dt*3.2);sparks=sparks.filter(s=>s.a>0);
    nodes.forEach(n=>{n.refr=Math.max(0,n.refr-dt);n.flash=Math.max(0,n.flash-dt*1.5);});
  }

  // The travelling action potential: a head with a short fading tail. This is
  // the part that carries the eye between nodes.
  sig.forEach(s=>{
    const head=Math.min(1,s.u);
    for(let i=4;i>=1;i--){
      const u=head-i*0.018;
      if(u<0)continue;
      const pt=pointAt(s.e,u),f=1-i/5;
      ctx.globalAlpha=0.5*f*f;ctx.fillStyle=s.color;
      ctx.beginPath();ctx.arc(pt.x,pt.y,1.6+2.6*f,0,6.3);ctx.fill();}
    const pt=pointAt(s.e,head);
    ctx.globalAlpha=0.22;ctx.fillStyle=s.color;
    ctx.beginPath();ctx.arc(pt.x,pt.y,9,0,6.3);ctx.fill();
    ctx.globalAlpha=0.9;
    ctx.beginPath();ctx.arc(pt.x,pt.y,3.2,0,6.3);ctx.fill();});
  sig=sig.filter(s=>s.phase==='axon');
  ctx.globalAlpha=1;

  sparks.forEach(s=>{ctx.globalAlpha=s.a*0.9;ctx.fillStyle=s.c;
    ctx.beginPath();ctx.arc(s.x,s.y,5.2*s.a+1.4,0,6.3);ctx.fill();
    ctx.globalAlpha=s.a*0.25;ctx.beginPath();ctx.arc(s.x,s.y,13*(1-s.a)+4,0,6.3);ctx.fill();});
  ctx.globalAlpha=1;
  ves.forEach(v=>{const x=v.x+(v.tx-v.x)*v.t,y=v.y+(v.ty-v.y)*v.t;
    ctx.globalAlpha=0.85*(1-v.t*0.4);ctx.fillStyle=v.c;
    ctx.beginPath();ctx.arc(x,y,2.1,0,6.3);ctx.fill();});
  ctx.globalAlpha=1;
  nodes.forEach(n=>{
    if(n.flash>0){const f=n.flash;
      ctx.globalAlpha=f*0.5;ctx.strokeStyle=n.color;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(n.x,n.y,10+(1-f)*24,0,6.3);ctx.stroke();
      ctx.globalAlpha=f*0.2;ctx.fillStyle=n.color;ctx.beginPath();ctx.arc(n.x,n.y,20,0,6.3);ctx.fill();}
    ctx.globalAlpha=1;
    const rf=n.refr>0&&n.flash<=0.05;
    ctx.fillStyle=n.flash>0.05?n.color:(rf?'#20365F':'#33518F');
    ctx.beginPath();ctx.moveTo(n.soma[0].x,n.soma[0].y);
    n.soma.forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.fill();
    if(rf){ctx.globalAlpha=0.5;ctx.strokeStyle='#2C4680';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(n.x,n.y,10.5,-1.57,-1.57+6.2832*(1-n.refr/REFR));ctx.stroke();ctx.globalAlpha=1;}
    ctx.fillStyle=n.flash>0.05?'#0B1026':'#22386B';
    ctx.beginPath();ctx.arc(n.x,n.y,3.4,0,6.3);ctx.fill();});
  ctx.restore();ctx.globalAlpha=1;
  // frame-rate independent: same ~0.9 seeds a second at any refresh rate
  if(Math.random()<1-Math.pow(1-0.035,dt*60))seed();
}
  function frame(ts){
    if(!running) return;
    draw(ts);
    raf = requestAnimationFrame(frame);
  }

  function paintStatic(){
    const was = running;
    running = false;
    draw(performance.now());
    running = was;
  }

  const teardownResize = onResize(cv, (newCtx) => {
    ctx = newCtx;
    staticDirty = true;   // the cache is rendered at the old device scale
    if (!running) paintStatic();
  });

  seed();

  return {
    start(){
      if (running) return;
      if (prefersReducedMotion()) { paintStatic(); return; }
      running = true;
      t0 = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop(){
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    },
    destroy(){ this.stop(); teardownResize(); },
    burst,
    setArbor(v){ den = v; staticDirty = true; },
    setMyelin(v){ myelin = v; staticDirty = true; },
    setMorphology(v){ morph = v; staticDirty = true; },
    paintStatic,
  };
}
