/**
 * FX — a small runtime helper library injected into every scene sandbox
 * (preview, thumbnails and export). The AI writes scenes on top of it.
 */
export const FX_RUNTIME = String.raw`
var FX = (function(){
  var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};
  var lerp=function(a,b,p){return a+(b-a)*p;};
  var map=function(v,a,b,c,d){return c+((clamp(v,a,b)-a)/((b-a)||1))*(d-c);};
  var ease={
    linear:function(p){return p;},
    in:function(p){return p*p;},
    out:function(p){return 1-Math.pow(1-p,3);},
    inOut:function(p){return p<0.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;},
    back:function(p){var c=1.70158,s=c+1;return 1+s*Math.pow(p-1,3)+c*Math.pow(p-1,2);},
    elastic:function(p){if(p===0||p===1)return p;var c=(2*Math.PI)/3;return Math.pow(2,-10*p)*Math.sin((p*10-0.75)*c)+1;},
    expo:function(p){return p===1?1:1-Math.pow(2,-10*p);}
  };
  function rng(seed){var s=seed||1;return function(){s=(s*1664525+1013904223)%4294967296;return s/4294967296;};}

  function bg(ctx,w,h,colors,angle){
    var a=(angle||0)*Math.PI/180;
    var g=ctx.createLinearGradient(w/2-Math.cos(a)*w/2,h/2-Math.sin(a)*h/2,w/2+Math.cos(a)*w/2,h/2+Math.sin(a)*h/2);
    var list=colors&&colors.length?colors:['#0b0b12','#191426'];
    for(var i=0;i<list.length;i++)g.addColorStop(i/(list.length-1||1),list[i]);
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  function radial(ctx,x,y,r,inner,outer){
    var g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,inner);g.addColorStop(1,outer);
    ctx.fillStyle=g;ctx.fillRect(0,0,99999,99999);
  }
  function vignette(ctx,w,h,strength){
    var g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*0.25,w/2,h/2,Math.max(w,h)*0.75);
    g.addColorStop(0,'rgba(0,0,0,0)');
    g.addColorStop(1,'rgba(0,0,0,'+(strength==null?0.55:strength)+')');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  function grain(ctx,w,h,t,amount){
    var r=rng(Math.floor(t*30)+7),n=(amount==null?0.05:amount);
    ctx.save();ctx.globalAlpha=n;
    for(var i=0;i<160;i++){ctx.fillStyle=r()>0.5?'#fff':'#000';ctx.fillRect(r()*w,r()*h,2,2);}
    ctx.restore();
  }
  function shadow(ctx,color,blur,ox,oy){
    ctx.shadowColor=color||'rgba(0,0,0,.45)';ctx.shadowBlur=blur||24;
    ctx.shadowOffsetX=ox||0;ctx.shadowOffsetY=oy||0;
  }
  function noShadow(ctx){ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;}

  function font(o){
    return (o.italic?'italic ':'')+(o.weight||700)+' '+(o.size||64)+'px '+(o.font||'"Inter","Helvetica Neue",Arial,sans-serif');
  }
  function text(ctx,o){
    ctx.save();
    ctx.font=font(o);
    ctx.textAlign=o.align||'left';
    ctx.textBaseline=o.baseline||'alphabetic';
    ctx.globalAlpha=o.alpha==null?1:o.alpha;
    if(o.shadow)shadow(ctx,o.shadow,o.shadowBlur||20,0,o.shadowY||4);
    if(o.stroke){ctx.lineWidth=o.strokeWidth||6;ctx.strokeStyle=o.stroke;ctx.strokeText(o.text,o.x,o.y);}
    ctx.fillStyle=o.color||'#fff';
    ctx.fillText(String(o.text==null?'':o.text),o.x,o.y);
    ctx.restore();
  }
  function measure(ctx,o){ctx.save();ctx.font=font(o);var m=ctx.measureText(String(o.text||''));ctx.restore();return m.width;}
  function wrap(ctx,str,o,maxWidth){
    ctx.save();ctx.font=font(o);
    var words=String(str||'').split(/\s+/),lines=[],cur='';
    for(var i=0;i<words.length;i++){
      var test=cur?cur+' '+words[i]:words[i];
      if(ctx.measureText(test).width>maxWidth&&cur){lines.push(cur);cur=words[i];}else cur=test;
    }
    if(cur)lines.push(cur);
    ctx.restore();return lines;
  }
  function paragraph(ctx,str,o,maxWidth,lineHeight){
    var lines=wrap(ctx,str,o,maxWidth),lh=lineHeight||(o.size||48)*1.25;
    for(var i=0;i<lines.length;i++)text(ctx,Object.assign({},o,{text:lines[i],y:o.y+i*lh}));
    return lines.length*lh;
  }
  function typewriter(str,local,cps){
    var n=Math.floor(Math.max(0,local)*(cps||24));
    return String(str||'').slice(0,n);
  }

  function rrect(ctx,x,y,w,h,r){
    var rr=Math.min(r||0,Math.abs(w)/2,Math.abs(h)/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y);
    ctx.arcTo(x+w,y,x+w,y+h,rr);
    ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr);
    ctx.arcTo(x,y,x+w,y,rr);
    ctx.closePath();
  }
  function card(ctx,x,y,w,h,o){
    o=o||{};ctx.save();
    if(o.shadow!==false)shadow(ctx,'rgba(0,0,0,.45)',40,0,18);
    rrect(ctx,x,y,w,h,o.radius==null?28:o.radius);
    ctx.fillStyle=o.fill||'rgba(255,255,255,.06)';ctx.fill();
    noShadow(ctx);
    if(o.stroke){ctx.strokeStyle=o.stroke;ctx.lineWidth=o.lineWidth||2;ctx.stroke();}
    ctx.restore();
  }
  function badge(ctx,x,y,label,o){
    o=o||{};
    var pad=o.padding==null?18:o.padding,size=o.size||28;
    var w=measure(ctx,{text:label,size:size,weight:o.weight||700})+pad*2;
    var h=size+pad;
    card(ctx,x,y,w,h,{radius:h/2,fill:o.fill||'rgba(255,255,255,.12)',shadow:false,stroke:o.stroke});
    text(ctx,{text:label,x:x+w/2,y:y+h/2,size:size,weight:o.weight||700,color:o.color||'#fff',align:'center',baseline:'middle'});
    return {w:w,h:h};
  }
  function progressBar(ctx,x,y,w,h,p,o){
    o=o||{};
    rrect(ctx,x,y,w,h,h/2);ctx.fillStyle=o.track||'rgba(255,255,255,.15)';ctx.fill();
    rrect(ctx,x,y,Math.max(h,w*clamp(p,0,1)),h,h/2);ctx.fillStyle=o.fill||'#fff';ctx.fill();
  }

  /** Draws an image/video element covering or fitting the given box. */
  function img(ctx,el,x,y,w,h,mode,alpha,radius){
    if(!el)return;
    var iw=el.videoWidth||el.naturalWidth||el.width,ih=el.videoHeight||el.naturalHeight||el.height;
    if(!iw||!ih)return;
    var s=mode==='contain'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih);
    var dw=iw*s,dh=ih*s,dx=x+(w-dw)/2,dy=y+(h-dh)/2;
    ctx.save();
    if(alpha!=null)ctx.globalAlpha=alpha;
    if(radius){rrect(ctx,x,y,w,h,radius);ctx.clip();}
    else{ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();}
    try{ctx.drawImage(el,dx,dy,dw,dh);}catch(e){}
    ctx.restore();
  }
  function kenBurns(ctx,el,w,h,p,zoom){
    var z=1+(zoom==null?0.12:zoom)*p;
    var dw=w*z,dh=h*z;
    img(ctx,el,(w-dw)/2,(h-dh)/2,dw,dh,'cover');
  }

  function particles(ctx,t,w,h,o){
    o=o||{};var n=o.count||60,r=rng(o.seed||3),speed=o.speed||1;
    ctx.save();ctx.fillStyle=o.color||'rgba(255,255,255,.5)';
    for(var i=0;i<n;i++){
      var px=r()*w,py=r()*h,sp=(0.2+r())*speed*40,sz=(o.size||3)*(0.4+r());
      var y=(py-t*sp)%h;if(y<0)y+=h;
      ctx.globalAlpha=(o.alpha==null?0.6:o.alpha)*(0.3+r()*0.7);
      ctx.beginPath();ctx.arc(px,y,sz,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function grid(ctx,w,h,t,o){
    o=o||{};ctx.save();
    ctx.strokeStyle=o.color||'rgba(255,255,255,.06)';ctx.lineWidth=o.lineWidth||1;
    var step=o.step||80,off=(t*(o.speed||20))%step;
    for(var x=-step+off;x<w+step;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(var y=-step+off;y<h+step;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.restore();
  }

  /** Scene sequencer: pass [{dur:3},{dur:4}] and get the active scene. */
  function seq(t,scenes){
    var acc=0;
    for(var i=0;i<scenes.length;i++){
      var d=scenes[i].dur||scenes[i].duration||3;
      if(t<acc+d||i===scenes.length-1)
        return {index:i,scene:scenes[i],local:clamp(t-acc,0,d),dur:d,p:clamp((t-acc)/d,0,1),start:acc};
      acc+=d;
    }
    return {index:0,scene:scenes[0],local:0,dur:1,p:0,start:0};
  }
  function total(scenes){var s=0;for(var i=0;i<scenes.length;i++)s+=(scenes[i].dur||scenes[i].duration||3);return s;}

  /** in/out envelope for a clip: returns 0..1 alpha-ish value. */
  function env(local,dur,inDur,outDur){
    var i=inDur==null?0.4:inDur,o=outDur==null?0.4:outDur;
    return Math.min(ease.out(clamp(local/i,0,1)),ease.out(clamp((dur-local)/o,0,1)));
  }
  function slide(local,dur,dist,inDur){
    return (1-ease.out(clamp(local/(inDur||0.5),0,1)))*(dist==null?60:dist);
  }
  function pop(local,inDur){return ease.back(clamp(local/(inDur||0.45),0,1));}
  /** Cut/fade between scenes; call at the very end of drawFrame. */
  function flash(ctx,w,h,local,dur,color){
    var a=Math.max(0,1-local/0.18)*0.9;
    var b=Math.max(0,1-(dur-local)/0.18)*0.0;
    if(a+b<=0)return;
    ctx.save();ctx.globalAlpha=a+b;ctx.fillStyle=color||'#000';ctx.fillRect(0,0,w,h);ctx.restore();
  }
  function shake(ctx,t,amount,freq){
    var a=amount||6,f=freq||14;
    ctx.translate(Math.sin(t*f)*a,Math.cos(t*f*1.3)*a);
  }
  function counter(from,to,p){return Math.round(lerp(from,to,ease.out(clamp(p,0,1))));}

  return {clamp:clamp,lerp:lerp,map:map,ease:ease,rng:rng,bg:bg,radial:radial,vignette:vignette,
    grain:grain,shadow:shadow,noShadow:noShadow,text:text,measure:measure,wrap:wrap,paragraph:paragraph,
    typewriter:typewriter,rrect:rrect,card:card,badge:badge,progressBar:progressBar,img:img,
    kenBurns:kenBurns,particles:particles,grid:grid,seq:seq,total:total,env:env,slide:slide,pop:pop,
    flash:flash,shake:shake,counter:counter};
})();
`;

/** Short reference of the FX API given to the model. */
export const FX_DOCS = `Доступна глобальная библиотека FX (уже подключена, не переопределяй её):
FX.clamp(v,a,b), FX.lerp(a,b,p), FX.map(v,a,b,c,d), FX.rng(seed)->()=>0..1
FX.ease.{linear,in,out,inOut,back,elastic,expo}(p)
FX.bg(ctx,w,h,[colors],angleDeg) — градиентный фон
FX.vignette(ctx,w,h,strength), FX.grain(ctx,w,h,t,amount), FX.grid(ctx,w,h,t,{step,speed,color})
FX.particles(ctx,t,w,h,{count,color,size,speed,alpha,seed})
FX.text(ctx,{text,x,y,size,weight,color,align,baseline,alpha,font,shadow,stroke,strokeWidth})
FX.measure(ctx,{text,size,weight}) -> width; FX.wrap(ctx,str,opts,maxWidth) -> string[]
FX.paragraph(ctx,str,opts,maxWidth,lineHeight) -> высота блока
FX.typewriter(str,local,cps) -> подстрока (эффект печати)
FX.rrect(ctx,x,y,w,h,r) (путь), FX.card(ctx,x,y,w,h,{fill,radius,stroke,lineWidth})
FX.badge(ctx,x,y,label,{size,fill,color}) -> {w,h}
FX.progressBar(ctx,x,y,w,h,p,{fill,track})
FX.img(ctx,el,x,y,w,h,'cover'|'contain',alpha,radius) — рисует картинку/видео из ASSETS
FX.kenBurns(ctx,el,w,h,p,zoom) — медленный зум фото на весь кадр
FX.seq(t,SCENES) -> {index,scene,local,dur,p} — раскадровка
FX.total(SCENES) -> общая длительность
FX.env(local,dur,inDur,outDur) -> 0..1 плавное появление/исчезновение
FX.slide(local,dur,dist,inDur) -> смещение для выезда, FX.pop(local,inDur) -> масштаб с отскоком
FX.flash(ctx,w,h,local,dur,color) — вспышка на стыке сцен
FX.shake(ctx,t,amount,freq), FX.counter(from,to,p)`;
