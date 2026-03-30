/**
 * export.js — Moteur d'export Villejuif Elections
 * Canvas 2D sur fond blanc, A4 150 dpi.
 */
(function () {

/* A4 @ 150 dpi */
const DPI = 150;
const MM  = DPI / 25.4;
const A4L = { w: Math.round(297*MM), h: Math.round(210*MM) };
const A4P = { w: Math.round(210*MM), h: Math.round(297*MM) };
const M   = Math.round(14*MM);

/* White-bg palette */
const C = {
  bg:'#ffffff', bg2:'#f6f5f2', bg3:'#eeedea',
  border:'#dddbd6', border2:'#c8c6c0',
  txt:'#111111', txt2:'#3a3830', txt3:'#7a7570', accent:'#b8282e',
};

/* Utils */
const fP = v => v.toFixed(1).replace('.', ',') + '\u202f%';
const fN = v => Number(v).toLocaleString('fr-FR');

function hexRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function lighten(h,t){const[r,g,b]=hexRgb(h);return`rgb(${Math.round(r+(255-r)*t)},${Math.round(g+(255-g)*t)},${Math.round(b+(255-b)*t)})`;}
function darken(h,t){const[r,g,b]=hexRgb(h);return`rgb(${Math.round(r*(1-t))},${Math.round(g*(1-t))},${Math.round(b*(1-t))})`;}

function rr(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

/* Header */
function drawHeader(ctx,state,x,y){
  const{election,modeLabel}=state;
  ctx.fillStyle=C.accent; ctx.fillRect(x,y,5,44);
  ctx.fillStyle=C.txt; ctx.font=`bold ${Math.round(1.6*MM)}px DM Sans,sans-serif`;
  ctx.fillText('Villejuif',x+14,y+18);
  const tw=ctx.measureText('Villejuif').width;
  ctx.fillStyle=C.accent; ctx.font=`italic bold ${Math.round(1.6*MM)}px Cormorant Garamond,Georgia,serif`;
  ctx.fillText(' elections',x+14+tw,y+18);
  ctx.fillStyle=C.txt3; ctx.font=`600 ${Math.round(0.75*MM)}px DM Sans,sans-serif`;
  const sub=[modeLabel,election&&election.label,election&&election.date].filter(Boolean).join('  \u00b7  ');
  ctx.fillText(sub,x+14,y+36);
  ctx.strokeStyle=C.border; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(x,y+50); ctx.lineTo(ctx.canvas.width-x,y+50); ctx.stroke();
  return y+58;
}

/* Sources footer */
function drawSources(ctx,text,cW,y){
  ctx.strokeStyle=C.border; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(M,y); ctx.lineTo(cW-M,y); ctx.stroke();
  ctx.fillStyle=C.txt3; ctx.font=`${Math.round(0.55*MM)}px DM Sans,sans-serif`;
  ctx.fillText('Sources\u202f: '+text,M,y+14);
}

/* KPIs */
function drawKPIs(ctx,ins,part,x,y,totalW){
  const kw=Math.floor((totalW-8)/3), kh=Math.round(3.5*MM);
  [{v:fN(ins),l:'Inscrits'},{v:fP(part),l:'Participation'},{v:fP(100-part),l:'Abstention'}]
  .forEach((k,i)=>{
    const kx=x+i*(kw+4);
    ctx.fillStyle=C.bg2; rr(ctx,kx,y,kw,kh,4); ctx.fill();
    ctx.strokeStyle=C.border; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle=C.txt; ctx.font=`bold ${Math.round(1.8*MM)}px Cormorant Garamond,Georgia,serif`;
    const vw=ctx.measureText(k.v).width; ctx.fillText(k.v,kx+kw/2-vw/2,y+kh*0.58);
    ctx.fillStyle=C.txt3; ctx.font=`600 ${Math.round(0.6*MM)}px DM Sans,sans-serif`;
    const lw=ctx.measureText(k.l).width; ctx.fillText(k.l,kx+kw/2-lw/2,y+kh*0.85);
  });
  return y+kh+Math.round(0.8*MM);
}

/* Balance bar */
function drawBalance(ctx,lists,exp,x,y,w){
  const bh=Math.round(0.7*MM);
  const blocs=[
    {key:'ex_gauche',color:'#7B1FA2'},{key:'gauche_rad',color:'#C62828'},
    {key:'gauche',color:'#EC407A'},{key:'centre',color:'#FF8F00'},
    {key:'droite',color:'#1565C0'},{key:'ex_droite',color:'#1A237E'},{key:'autre',color:'#90A4AE'}
  ];
  rr(ctx,x,y,w,bh,2); ctx.save(); ctx.clip();
  let bx=x;
  blocs.forEach(bl=>{
    const sum=lists.filter(l=>l.bloc===bl.key).reduce((s,l)=>s+l.voix,0);
    const sw=exp>0?sum/exp*w:0;
    if(sw<1)return;
    ctx.fillStyle=bl.color; ctx.fillRect(bx,y,sw,bh); bx+=sw;
  });
  ctx.restore();
  return y+bh+Math.round(1*MM);
}

/* Result bars */
function drawBars(ctx,lists,exp,x,y,w){
  if(!lists.length)return y;
  const rowH=Math.round(1.7*MM), barH=Math.round(0.18*MM);
  const badgeW=Math.round(2*MM), pctW=Math.round(3.5*MM), voxW=Math.round(3.5*MM);
  const maxPct=lists[0]&&lists[0].pct||1;
  const fs=Math.round(0.75*MM), fsS=Math.round(0.6*MM);
  lists.forEach((l,i)=>{
    const ry=y+i*rowH, mid=ry+rowH*0.62;
    ctx.fillStyle=lighten(l.color,0.8); rr(ctx,x,ry+rowH*0.15,badgeW,rowH*0.65,2); ctx.fill();
    ctx.fillStyle=darken(l.color,0.15); ctx.font=`bold ${fsS}px DM Sans,sans-serif`;
    const bw=ctx.measureText(l.nuance).width; ctx.fillText(l.nuance,x+badgeW/2-bw/2,mid);
    ctx.fillStyle=C.txt; ctx.font=`${fs}px DM Sans,sans-serif`;
    const nx=x+badgeW+Math.round(0.5*MM);
    const nm=l.nom.length>30?l.nom.slice(0,28)+'...':l.nom; ctx.fillText(nm,nx,mid);
    ctx.fillStyle=l.color; ctx.font=`bold ${Math.round(1*MM)}px Cormorant Garamond,Georgia,serif`;
    const pctStr=fP(l.pct), px2=x+w-voxW-Math.round(0.5*MM)-ctx.measureText(pctStr).width;
    ctx.fillText(pctStr,px2,mid);
    ctx.fillStyle=C.txt3; ctx.font=`${fsS}px DM Sans,sans-serif`;
    const vStr=fN(l.voix); ctx.fillText(vStr,x+w-ctx.measureText(vStr).width,mid);
    const barW=Math.round(w*0.55), barX=nx, barY=ry+rowH-barH-1;
    ctx.fillStyle=C.bg3; ctx.fillRect(barX,barY,barW,barH);
    ctx.fillStyle=l.color; ctx.fillRect(barX,barY,barW*l.pct/maxPct,barH);
    ctx.strokeStyle=C.border; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(x,ry+rowH-0.5); ctx.lineTo(x+w,ry+rowH-0.5); ctx.stroke();
  });
  return y+lists.length*rowH+Math.round(1*MM);
}

/* Data table */
function drawTable(ctx,data,candidates,x,y,w){
  if(!data||!data.length)return y;
  ctx.fillStyle=C.accent; ctx.font=`600 ${Math.round(0.6*MM)}px DM Sans,sans-serif`;
  ctx.fillText('DONNEES BRUTES PAR BUREAU DE VOTE',x,y+Math.round(0.8*MM));
  y+=Math.round(1.8*MM);
  const fixCols=['BV','Inscrits','Votants','Part.%','Expr.'];
  const fixW=[Math.round(1.3*MM),Math.round(2.5*MM),Math.round(2.5*MM),Math.round(2*MM),Math.round(2.3*MM)];
  const fixTot=fixW.reduce((a,b)=>a+b,0)+fixCols.length*2;
  const candW=Math.max(Math.round(2.2*MM),Math.floor((w-fixTot)/candidates.length-2));
  const colW=[...fixW,...candidates.map(()=>candW)];
  const allCols=[...fixCols,...candidates.map(c=>c.nuance)];
  const totalW=colW.reduce((a,b)=>a+b,0)+allCols.length*2;
  const scale=Math.min(1,w/totalW);
  const rowH=Math.round(0.9*MM), hdrH=Math.round(1.1*MM), fs=Math.round(0.52*MM);
  ctx.save();
  ctx.translate(x,0); ctx.scale(scale,1);
  const ox=0;
  ctx.fillStyle=C.accent; rr(ctx,ox,y,totalW,hdrH,3); ctx.fill();
  let cx=ox+2;
  allCols.forEach((col,i)=>{
    ctx.fillStyle='#fff'; ctx.font=`bold ${fs}px DM Sans,sans-serif`;
    ctx.fillText(col,cx,y+hdrH*0.72); cx+=colW[i]+2;
  });
  y+=hdrH;
  data.slice().sort((a,b)=>parseInt(a.bv)-parseInt(b.bv)).forEach((row,ri)=>{
    ctx.fillStyle=ri%2===0?C.bg:C.bg2; ctx.fillRect(ox,y,totalW,rowH);
    const part2=row.ins>0?((row.vot||0)/(row.ins||1)*100).toFixed(1):'--';
    const vals=[
      String(parseInt(row.bv)).padStart(2,'0'),fN(row.ins||0),fN(row.vot||0),part2,fN(row.exp||0),
      ...candidates.map(c=>{const v=parseInt(row[c.nuance])||0;const p=row.exp>0?(v/row.exp*100).toFixed(1):'0';return fN(v)+' ('+p+'%)';})
    ];
    cx=ox+2;
    vals.forEach((val,i)=>{
      const cand=i>=5?candidates[i-5]:null;
      ctx.fillStyle=cand?cand.color:(i===3?'#1565C0':i===0?C.txt:C.txt2);
      ctx.font=(i===0?'bold ':'')+fs+'px DM Sans,sans-serif';
      ctx.fillText(val,cx,y+rowH*0.72); cx+=colW[i]+2;
    });
    ctx.strokeStyle=C.border; ctx.lineWidth=0.3;
    ctx.beginPath(); ctx.moveTo(ox,y+rowH); ctx.lineTo(ox+totalW,y+rowH); ctx.stroke();
    y+=rowH;
  });
  ctx.restore();
  return y+Math.round(1*MM);
}

/* Map legend */
function drawGradLeg(ctx,title,colors,labels,x,y,maxW){
  const PAD=Math.round(0.7*MM),bh=Math.round(0.6*MM),boxH=PAD*2+Math.round(0.8*MM)+bh+Math.round(1.2*MM);
  ctx.fillStyle=C.bg2; rr(ctx,x,y,maxW,boxH,4); ctx.fill();
  ctx.strokeStyle=C.border; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle=C.accent; ctx.font=`600 ${Math.round(0.55*MM)}px DM Sans,sans-serif`;
  ctx.fillText(title,x+PAD,y+PAD+Math.round(0.55*MM));
  const bx=x+PAD,by=y+PAD+Math.round(1*MM),bw=maxW-PAD*2;
  const grd=ctx.createLinearGradient(bx,0,bx+bw,0);
  colors.forEach((c,i)=>grd.addColorStop(i/(colors.length-1),c));
  ctx.fillStyle=grd; rr(ctx,bx,by,bw,bh,2); ctx.fill();
  ctx.fillStyle=C.txt3; ctx.font=`${Math.round(0.5*MM)}px DM Sans,sans-serif`;
  labels.forEach((l,i)=>{
    const lx=bx+i/(labels.length-1)*bw,tw=ctx.measureText(l).width;
    const ax=i===0?lx:i===labels.length-1?lx-tw:lx-tw/2;
    ctx.fillText(l,ax,by+bh+Math.round(0.9*MM));
  });
  return y+boxH+Math.round(0.8*MM);
}

function drawMapLegend(ctx,state,x,y,maxW){
  const{mode,candidates,bvWinnerCounts,candName,candColor,candAvg,candMax}=state;
  const fs=Math.round(0.7*MM),fsS=Math.round(0.55*MM),PAD=Math.round(0.7*MM),LINE=Math.round(1.3*MM);
  if(mode==='participation')return drawGradLeg(ctx,'PARTICIPATION',['#bbdefb','#64b5f6','#1e88e5','#0d47a1'],['35 %','52 %','70 %'],x,y,maxW);
  if(mode==='gd')return drawGradLeg(ctx,'GAUCHE / DROITE',['#7B1FA2','#D32F2F','#eee','#1565C0','#1A237E'],['Ext.G','50/50','Ext.D'],x,y,maxW);
  if(mode==='frag')return drawGradLeg(ctx,'FRAGMENTATION',['#00C853','#9C27B0'],['Faible','Eleve'],x,y,maxW);
  if(mode==='hlm'){
    const boxH=Math.round(3.5*MM);
    ctx.fillStyle=C.bg2; rr(ctx,x,y,maxW,boxH,4); ctx.fill();
    ctx.strokeStyle=C.border; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle=C.accent; ctx.font=`600 ${fsS}px DM Sans,sans-serif`;
    ctx.fillText('LOGEMENTS SOCIAUX',x+PAD,y+PAD+fsS);
    let bx=x+PAD; const by=y+boxH*0.72;
    [3,5,7,10].forEach(r=>{ctx.beginPath();ctx.arc(bx+r,by,r,0,Math.PI*2);ctx.fillStyle='rgba(244,143,177,0.75)';ctx.fill();bx+=r*2+4;});
    return y+boxH+Math.round(0.8*MM);
  }
  if(candName&&candColor){
    const avg=candAvg||0,max=candMax||1,bh=Math.round(0.6*MM);
    const boxH=PAD*2+Math.round(1.1*MM)+bh+Math.round(1.2*MM);
    ctx.fillStyle=C.bg2; rr(ctx,x,y,maxW,boxH,4); ctx.fill();
    ctx.strokeStyle=C.border; ctx.lineWidth=1; ctx.stroke();
    const short=candName.length>20?candName.slice(0,18)+'...':candName;
    ctx.fillStyle=C.accent; ctx.font=`600 ${fsS}px DM Sans,sans-serif`;
    ctx.fillText((short+' -- INTENSITE').toUpperCase(),x+PAD,y+PAD+fsS);
    const bx=x+PAD,by=y+PAD+Math.round(1*MM),bw=maxW-PAD*2,avgR=max>0?avg/max:0.5;
    const grd=ctx.createLinearGradient(bx,0,bx+bw,0);
    grd.addColorStop(0,'#e4e2dc');grd.addColorStop(avgR,'#b8b5ae');grd.addColorStop(1,candColor);
    ctx.fillStyle=grd; rr(ctx,bx,by,bw,bh,2); ctx.fill();
    const mx2=bx+avgR*bw;
    ctx.strokeStyle=darken(candColor,0.2);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(mx2,by-1);ctx.lineTo(mx2,by+bh+1);ctx.stroke();
    ctx.fillStyle=C.txt3;ctx.font=`${Math.round(0.5*MM)}px DM Sans,sans-serif`;
    ctx.fillText('0 %',bx,by+bh+Math.round(0.9*MM));
    ctx.fillStyle=candColor;ctx.font=`bold ${Math.round(0.5*MM)}px DM Sans,sans-serif`;
    const al='moy. '+fP(avg);ctx.fillText(al,mx2-ctx.measureText(al).width/2,by+bh+Math.round(0.9*MM));
    ctx.fillStyle=C.txt3;ctx.font=`${Math.round(0.5*MM)}px DM Sans,sans-serif`;
    const ml=fP(max);ctx.fillText(ml,bx+bw-ctx.measureText(ml).width,by+bh+Math.round(0.9*MM));
    return y+boxH+Math.round(0.8*MM);
  }
  /* Winner */
  const entries=Object.entries(bvWinnerCounts||{}).sort((a,b)=>b[1]-a[1]);
  if(!entries.length)return y;
  const boxH=PAD*2+LINE+entries.length*LINE;
  ctx.fillStyle=C.bg2; rr(ctx,x,y,maxW,boxH,4); ctx.fill();
  ctx.strokeStyle=C.border; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle=C.accent; ctx.font=`600 ${fsS}px DM Sans,sans-serif`;
  ctx.fillText('LISTE EN TETE',x+PAD,y+PAD+fsS);
  entries.forEach(([nuance,count],i)=>{
    const c=candidates.find(c=>c.nuance===nuance),col=c&&c.color||'#888';
    const iy=y+PAD+LINE+i*LINE;
    rr(ctx,x+PAD,iy,Math.round(0.8*MM),Math.round(0.8*MM),2);
    ctx.fillStyle=col; ctx.fill();
    ctx.fillStyle=C.txt; ctx.font=`${fs}px DM Sans,sans-serif`;
    const nm=(c&&c.nom||nuance).length>22?(c&&c.nom||nuance).slice(0,20)+'...':(c&&c.nom||nuance);
    ctx.fillText(nm,x+PAD+Math.round(1.1*MM),iy+Math.round(0.7*MM));
    ctx.fillStyle=C.txt3; ctx.font=`${fsS}px DM Sans,sans-serif`;
    const cs=String(count)+' BV'; ctx.fillText(cs,x+maxW-PAD-ctx.measureText(cs).width,iy+Math.round(0.7*MM));
  });
  return y+boxH+Math.round(0.8*MM);
}

/* Aggregate */
function aggregate(data,candidates){
  let ins=0,vot=0,exp=0; const vm={};
  data.forEach(row=>{ins+=row.ins||0;vot+=row.vot||0;exp+=row.exp||0;candidates.forEach(c=>{vm[c.nuance]=(vm[c.nuance]||0)+(parseInt(row[c.nuance])||0);});});
  const lists=candidates.map(c=>({...c,voix:vm[c.nuance]||0,pct:exp>0?(vm[c.nuance]||0)/exp*100:0})).sort((a,b)=>b.voix-a.voix);
  return{ins,vot,exp,part:ins>0?vot/ins*100:0,lists};
}

/* SVG to image */
function svgToImg(svgEl){
  return new Promise((res,rej)=>{
    const clone=svgEl.cloneNode(true);
    const NS='http://www.w3.org/2000/svg';
    const bg=document.createElementNS(NS,'rect');
    bg.setAttribute('width','100%');bg.setAttribute('height','100%');bg.setAttribute('fill','#ffffff');
    clone.insertBefore(bg,clone.firstChild);
    clone.querySelectorAll('text').forEach(t=>{
      const fill=t.getAttribute('fill')||'';
      if(fill==='#d4d0ca'||fill==='')t.setAttribute('fill','#1a1a1a');
      if(fill==='#706b63')t.setAttribute('fill','#7a7570');
    });
    const s=new XMLSerializer().serializeToString(clone);
    const blob=new Blob([s],{type:'image/svg+xml'});
    const url=URL.createObjectURL(blob);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);res(img);};
    img.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('SVG load failed'));};
    img.src=url;
  });
}

/* Render MAP */
async function renderMap(state,opts){
  const{w,h}=A4L;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d');
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,w,h);
  let y=M;
  if(opts.title)y=drawHeader(ctx,state,M,y);
  const legW=Math.round(50*MM);
  const mapMaxW=w-M*2-legW-Math.round(4*MM);
  const mapMaxH=h-y-M-(opts.sources?Math.round(6*MM):0);
  const mc=state.mapCanvas;
  if(mc&&mc.width&&mc.height){
    const scale=Math.min(mapMaxW/mc.width,mapMaxH/mc.height);
    const dw=Math.round(mc.width*scale),dh=Math.round(mc.height*scale);
    ctx.shadowColor='rgba(0,0,0,0.1)';ctx.shadowBlur=Math.round(2*MM);
    ctx.fillStyle=C.border;ctx.fillRect(M,y,dw,dh);ctx.shadowColor='transparent';
    ctx.drawImage(mc,M,y,dw,dh);
    ctx.strokeStyle=C.border2;ctx.lineWidth=1;ctx.strokeRect(M,y,dw,dh);
    if(opts.legend){const lx=M+dw+Math.round(4*MM);drawMapLegend(ctx,state,lx,y,legW);}
  }
  if(opts.sources)drawSources(ctx,"Ministere de l'Interieur - Ville de Villejuif - RPLS (SDES)",w,h-M);
  return c;
}

/* Render PANEL */
async function renderPanel(state,opts){
  const{w,h}=A4P; const cw=w-M*2;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d');
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,w,h);
  let y=M;
  if(opts.title)y=drawHeader(ctx,state,M,y);
  const{ins,part,lists,exp}=aggregate(state.data,state.candidates);
  y=drawKPIs(ctx,ins,part,M,y,cw);
  y+=Math.round(0.5*MM);
  y=drawBalance(ctx,lists,exp,M,y,cw);
  y+=Math.round(0.5*MM);
  y=drawBars(ctx,lists,exp,M,y,cw);
  if(opts.table&&y<h-Math.round(40*MM)){y+=Math.round(2*MM);y=drawTable(ctx,state.data,state.candidates,M,y,cw);}
  if(opts.sources)drawSources(ctx,"Ministere de l'Interieur - Ville de Villejuif",w,h-M);
  return c;
}

/* Render EVOL */
async function renderEvol(state,opts){
  const{w,h}=A4L;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d');
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,w,h);
  let y=M;
  if(opts.title){
    const elA=state.evolElA,elB=state.evolElB;
    const el={label:[elA&&elA.label,elB&&elB.label].filter(Boolean).join(' -> '),date:''};
    y=drawHeader(ctx,{modeLabel:'Evolutions - flux de vote',election:el},M,y);
  }
  const svgEl=document.getElementById('sk-svg');
  if(svgEl&&svgEl.children.length>0){
    try{
      const img=await svgToImg(svgEl);
      const avW=w-M*2,avH=h-y-M-(opts.sources?Math.round(6*MM):0);
      const scale=Math.min(avW/img.naturalWidth,avH/img.naturalHeight);
      const dw=Math.round(img.naturalWidth*scale),dh=Math.round(img.naturalHeight*scale);
      ctx.shadowColor='rgba(0,0,0,0.08)';ctx.shadowBlur=Math.round(1.5*MM);
      ctx.fillStyle=C.bg2;rr(ctx,M,y,dw,dh,4);ctx.fill();ctx.shadowColor='transparent';
      ctx.drawImage(img,M,y,dw,dh);
      ctx.strokeStyle=C.border;ctx.lineWidth=1;ctx.strokeRect(M,y,dw,dh);
    }catch(e){
      ctx.fillStyle=C.txt3;ctx.font=`${Math.round(0.8*MM)}px DM Sans,sans-serif`;
      ctx.fillText('Erreur de rendu du diagramme Sankey.',M,y+Math.round(5*MM));
    }
  }else{
    ctx.fillStyle=C.txt3;ctx.font=`${Math.round(0.8*MM)}px DM Sans,sans-serif`;
    ctx.fillText("Affichez d'abord la vue Evolutions puis exportez.",M,y+Math.round(5*MM));
  }
  if(opts.sources)drawSources(ctx,"Ministere de l'Interieur - Ville de Villejuif - OLS ecologique",w,h-M);
  return c;
}

/* Modal */
const CSS=`
#xp-modal{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);align-items:center;justify-content:center}
#xp-modal.vis{display:flex}
#xp-box{background:#1a1b1f;border:1px solid rgba(255,255,255,.14);border-radius:12px;width:370px;max-width:95vw;box-shadow:0 16px 64px rgba(0,0,0,.6);font-family:'DM Sans',-apple-system,sans-serif;overflow:hidden}
#xp-hdr{padding:14px 18px 12px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;justify-content:space-between}
#xp-hdr h3{font-size:13px;font-weight:700;color:#fff}
#xp-close{background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;font-size:16px;padding:2px 4px;line-height:1;transition:color .15s}
#xp-close:hover{color:#fff}
#xp-body{padding:13px 18px}
.xp-sec{margin-bottom:12px}
.xp-st{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#b8282e;margin-bottom:7px}
.xp-vrow{display:flex;gap:5px;flex-wrap:wrap}
.xp-vbtn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:5px;padding:5px 11px;font-size:11px;font-weight:600;color:rgba(255,255,255,.5);cursor:pointer;font-family:inherit;transition:all .2s}
.xp-vbtn:hover{background:rgba(255,255,255,.09);color:rgba(255,255,255,.8)}
.xp-vbtn.active{background:rgba(184,40,46,.15);border-color:#b8282e;color:#fff}
.xp-ck{display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer;font-size:12px;color:rgba(255,255,255,.65);user-select:none;transition:color .15s}
.xp-ck:hover{color:#fff}
.xp-ck input{width:13px;height:13px;cursor:pointer;flex-shrink:0;accent-color:#b8282e}
#xp-fn{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:5px;padding:6px 10px;font-size:11px;font-family:inherit;color:rgba(255,255,255,.55);margin-top:7px}
#xp-fn:focus{outline:none;border-color:#b8282e}
#xp-foot{padding:11px 18px;border-top:1px solid rgba(255,255,255,.06);display:flex;gap:8px;align-items:center}
.xp-fb{flex:1;padding:9px;border-radius:5px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .2s;letter-spacing:.3px}
.xp-fb:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.22);color:#fff}
.xp-fb:disabled{opacity:.3;cursor:not-allowed}
.xp-fb.png{color:#64b5f6}.xp-fb.pdf{color:#ef9a9a}
#xp-prog{font-size:10px;color:rgba(255,255,255,.4);text-align:center;flex:1;display:none}
`;

const HTML=`<style>${CSS}</style>
<div id="xp-modal">
  <div id="xp-box">
    <div id="xp-hdr"><h3>Exporter</h3><button id="xp-close" onclick="XP.close()">&#x2715;</button></div>
    <div id="xp-body">
      <div class="xp-sec">
        <div class="xp-st">Vue a exporter</div>
        <div class="xp-vrow">
          <button class="xp-vbtn" data-v="map"   onclick="XP.setView(this)">Carte</button>
          <button class="xp-vbtn" data-v="panel" onclick="XP.setView(this)">Resultats</button>
          <button class="xp-vbtn" data-v="evol"  onclick="XP.setView(this)">Evolutions</button>
        </div>
      </div>
      <div class="xp-sec">
        <div class="xp-st">Inclure</div>
        <label class="xp-ck"><input type="checkbox" id="xp-title"   checked> Titre et election</label>
        <label class="xp-ck"><input type="checkbox" id="xp-legend"  checked> Legende</label>
        <label class="xp-ck"><input type="checkbox" id="xp-sources" checked> Sources</label>
        <label class="xp-ck" id="xp-table-row"><input type="checkbox" id="xp-table"> Tableau donnees brutes</label>
      </div>
      <div class="xp-sec">
        <div class="xp-st">Fichier</div>
        <input id="xp-fn" type="text" spellcheck="false">
      </div>
    </div>
    <div id="xp-foot">
      <span id="xp-prog"></span>
      <button class="xp-fb png" onclick="XP.run('png')">&#x2B07; PNG</button>
      <button class="xp-fb pdf" onclick="XP.run('pdf')">&#x2B07; PDF</button>
    </div>
  </div>
</div>`;

/* Public API */
window.XP={
  _view:'map',
  init(){document.body.insertAdjacentHTML('beforeend',HTML);},
  setView(btn){
    document.querySelectorAll('.xp-vbtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); this._view=btn.dataset.v;
    document.getElementById('xp-table-row').style.display=this._view==='evol'?'none':'flex';
    this._updateFilename();
  },
  _updateFilename(){
    const state=window._exportGetState&&window._exportGetState()||{};
    const el=state.election||{};
    const date=(el.date||'').replace(/\//g,'-');
    const mslug=(state.modeSlug||'').replace(/[^a-z0-9]/gi,'_');
    const vslug={map:'carte',panel:'resultats',evol:'evolutions'}[this._view]||'export';
    document.getElementById('xp-fn').value='villejuif_'+vslug+'_'+mslug+'_'+(date||'2026');
  },
  open(){
    const state=window._exportGetState&&window._exportGetState()||{};
    const autoView=state.mode==='evol'?'evol':'map';
    document.querySelectorAll('.xp-vbtn').forEach(b=>b.classList.toggle('active',b.dataset.v===autoView));
    this._view=autoView;
    document.getElementById('xp-table-row').style.display=autoView==='evol'?'none':'flex';
    this._updateFilename();
    document.getElementById('xp-modal').classList.add('vis');
  },
  close(){document.getElementById('xp-modal').classList.remove('vis');},
  async run(fmt){
    const btns=document.querySelectorAll('.xp-fb'),prog=document.getElementById('xp-prog');
    btns.forEach(b=>b.disabled=true); prog.style.display='block'; prog.textContent='Preparation...';
    try{
      const state=window._exportGetState&&window._exportGetState()||{};
      const opts={
        title:document.getElementById('xp-title').checked,
        legend:document.getElementById('xp-legend').checked,
        sources:document.getElementById('xp-sources').checked,
        table:document.getElementById('xp-table').checked,
      };
      const fname=(document.getElementById('xp-fn').value||'villejuif_export')+'.'+fmt;
      prog.textContent='Rendu en cours...';
      let canvas;
      if(this._view==='map')canvas=await renderMap(state,opts);
      else if(this._view==='panel')canvas=await renderPanel(state,opts);
      else canvas=await renderEvol(state,opts);
      if(!canvas){prog.textContent='Erreur.';return;}
      if(fmt==='png'){
        canvas.toBlob(blob=>{
          const a=document.createElement('a');
          a.href=URL.createObjectURL(blob);a.download=fname;a.click();
          setTimeout(()=>URL.revokeObjectURL(a.href),5000);
          prog.textContent='PNG exporte';
          setTimeout(()=>{prog.style.display='none';btns.forEach(b=>b.disabled=false);},2000);
        },'image/png');
      }else{
        prog.textContent='Generation PDF A4...';
        const{jsPDF}=window.jspdf;
        const orientation=this._view==='panel'?'p':'l';
        const pdf=new jsPDF({orientation,unit:'px',format:[canvas.width,canvas.height],hotfixes:['px_scaling']});
        pdf.addImage(canvas.toDataURL('image/jpeg',0.93),'JPEG',0,0,canvas.width,canvas.height,'','FAST');
        pdf.save(fname);
        prog.textContent='PDF exporte';
        setTimeout(()=>{prog.style.display='none';btns.forEach(b=>b.disabled=false);},2000);
      }
    }catch(err){
      console.error('XP.run',err);
      prog.textContent='Erreur: '+err.message;
      setTimeout(()=>{prog.style.display='none';btns.forEach(b=>b.disabled=false);},4000);
    }
  }
};

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>XP.init());}
else{XP.init();}

})();
