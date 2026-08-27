import type { Project } from "./types";
import { FX_RUNTIME } from "./fx";
import { overrideSnippet } from "./config";

export type AssetUrlMap = Record<string, string>;

/**
 * Builds a shared snippet that draws user overlay elements (text / image / shape)
 * on top of the scene canvas. Used both by the live preview sandbox and by the
 * video exporter so drag-and-drop elements are baked into the recorded frame.
 */
export function elementsSnippet(project: Project): string {
  const els = project.elements ?? [];
  if (!els.length) return "";
  const j = JSON.stringify(els);
  const idName: Record<string, string> = {};
  for (const a of project.assets) if (a.kind !== "audio") idName[a.id] = a.name;
  const idMap = JSON.stringify(idName);
  return `
var __elemIdName=${idMap};
function __assetByUid(id){return ASSETS[__elemIdName[id]]||null;}
var E=${j};
function __setElements(list){E=list||[];}
function paintElements(ctx,w,h){
  var list=E.slice();list.sort(function(a,b){return (a.z||0)-(b.z||0);});
  for(var i=0;i<list.length;i++){var e=list[i];
    if(e.visible===false)continue;
    var cx=e.x*w, cy=e.y*h, ew=e.w*w, eh=e.h*h;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate((e.rotation||0)*Math.PI/180);
    ctx.globalAlpha*=(e.opacity==null?1:e.opacity);
    if(e.kind==='text'){
      var fs=(e.fontSize||24)*h/720;
      ctx.font=(e.bold?'700 ':'400 ')+fs+'px '+(e.fontFamily?e.fontFamily.replace(/"/g,''):'sans-serif')+',sans-serif';
      ctx.fillStyle=e.color||'#fff';
      ctx.textAlign=e.align==='left'?'left':e.align==='right'?'right':'center';
      ctx.textBaseline='middle';
      var lines=String(e.text||'').split('\\n');
      var lh=fs*1.15;
      for(var l=0;l<lines.length;l++){
        ctx.fillText(lines[l],0,(l-lines.length/2+0.5)*lh);
      }
    }else if(e.kind==='image'){
      var el=__assetByUid(e.assetId);
      if(el&&el.width){
        var fit=e.objectFit||'cover';
        var sr=el.width/el.height, tr=ew/eh, dw=ew, dh=eh, dx=-ew/2, dy=-eh/2;
        if(fit==='cover'){ if(sr>tr){dh=ew/sr;dy=-dh/2;} else {dw=eh*sr;dx=-dw/2;} }
        else { if(sr>tr){dw=eh*sr;dx=-dw/2;} else {dh=ew/sr;dy=-dh/2;} }
        ctx.drawImage(el,dx,dy,dw,dh);
      }
    }else if(e.kind==='shape'){
      ctx.fillStyle=e.fill||'#22d3ee';
      if(e.shape==='circle'){ctx.beginPath();ctx.arc(0,0,Math.min(ew,eh)/2,0,Math.PI*2);ctx.fill();}
      else if(e.shape==='triangle'){
        ctx.beginPath();ctx.moveTo(0,-eh/2);ctx.lineTo(ew/2,eh/2);ctx.lineTo(-ew/2,eh/2);ctx.closePath();ctx.fill();
      }else{
        var r=(e.radius==null?0:Math.min(e.radius*Math.min(ew,eh),Math.min(ew,eh)/2));
        ctx.beginPath();
        if(r>0){roundRectPath(ctx,-ew/2,-eh/2,ew,eh,r);ctx.fill();}
        else ctx.fillRect(-ew/2,-eh/2,ew,eh);
      }
    }
    ctx.restore();
  }
}
function roundRectPath(ctx,x,y,w,h,r){
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
`;
}

/** Code that builds the ASSETS map inside the sandbox. */
function assetsSnippet(project: Project, urls: AssetUrlMap): string {
  const list = project.assets
    .filter((a) => a.kind !== "audio" && urls[a.id])
    .map((a) => ({ name: a.name, kind: a.kind, url: urls[a.id]! }));
  return `
var ASSETS={};
var __assetDefs=${JSON.stringify(list)};
(function(){
  for(var i=0;i<__assetDefs.length;i++){
    var d=__assetDefs[i],el;
    if(d.kind==='video'){el=document.createElement('video');el.muted=true;el.playsInline=true;el.preload='auto';el.loop=true;}
    else{el=document.createElement('img');}
    el.crossOrigin='anonymous';el.src=d.url;
    ASSETS[d.name]=el;
  }
})();
function getAsset(n){return ASSETS[n]||null;}
`;
}

/** Builds the sandboxed (same-origin) document that renders the scene on a canvas. */
export function buildStageDoc(project: Project, urls: AssetUrlMap = {}): string {
  const { scene, width, height, duration, fps } = project;
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
html,body{margin:0;height:100%;background:#000;overflow:hidden;display:flex;align-items:center;justify-content:center}
#stage{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center}
canvas{max-width:100%;max-height:100%;display:block}
#overlay{position:absolute;inset:0;pointer-events:none}
${scene.css}
</style></head><body>
<div id="stage"><canvas id="c" width="${width}" height="${height}"></canvas><div id="overlay">${scene.html}</div></div>
<script>
${FX_RUNTIME}
${elementsSnippet(project)}
var __err=null;
try{
${assetsSnippet(project, urls)}
${scene.js}
${overrideSnippet(project.config)}
}catch(e){__err=String(e);}
(function(){
  var c=document.getElementById('c');
  var ctx=c.getContext('2d');
  var DUR=${duration}, FPS=${fps};
  var t=0, playing=false, last=null;
  function syncVideos(){
    try{
      for(var k in ASSETS){
        var el=ASSETS[k];
        if(el&&el.tagName==='VIDEO'&&el.duration){
          if(playing){ if(el.paused)el.play().catch(function(){}); }
          else { el.pause(); el.currentTime=t%el.duration; }
        }
      }
    }catch(e){}
  }
  function paint(){
    ctx.setTransform(1,0,0,1,0,0);
    if(__err||typeof drawFrame!=='function'){
      ctx.fillStyle='#150f1f';ctx.fillRect(0,0,c.width,c.height);
      ctx.fillStyle='#ff8080';ctx.font='24px monospace';ctx.textAlign='center';
      ctx.fillText('Ошибка сцены: '+(__err||'нет drawFrame'),c.width/2,c.height/2);
      return;
    }
    try{ drawFrame(ctx,t,c.width,c.height);
      if(typeof paintElements==='function')paintElements(ctx,c.width,c.height);}
      catch(e){ __err=String(e); }
  }
  function loop(ts){
    if(playing){
      if(last!=null) t+=(ts-last)/1000;
      last=ts;
      if(t>=DUR){ t=0; }
      paint();
      parent.postMessage({source:'flowex',type:'time',t:t},'*');
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  paint();
  window.addEventListener('message',function(e){
    var d=e.data||{};
    if(d.source!=='flowex-host')return;
    if(d.type==='play'){playing=true;last=null;syncVideos();}
    if(d.type==='pause'){playing=false;last=null;syncVideos();}
    if(d.type==='seek'){t=Math.max(0,Math.min(DUR,d.t));last=null;syncVideos();paint();
      parent.postMessage({source:'flowex',type:'time',t:t},'*');}
    if(d.type==='renderAt'){t=d.t;paint();}
    if(d.type==='elements'&&typeof __setElements==='function'){__setElements(d.list);paint();}
  });
  parent.postMessage({source:'flowex',type:'ready',error:__err},'*');
})();
${"</" + "script>"}</body></html>`;
}

/** Renders a still frame of the scene to an offscreen canvas (thumbnails). */
export function renderThumb(project: Project, t: number, w = 160): string {
  if (typeof document === "undefined") return "";
  const h = Math.round((w * project.height) / project.width);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  try {
    const fn = new Function(
      `${FX_RUNTIME}
       var ASSETS={}; function getAsset(){return null;}
       ${project.scene.js}
       ${overrideSnippet(project.config)}
       return typeof drawFrame==='function'?drawFrame:null;`,
    )() as ((c: CanvasRenderingContext2D, t: number, w: number, h: number) => void) | null;
    if (!fn) return "";
    fn(ctx, t, w, h);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return "";
  }
}
