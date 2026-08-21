import type { Scene } from "./types";

export const mountainSunset: Scene = {
  css: "",
  html: "",
  js: `function lerp(a,b,k){return a+(b-a)*k;}
function ease(k){return k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;}
function ridge(ctx,w,h,base,amp,seed,color,t,par){
  ctx.beginPath();
  ctx.moveTo(-50,h);
  for(let x=-50;x<=w+50;x+=8){
    const p=(x+t*par*40)*0.0026;
    const y=base - Math.sin(p*1.7+seed)*amp - Math.sin(p*3.9+seed*2.1)*amp*0.42 - Math.sin(p*8.3+seed*3.7)*amp*0.14;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(w+50,h);ctx.closePath();ctx.fillStyle=color;ctx.fill();
}
function drawFrame(ctx,t,w,h){
  const k=ease(Math.min(1,t/12));
  const sky=ctx.createLinearGradient(0,0,0,h*0.8);
  sky.addColorStop(0,'#160d2b');
  sky.addColorStop(0.42,'#5c2a5c');
  sky.addColorStop(0.68,'#d4592f');
  sky.addColorStop(1,'#ffcf86');
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);

  // sun
  const sy=lerp(h*0.52,h*0.62,k);
  const g=ctx.createRadialGradient(w*0.66,sy,0,w*0.66,sy,h*0.42);
  g.addColorStop(0,'rgba(255,228,150,0.95)');
  g.addColorStop(0.25,'rgba(255,150,70,0.55)');
  g.addColorStop(1,'rgba(255,120,60,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.beginPath();ctx.arc(w*0.66,sy,h*0.055,0,Math.PI*2);ctx.fillStyle='#fff3c9';ctx.fill();

  // clouds
  for(let i=0;i<7;i++){
    const cx=((i*260 + t*(14+i*4))%(w+520))-260;
    const cy=h*(0.12+0.045*i);
    const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,180+i*22);
    cg.addColorStop(0,'rgba(255,190,150,'+(0.20-i*0.015)+')');
    cg.addColorStop(1,'rgba(120,60,110,0)');
    ctx.fillStyle=cg;ctx.beginPath();ctx.arc(cx,cy,180+i*22,0,Math.PI*2);ctx.fill();
  }

  ridge(ctx,w,h,h*0.70,h*0.10,1.2,'rgba(90,62,102,0.85)',t,0.25);
  ridge(ctx,w,h,h*0.78,h*0.13,3.4,'rgba(56,40,72,0.94)',t,0.5);
  ridge(ctx,w,h,h*0.90,h*0.09,5.9,'#1d1630',t,0.9);

  // lake reflection
  ctx.save();
  ctx.globalAlpha=0.22;
  const lg=ctx.createLinearGradient(0,h*0.86,0,h);
  lg.addColorStop(0,'rgba(255,190,120,0.5)');
  lg.addColorStop(1,'rgba(20,12,34,0)');
  ctx.fillStyle=lg;ctx.fillRect(0,h*0.86,w,h*0.14);
  ctx.restore();
  for(let i=0;i<40;i++){
    const y=h*0.87+ (i/40)*h*0.13;
    const off=Math.sin(t*1.6+i*0.6)*(6+i*0.4);
    ctx.fillStyle='rgba(255,205,150,'+(0.05+0.05*Math.sin(i))+')';
    ctx.fillRect(w*0.55+off,y,w*0.22,1.2);
  }

  // fog
  ctx.fillStyle='rgba(255,200,170,'+(0.05+0.03*Math.sin(t*0.7))+')';
  ctx.fillRect(0,h*0.62,w,h*0.2);

  // vignette
  const v=ctx.createRadialGradient(w/2,h/2,h*0.25,w/2,h/2,h*0.85);
  v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
}`,
};

export const citySkyline: Scene = {
  css: "",
  html: "",
  js: `function drawFrame(ctx,t,w,h){
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#050914');g.addColorStop(0.6,'#0d1b3a');g.addColorStop(1,'#1b2a52');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  for(let i=0;i<120;i++){
    const x=(i*137.5)%w, y=((i*71.3)%(h*0.5));
    const a=0.25+0.25*Math.sin(t*2+i);
    ctx.fillStyle='rgba(255,255,255,'+a+')';ctx.fillRect(x,y,1.6,1.6);
  }
  const layers=[{s:0.35,c:'#0b1226',hh:0.42},{s:0.7,c:'#101a34',hh:0.55},{s:1.2,c:'#16223f',hh:0.68}];
  layers.forEach(function(L,li){
    for(let i=-2;i<40;i++){
      const bw=w/18;
      const x=((i*bw - t*L.s*24)%(w+bw*3))-bw*2;
      const seed=Math.abs(Math.sin((i+li*13)*12.9898)*43758.5453)%1;
      const bh=h*L.hh*(0.45+seed*0.55);
      ctx.fillStyle=L.c;ctx.fillRect(x,h-bh,bw*0.86,bh);
      for(let r=0;r<Math.floor(bh/26);r++){
        for(let c=0;c<4;c++){
          const lit=(Math.sin((i*7+r*3+c*11+li*5))*0.5+0.5)>0.45+0.25*Math.sin(t*0.8+r);
          if(!lit) continue;
          ctx.fillStyle='rgba(255,214,140,'+(0.35+0.4*seed)+')';
          ctx.fillRect(x+6+c*(bw*0.19),h-bh+12+r*26,bw*0.11,9);
        }
      }
    }
  });
  const v=ctx.createRadialGradient(w/2,h*0.55,h*0.2,w/2,h*0.55,h*0.9);
  v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.6)');
  ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
}`,
};

export const oceanWaves: Scene = {
  css: "",
  html: "",
  js: `function drawFrame(ctx,t,w,h){
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#0a2231');g.addColorStop(0.4,'#0f4256');g.addColorStop(1,'#03121c');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  for(let l=0;l<9;l++){
    const yBase=h*0.35+l*(h*0.075);
    ctx.beginPath();ctx.moveTo(0,h);
    for(let x=0;x<=w;x+=6){
      const p=x*0.006+l*0.6;
      const y=yBase+Math.sin(p+t*(1.1+l*0.12))*(10+l*3)+Math.sin(p*2.4-t*0.8)*(5+l);
      ctx.lineTo(x,y);
    }
    ctx.lineTo(w,h);ctx.closePath();
    const a=0.12+l*0.07;
    ctx.fillStyle='rgba('+(20+l*6)+','+(90+l*12)+','+(120+l*10)+','+a+')';
    ctx.fill();
    ctx.strokeStyle='rgba(200,240,255,'+(0.05+l*0.02)+')';ctx.lineWidth=1.2;ctx.stroke();
  }
  for(let i=0;i<60;i++){
    const x=(i*173.7+t*(30+i%7*9))%w;
    const y=h*0.42+((i*53)%Math.floor(h*0.5))+Math.sin(t*2+i)*6;
    ctx.fillStyle='rgba(255,255,255,'+(0.05+0.12*Math.abs(Math.sin(t+i)))+')';
    ctx.beginPath();ctx.arc(x,y,1.4+((i%3)*0.7),0,Math.PI*2);ctx.fill();
  }
  const v=ctx.createRadialGradient(w/2,h/2,h*0.2,w/2,h/2,h*0.9);
  v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.55)');
  ctx.fillStyle=v;ctx.fillRect(0,0,w,h);
}`,
};

export const blankScene: Scene = {
  css: "",
  html: "",
  js: `function drawFrame(ctx,t,w,h){
  const g=ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#12121a');g.addColorStop(1,'#1e1b2e');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  const r=Math.min(w,h)*0.18+Math.sin(t*1.5)*12;
  ctx.save();ctx.translate(w/2,h/2);ctx.rotate(t*0.5);
  for(let i=0;i<6;i++){
    ctx.rotate(Math.PI/3);
    ctx.beginPath();ctx.arc(r,0,18,0,Math.PI*2);
    ctx.fillStyle='hsla('+(i*50+t*40)+',80%,65%,0.85)';ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle='rgba(255,255,255,0.9)';
  ctx.font='600 '+Math.round(h*0.06)+'px Inter, system-ui, sans-serif';
  ctx.textAlign='center';
  ctx.fillText('Новый проект', w/2, h*0.82);
}`,
};
