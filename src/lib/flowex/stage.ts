import type { Project } from "./types";
import { FX_RUNTIME } from "./fx";
import { overrideSnippet } from "./config";

export type AssetUrlMap = Record<string, string>;

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
    try{ drawFrame(ctx,t,c.width,c.height); }catch(e){ __err=String(e); }
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
  });
  parent.postMessage({source:'flowex',type:'ready',error:__err},'*');
})();
<\/script></body></html>`;
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
    // eslint-disable-next-line no-new-func
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
