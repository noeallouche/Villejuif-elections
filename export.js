/**
 * export.js — Villejuif Élections · moteur d'export
 * Canvas 2D natif, fond blanc, A4 @ 150 dpi
 * B1 (barres) si >3 candidats, B2 (donut) si ≤3
 */
(function () {
'use strict';

/* ── A4 @ 150 dpi ───────────────────────────────────────────────────────── */
const DPI = 150, MM = DPI / 25.4, PT = DPI / 72;
const A4L = { w: Math.round(297*MM), h: Math.round(210*MM) }; // paysage
const A4P = { w: Math.round(210*MM), h: Math.round(297*MM) }; // portrait
const MAR = Math.round(12*MM);  // marge

/* ── Palette blanc ──────────────────────────────────────────────────────── */
const BG   = '#ffffff';
const BG2  = '#f6f5f2';
const BG3  = '#eeedea';
const BORD = '#dddbd6';
const BORD2= '#c8c6c0';
const TXT  = '#111111';
const TXT2 = '#3a3830';
const TXT3 = '#7a7570';
const ACC  = '#b8282e';

/* ── Utilitaires ────────────────────────────────────────────────────────── */
const fP = v => (+v).toFixed(1).replace('.', ',') + '\u202f%';
const fN = v => Math.round(+v).toLocaleString('fr-FR');

function hRGB(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function lighten(h, t){ const[r,g,b]=hRGB(h); return `rgb(${Math.round(r+(255-r)*t)},${Math.round(g+(255-g)*t)},${Math.round(b+(255-b)*t)})`; }
function alpha(h, a){ const[r,g,b]=hRGB(h); return `rgba(${r},${g},${b},${a})`; }

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

function mkCanvas(w, h){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* ── En-tête commun ─────────────────────────────────────────────────────── */
function drawHeader(ctx, election, modeLabel, canvasW){
  const x = MAR, y = MAR;
  // Filet rouge vertical
  ctx.fillStyle = ACC;
  ctx.fillRect(x, y, 4, Math.round(9*MM));
  // "Villejuif"
  ctx.fillStyle = TXT;
  ctx.font = `bold ${Math.round(16*PT)}px DM Sans,sans-serif`;
  ctx.fillText('Villejuif', x+Math.round(10*PT), y+Math.round(5*MM));
  const vw = ctx.measureText('Villejuif').width;
  // "élections" en italique rouge
  ctx.fillStyle = ACC;
  ctx.font = `italic bold ${Math.round(16*PT)}px Cormorant Garamond,Georgia,serif`;
  ctx.fillText('\u00e9lections', x+Math.round(10*PT)+vw, y+Math.round(5*MM));
  // Sous-titre
  ctx.fillStyle = TXT3;
  ctx.font = `${Math.round(9*PT)}px DM Sans,sans-serif`;
  const sub = [modeLabel, election.label, election.date].filter(Boolean).join('  \u00b7  ');
  ctx.fillText(sub, x+Math.round(10*PT), y+Math.round(8*MM));
  // Filet séparateur
  const lineY = y + Math.round(11*MM);
  ctx.strokeStyle = BORD; ctx.lineWidth = 0.75;
  ctx.beginPath(); ctx.moveTo(x, lineY); ctx.lineTo(canvasW-MAR, lineY); ctx.stroke();
  return lineY + Math.round(4*MM);
}

/* ── Pied de page sources ────────────────────────────────────────────────── */
function drawFooter(ctx, text, canvasW, canvasH){
  const y = canvasH - MAR;
  ctx.strokeStyle = BORD; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(MAR, y-Math.round(10*PT)); ctx.lineTo(canvasW-MAR, y-Math.round(10*PT)); ctx.stroke();
  ctx.fillStyle = TXT3;
  ctx.font = `${Math.round(7*PT)}px DM Sans,sans-serif`;
  ctx.fillText('Sources\u202f: ' + text, MAR, y);
  ctx.fillText('Observatoire \u00e9lectoral \u00b7 Villejuif', canvasW-MAR-ctx.measureText('Observatoire \u00e9lectoral \u00b7 Villejuif').width, y);
}

/* ── Agrégation ────────────────────────────────────────────────────────── */
function aggregate(data, candidates){
  let ins=0, vot=0, exp=0;
  const vm = {};
  data.forEach(row => {
    ins += +(row.ins||0); vot += +(row.vot||0); exp += +(row.exp||0);
    candidates.forEach(c => { vm[c.nuance] = (vm[c.nuance]||0) + (parseInt(row[c.nuance])||0); });
  });
  const lists = candidates
    .map(c => ({ ...c, voix: vm[c.nuance]||0, pct: exp>0 ? (vm[c.nuance]||0)/exp*100 : 0 }))
    .sort((a,b) => b.voix - a.voix);
  return { ins, vot, exp, part: ins>0 ? vot/ins*100 : 0, lists };
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDU A — CARTE
══════════════════════════════════════════════════════════════════════════ */
async function renderMap(state, opts){
  const { w, h } = A4L;
  const c = mkCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = BG; ctx.fillRect(0,0,w,h);

  let y = MAR;
  if(opts.title) y = drawHeader(ctx, state.election||{}, state.modeLabel||'Carte', w);

  const legW  = Math.round(52*MM);
  const legX  = w - MAR - legW;
  const mapX  = MAR;
  const mapW  = legX - MAR - Math.round(4*MM);
  const mapH  = h - y - MAR - (opts.sources ? Math.round(5*MM) : 0);

  /* Carte */
  const mc = state.mapCanvas;
  let mapDrawH = mapH;
  if(mc && mc.width && mc.height){
    const scale = Math.min(mapW/mc.width, mapH/mc.height);
    const dw = Math.round(mc.width*scale), dh = Math.round(mc.height*scale);
    mapDrawH = dh;
    // Ombre légère
    ctx.shadowColor = 'rgba(0,0,0,0.10)'; ctx.shadowBlur = Math.round(1.5*MM);
    ctx.fillStyle = BORD; roundRect(ctx, mapX, y, dw, dh, 4); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.drawImage(mc, mapX, y, dw, dh);
    ctx.strokeStyle = BORD2; ctx.lineWidth = 0.75;
    roundRect(ctx, mapX, y, dw, dh, 4); ctx.stroke();
  } else {
    ctx.fillStyle = BG3; roundRect(ctx, mapX, y, mapW, mapH, 4); ctx.fill();
    ctx.fillStyle = TXT3; ctx.font = `${Math.round(10*PT)}px DM Sans,sans-serif`;
    ctx.fillText('Carte non disponible', mapX+Math.round(2*MM), y+Math.round(4*MM));
  }

  /* Légende à droite */
  if(opts.legend){
    let ly = y;
    ly = drawMapLegend(ctx, state, legX, ly, legW);
    ly += Math.round(2*MM);
    ly = drawStatBox(ctx, state, legX, ly, legW);
  }

  if(opts.sources) drawFooter(ctx, "Minist\u00e8re de l'Int\u00e9rieur \u00b7 Ville de Villejuif \u00b7 RPLS (SDES)", w, h);
  return c;
}

/* Boîte statistiques rapides */
function drawStatBox(ctx, state, x, y, w){
  const { ins, vot, part, exp } = aggregate(state.data||[], state.candidates||[]);
  const rows = [
    ['Inscrits', fN(ins)],
    ['Participation', fP(part)],
    ['Exprim\u00e9s', fN(exp)],
  ];
  const rowH = Math.round(4*MM), pad = Math.round(2.2*MM);
  const boxH = pad*2 + Math.round(3*MM) + rows.length*rowH;
  ctx.fillStyle = BG2; roundRect(ctx,x,y,w,boxH,4); ctx.fill();
  ctx.strokeStyle = BORD; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.fillStyle = ACC; ctx.font = `600 ${Math.round(7*PT)}px DM Sans,sans-serif`;
  ctx.fillText('CHIFFRES CL\u00c9S', x+pad, y+pad+Math.round(7*PT));
  rows.forEach(([lbl,val],i)=>{
    const ry = y+pad+Math.round(3*MM)+i*rowH;
    if(i>0){ ctx.strokeStyle=BORD; ctx.lineWidth=0.4; ctx.beginPath(); ctx.moveTo(x+pad,ry); ctx.lineTo(x+w-pad,ry); ctx.stroke(); }
    ctx.fillStyle=TXT3; ctx.font=`${Math.round(8*PT)}px DM Sans,sans-serif`; ctx.fillText(lbl, x+pad, ry+Math.round(10*PT));
    ctx.fillStyle=TXT; ctx.font=`500 ${Math.round(9*PT)}px DM Sans,sans-serif`;
    ctx.fillText(val, x+w-pad-ctx.measureText(val).width, ry+Math.round(10*PT));
  });
  return y+boxH+Math.round(1*MM);
}

/* Légende selon mode */
function drawMapLegend(ctx, state, x, y, maxW){
  const { mode, candidates, bvWinnerCounts, candName, candColor, candAvg, candMax } = state;
  const pad = Math.round(2.2*MM), lineH = Math.round(4*MM);
  const fsT = Math.round(7*PT), fsL = Math.round(9*PT);

  function gradBox(title, colors, labels){
    const bh = Math.round(8*PT), boxH = pad*2 + Math.round(3*MM) + bh + Math.round(12*PT);
    ctx.fillStyle=BG2; roundRect(ctx,x,y,maxW,boxH,4); ctx.fill();
    ctx.strokeStyle=BORD; ctx.lineWidth=0.5; ctx.stroke();
    ctx.fillStyle=ACC; ctx.font=`600 ${fsT}px DM Sans,sans-serif`;
    ctx.fillText(title, x+pad, y+pad+fsT);
    const bx=x+pad, by=y+pad+Math.round(1*MM), bw=maxW-pad*2;
    const grd=ctx.createLinearGradient(bx,0,bx+bw,0);
    colors.forEach((col,i)=>grd.addColorStop(i/(colors.length-1),col));
    ctx.fillStyle=grd; roundRect(ctx,bx,by,bw,bh,2); ctx.fill();
    ctx.fillStyle=TXT3; ctx.font=`${Math.round(7*PT)}px DM Sans,sans-serif`;
    labels.forEach((l,i)=>{
      const lx=bx+i/(labels.length-1)*bw, tw=ctx.measureText(l).width;
      ctx.fillText(l, i===0?lx:i===labels.length-1?lx-tw:lx-tw/2, by+bh+Math.round(10*PT));
    });
    y += boxH + Math.round(1.5*MM);
  }

  if(mode==='participation'){ gradBox('PARTICIPATION',['#bbdefb','#64b5f6','#1e88e5','#0d47a1'],['35 %','52 %','70 %']); return y; }
  if(mode==='gd'){ gradBox('GAUCHE / DROITE',['#7B1FA2','#D32F2F','#eeeeee','#1565C0','#1A237E'],['Ext.G','50/50','Ext.D']); return y; }
  if(mode==='frag'){ gradBox('FRAGMENTATION',['#00C853','#9C27B0'],['Faible','Élev\u00e9']); return y; }

  if(candName && candColor){
    const avg=candAvg||0, max=candMax||1, bh=Math.round(8*PT);
    const boxH=pad*2+Math.round(1*MM)+bh+Math.round(12*PT);
    ctx.fillStyle=BG2; roundRect(ctx,x,y,maxW,boxH,4); ctx.fill();
    ctx.strokeStyle=BORD; ctx.lineWidth=0.5; ctx.stroke();
    const short=candName.length>20?candName.slice(0,18)+'\u2026':candName;
    ctx.fillStyle=ACC; ctx.font=`600 ${fsT}px DM Sans,sans-serif`;
    ctx.fillText((short+' \u2014 INTENSIT\u00c9').toUpperCase(), x+pad, y+pad+fsT);
    const bx=x+pad, by=y+pad+Math.round(1*MM), bw=maxW-pad*2, avgR=max>0?avg/max:0.5;
    const grd=ctx.createLinearGradient(bx,0,bx+bw,0);
    grd.addColorStop(0,'#e4e2dc'); grd.addColorStop(avgR,'#b8b5ae'); grd.addColorStop(1,candColor);
    ctx.fillStyle=grd; roundRect(ctx,bx,by,bw,bh,2); ctx.fill();
    const mx2=bx+avgR*bw;
    ctx.strokeStyle=candColor; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(mx2,by-1); ctx.lineTo(mx2,by+bh+1); ctx.stroke();
    ctx.fillStyle=TXT3; ctx.font=`${Math.round(7*PT)}px DM Sans,sans-serif`;
    ctx.fillText('0 %',bx,by+bh+Math.round(10*PT));
    ctx.fillStyle=candColor; ctx.font=`bold ${Math.round(7*PT)}px DM Sans,sans-serif`;
    const al='\u25bc moy. '+fP(avg); ctx.fillText(al,mx2-ctx.measureText(al).width/2,by+bh+Math.round(10*PT));
    ctx.fillStyle=TXT3; ctx.font=`${Math.round(7*PT)}px DM Sans,sans-serif`;
    const ml=fP(max); ctx.fillText(ml,bx+bw-ctx.measureText(ml).width,by+bh+Math.round(10*PT));
    y+=boxH+Math.round(1.5*MM);
    return y;
  }

  /* Liste en tête */
  const entries = Object.entries(bvWinnerCounts||{}).sort((a,b)=>b[1]-a[1]);
  if(!entries.length) return y;
  const boxH = pad*2 + Math.round(3*MM) + entries.length*lineH;
  ctx.fillStyle=BG2; roundRect(ctx,x,y,maxW,boxH,4); ctx.fill();
  ctx.strokeStyle=BORD; ctx.lineWidth=0.5; ctx.stroke();
  ctx.fillStyle=ACC; ctx.font=`600 ${fsT}px DM Sans,sans-serif`;
  ctx.fillText('LISTE EN T\u00caTE', x+pad, y+pad+fsT);
  entries.forEach(([nuance,count],i)=>{
    const cand = (state.candidates||[]).find(c=>c.nuance===nuance);
    const col = cand?.color||'#888';
    const iy = y+pad+Math.round(3*MM)+i*lineH;
    if(i>0){ ctx.strokeStyle=BORD; ctx.lineWidth=0.35; ctx.beginPath(); ctx.moveTo(x+pad,iy); ctx.lineTo(x+maxW-pad,iy); ctx.stroke(); }
    ctx.fillStyle=col; roundRect(ctx,x+pad,iy+Math.round(0.5*MM),Math.round(2.2*MM),Math.round(2.2*MM),2); ctx.fill();
    ctx.fillStyle=TXT; ctx.font=`${fsL}px DM Sans,sans-serif`;
    const nm=(cand?.nom||nuance).length>22?(cand?.nom||nuance).slice(0,20)+'\u2026':(cand?.nom||nuance);
    ctx.fillText(nm, x+pad+Math.round(1*MM), iy+Math.round(9*PT));
    ctx.fillStyle=TXT3; ctx.font=`${fsT}px DM Sans,sans-serif`;
    const cs=count+' BV'; ctx.fillText(cs, x+maxW-pad-ctx.measureText(cs).width, iy+Math.round(9*PT));
  });
  return y+boxH+Math.round(1.5*MM);
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDU B — RÉSULTATS
   B1 si >3 listes, B2 (donut) si ≤3
══════════════════════════════════════════════════════════════════════════ */
async function renderPanel(state, opts){
  const { w, h } = A4P;
  const c = mkCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = BG; ctx.fillRect(0,0,w,h);
  const cw = w - MAR*2;
  let y = MAR;
  if(opts.title) y = drawHeader(ctx, state.election||{}, state.modeLabel||'R\u00e9sultats', w);

  const agg = aggregate(state.data||[], state.candidates||[]);
  const { ins, vot, part, exp, lists } = agg;

  y = drawKPIs(ctx, ins, part, exp, MAR, y, cw);
  y += Math.round(2*MM);
  y = drawBalanceBar(ctx, lists, exp, MAR, y, cw);
  y += Math.round(1*MM);

  if(lists.length <= 3){
    y = drawDonut(ctx, lists, exp, ins, vot, MAR, y, cw);
  } else {
    y = drawBars(ctx, lists, exp, MAR, y, cw);
  }

  if(opts.table && y < h - Math.round(45*MM)){
    y += Math.round(2*MM);
    y = drawTable(ctx, state.data||[], state.candidates||[], MAR, y, cw);
  }

  if(opts.sources) drawFooter(ctx, "Minist\u00e8re de l'Int\u00e9rieur \u00b7 Ville de Villejuif", w, h);
  return c;
}

/* KPIs */
function drawKPIs(ctx, ins, part, exp, x, y, totalW){
  const kw = Math.floor((totalW-8)/3), kh = Math.round(10*MM), r = 4;
  const items = [
    { v: fN(ins),   l: 'Inscrits' },
    { v: fP(part),  l: 'Participation' },
    { v: fN(exp),   l: 'Exprim\u00e9s' },
  ];
  items.forEach((k,i)=>{
    const kx = x + i*(kw+4);
    ctx.fillStyle=BG2; roundRect(ctx,kx,y,kw,kh,r); ctx.fill();
    ctx.strokeStyle=BORD; ctx.lineWidth=0.5; ctx.stroke();
    ctx.fillStyle=TXT; ctx.font=`bold ${Math.round(18*PT)}px Cormorant Garamond,Georgia,serif`;
    const vw=ctx.measureText(k.v).width; ctx.fillText(k.v, kx+kw/2-vw/2, y+kh*0.56);
    ctx.fillStyle=TXT3; ctx.font=`600 ${Math.round(8*PT)}px DM Sans,sans-serif`;
    const lw=ctx.measureText(k.l).width; ctx.fillText(k.l, kx+kw/2-lw/2, y+kh*0.84);
  });
  return y+kh+Math.round(10*PT);
}

/* Barre équilibre G/D */
function drawBalanceBar(ctx, lists, exp, x, y, w){
  const bh = Math.round(8*PT);
  const blocs = [
    {key:'ex_gauche',color:'#7B1FA2'},{key:'gauche_rad',color:'#C62828'},
    {key:'gauche',color:'#EC407A'},{key:'centre',color:'#FF8F00'},
    {key:'droite',color:'#1565C0'},{key:'ex_droite',color:'#1A237E'},{key:'autre',color:'#90A4AE'}
  ];
  roundRect(ctx,x,y,w,bh,2); ctx.save(); ctx.clip();
  let bx=x;
  blocs.forEach(bl=>{
    const sum=lists.filter(l=>l.bloc===bl.key).reduce((s,l)=>s+l.voix,0);
    const sw=exp>0?sum/exp*w:0; if(sw<1)return;
    ctx.fillStyle=bl.color; ctx.fillRect(bx,y,sw,bh); bx+=sw;
  });
  ctx.restore();
  return y+bh+Math.round(2*MM);
}

/* ── B1 : Barres horizontales ────────────────────────────────────────────── */
function drawBars(ctx, lists, exp, x, y, w){
  if(!lists.length) return y;
  const hdrH = Math.round(3.5*MM), rowH = Math.round(6*MM), barH = Math.round(2*MM);
  const badgeW = Math.round(2*MM), pctW = Math.round(11*MM), voxW = Math.round(3.6*MM);
  const gap = Math.round(1.2*MM);
  const maxPct = lists[0].pct||1;
  const barAreaW = w - badgeW - pctW - voxW - gap*3;
  const fs = Math.round(9*PT), fsS = Math.round(8*PT);
  ctx.fillStyle=ACC; ctx.font=`600 ${Math.round(7*PT)}px DM Sans,sans-serif`;
  ctx.fillText('R\u00c9SULTATS \u2014 % des exprim\u00e9s', x, y+Math.round(8*PT));
  y += hdrH + Math.round(1.5*MM);
  lists.forEach((l,i)=>{
    const ry = y + i*(rowH + Math.round(1*MM));
    if(i>0){ ctx.strokeStyle=BORD; ctx.lineWidth=0.4; ctx.beginPath(); ctx.moveTo(x,ry); ctx.lineTo(x+w,ry); ctx.stroke(); }
    const mid = ry + rowH*0.55;
    // Badge
    ctx.fillStyle=lighten(l.color,0.78); roundRect(ctx,x,ry+rowH*0.12,badgeW,rowH*0.72,2); ctx.fill();
    ctx.fillStyle=l.color; ctx.font=`bold ${Math.round(7*PT)}px DM Sans,sans-serif`;
    const bw=ctx.measureText(l.nuance).width; ctx.fillText(l.nuance, x+badgeW/2-bw/2, mid);
    // Nom
    const nx = x + badgeW + gap;
    const nmFull = l.nom;
    ctx.fillStyle=TXT; ctx.font=`${fs}px DM Sans,sans-serif`;
    // truncate if too long
    let nm = nmFull;
    while(nm.length>3 && ctx.measureText(nm).width > barAreaW*0.38) nm=nm.slice(0,-1);
    if(nm!==nmFull) nm=nm.trim()+'\u2026';
    ctx.fillText(nm, nx, mid);
    // Barre large
    const barX = nx + barAreaW*0.42, barY = ry + (rowH-barH)/2;
    const barW2 = barAreaW*0.56;
    ctx.fillStyle=BG3; roundRect(ctx,barX,barY,barW2,barH,2); ctx.fill();
    // Zone colorée avec label voix dedans
    const filled = barW2 * l.pct/maxPct;
    ctx.fillStyle=l.color; roundRect(ctx,barX,barY,filled,barH,2); ctx.fill();
    if(filled > Math.round(2*MM)){
      ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.font=`bold ${Math.round(7*PT)}px DM Sans,sans-serif`;
      ctx.fillText(fN(l.voix), barX+Math.round(1.5*MM), barY+barH*0.72);
    }
    // Pct
    const px2 = x+w-voxW-gap;
    ctx.fillStyle=l.color; ctx.font=`bold ${Math.round(12*PT)}px Cormorant Garamond,Georgia,serif`;
    const pctStr=fP(l.pct); ctx.fillText(pctStr, px2-ctx.measureText(pctStr).width, mid+Math.round(0.5*MM));
    // Voix si pas dans barre
    if(filled <= Math.round(2*MM)){
      ctx.fillStyle=TXT3; ctx.font=`${fsS}px DM Sans,sans-serif`;
      ctx.fillText(fN(l.voix), x+w-ctx.measureText(fN(l.voix)).width, mid);
    }
  });
  return y + lists.length*(rowH+Math.round(1*MM)) + Math.round(1*MM);
}

/* ── B2 : Donut + tableau (≤3 candidats) ───────────────────────────────── */
function drawDonut(ctx, lists, exp, ins, vot, x, y, w){
  const donutSize = Math.round(50*MM);
  const donutR    = donutSize/2;
  const innerR    = donutR * 0.48;
  const cx2       = x + donutR;
  const cy2       = y + donutR + Math.round(1*MM);
  const tableX    = x + donutSize + Math.round(5*MM);
  const tableW    = w - donutSize - Math.round(5*MM);

  // Dessin du donut
  let startAngle = -Math.PI/2;
  lists.forEach(l=>{
    const sweep = exp>0 ? l.voix/exp * 2*Math.PI : 0;
    ctx.beginPath();
    ctx.moveTo(cx2, cy2);
    ctx.arc(cx2, cy2, donutR, startAngle, startAngle+sweep);
    ctx.closePath();
    ctx.fillStyle = l.color; ctx.fill();
    startAngle += sweep;
  });
  // Trou
  ctx.beginPath(); ctx.arc(cx2, cy2, innerR, 0, 2*Math.PI);
  ctx.fillStyle = BG; ctx.fill();
  // Label centre
  ctx.fillStyle = TXT; ctx.font = `bold ${Math.round(14*PT)}px Cormorant Garamond,Georgia,serif`;
  const ev = fN(exp); ctx.fillText(ev, cx2-ctx.measureText(ev).width/2, cy2+Math.round(1*MM));
  ctx.fillStyle = TXT3; ctx.font = `${Math.round(7*PT)}px DM Sans,sans-serif`;
  const el2 = 'exprim\u00e9s'; ctx.fillText(el2, cx2-ctx.measureText(el2).width/2, cy2+Math.round(4*MM));

  // Tableau résultats
  const hdrH = Math.round(12*PT), rowH = Math.round(6*MM);
  const colW1=tableW*0.50, colW2=tableW*0.25, colW3=tableW*0.25;
  // En-tête tableau
  ctx.fillStyle=ACC; roundRect(ctx,tableX,y,tableW,hdrH,3); ctx.fill();
  ctx.fillStyle='#fff'; ctx.font=`bold ${Math.round(7*PT)}px DM Sans,sans-serif`;
  ctx.fillText('Candidat', tableX+Math.round(1.5*MM), y+hdrH*0.72);
  ctx.fillText('%', tableX+colW1+colW2-ctx.measureText('%').width, y+hdrH*0.72);
  ctx.fillText('Voix', tableX+tableW-ctx.measureText('Voix').width-Math.round(1.5*MM), y+hdrH*0.72);
  let ry2 = y+hdrH;
  lists.forEach((l,i)=>{
    ctx.fillStyle = i%2===0?BG:BG2; ctx.fillRect(tableX,ry2,tableW,rowH);
    const mid2 = ry2+rowH*0.62;
    // Carré couleur
    ctx.fillStyle=l.color; roundRect(ctx,tableX+Math.round(1.2*MM),ry2+rowH*0.18,Math.round(9*PT),Math.round(9*PT),1); ctx.fill();
    // Nom
    ctx.fillStyle=TXT; ctx.font=`${Math.round(9*PT)}px DM Sans,sans-serif`;
    let nm=l.nom; while(nm.length>3&&ctx.measureText(nm).width>colW1-Math.round(1.5*MM)) nm=nm.slice(0,-1);
    if(nm!==l.nom) nm=nm.trim()+'\u2026';
    ctx.fillText(nm, tableX+Math.round(14*PT), mid2);
    // Badge nuance
    ctx.fillStyle=lighten(l.color,0.78); roundRect(ctx,tableX+Math.round(14*PT)+ctx.measureText(nm).width+Math.round(1.5*MM),ry2+rowH*0.2,Math.round(1.5*MM),rowH*0.55,2); ctx.fill();
    ctx.fillStyle=l.color; ctx.font=`bold ${Math.round(7*PT)}px DM Sans,sans-serif`;
    ctx.fillText(l.nuance, tableX+Math.round(14*PT)+ctx.measureText(nm).width+Math.round(7*PT), mid2);
    // Pct
    ctx.fillStyle=l.color; ctx.font=`bold ${Math.round(12*PT)}px Cormorant Garamond,Georgia,serif`;
    const ps=fP(l.pct); ctx.fillText(ps, tableX+colW1+colW2-ctx.measureText(ps).width, mid2+Math.round(0.1*MM));
    // Voix
    ctx.fillStyle=TXT3; ctx.font=`${Math.round(8*PT)}px DM Sans,sans-serif`;
    const vs=fN(l.voix); ctx.fillText(vs, tableX+tableW-ctx.measureText(vs).width-Math.round(1.2*MM), mid2);
    // Séparateur
    ctx.strokeStyle=BORD; ctx.lineWidth=0.4;
    ctx.beginPath(); ctx.moveTo(tableX,ry2+rowH); ctx.lineTo(tableX+tableW,ry2+rowH); ctx.stroke();
    ry2+=rowH;
  });

  // Barre participation sous le tableau
  ry2 += Math.round(4*MM);
  const bw2 = tableW, bh2 = Math.round(7*PT);
  const partFrac = ins>0?vot/ins:0;
  ctx.fillStyle=TXT3; ctx.font=`${Math.round(8*PT)}px DM Sans,sans-serif`;
  ctx.fillText('Participation', tableX, ry2);
  ctx.fillStyle=TXT; ctx.font=`500 ${Math.round(8*PT)}px DM Sans,sans-serif`;
  const pv=fP(partFrac*100); ctx.fillText(pv, tableX+bw2-ctx.measureText(pv).width, ry2);
  ry2+=Math.round(10*PT);
  ctx.fillStyle=BG3; roundRect(ctx,tableX,ry2,bw2,bh2,2); ctx.fill();
  ctx.fillStyle=ACC; roundRect(ctx,tableX,ry2,bw2*partFrac,bh2,2); ctx.fill();

  const endY = Math.max(cy2+donutR+Math.round(2*MM), ry2+bh2+Math.round(2*MM));
  return endY;
}

/* ── Tableau données brutes ─────────────────────────────────────────────── */
function drawTable(ctx, data, candidates, x, y, w){
  if(!data||!data.length) return y;
  ctx.fillStyle=ACC; ctx.font=`600 ${Math.round(8*PT)}px DM Sans,sans-serif`;
  ctx.fillText('DONN\u00c9ES BRUTES PAR BUREAU DE VOTE', x, y+Math.round(2.2*MM));
  y += Math.round(5*MM);

  const fixCols=['BV','Inscrits','Votants','Part.%','Expr.'];
  const fixW=[Math.round(4*MM),Math.round(2.3*MM),Math.round(2.3*MM),Math.round(1.9*MM),Math.round(2.2*MM)];
  const fixTot=fixW.reduce((a,b)=>a+b,0)+fixCols.length*2;
  const candW=Math.max(Math.round(6*MM),Math.floor((w-fixTot)/candidates.length-2));
  const colW=[...fixW,...candidates.map(()=>candW)];
  const allCols=[...fixCols,...candidates.map(c=>c.nuance)];
  const totalW=colW.reduce((a,b)=>a+b,0)+allCols.length*2;
  const scale=Math.min(1, w/totalW);
  const rowH=Math.round(3.5*MM), hdrH=Math.round(12*PT), fs=Math.round(7*PT);

  ctx.save();
  ctx.translate(x, 0); ctx.scale(scale, 1);
  const ox=0;
  ctx.fillStyle=ACC; roundRect(ctx,ox,y,totalW,hdrH,3); ctx.fill();
  let cx=ox+2;
  allCols.forEach((col,i)=>{
    ctx.fillStyle='#fff'; ctx.font=`bold ${fs}px DM Sans,sans-serif`;
    ctx.fillText(col, cx, y+hdrH*0.72); cx+=colW[i]+2;
  });
  y+=hdrH;
  data.slice().sort((a,b)=>parseInt(a.bv)-parseInt(b.bv)).forEach((row,ri)=>{
    ctx.fillStyle=ri%2===0?BG:BG2; ctx.fillRect(ox,y,totalW,rowH);
    const part=row.ins>0?((row.vot||0)/(row.ins||1)*100).toFixed(1):'--';
    const vals=[
      String(parseInt(row.bv)).padStart(2,'0'), fN(row.ins||0), fN(row.vot||0), part, fN(row.exp||0),
      ...candidates.map(c=>{const v=parseInt(row[c.nuance])||0; const p=row.exp>0?(v/row.exp*100).toFixed(1):'0'; return fN(v)+' ('+p+'%)';})
    ];
    cx=ox+2;
    vals.forEach((val,i)=>{
      const cand=i>=5?candidates[i-5]:null;
      ctx.fillStyle=cand?cand.color:(i===3?'#1565C0':i===0?TXT:TXT2);
      ctx.font=(i===0?'bold ':'')+fs+'px DM Sans,sans-serif';
      ctx.fillText(val, cx, y+rowH*0.72); cx+=colW[i]+2;
    });
    ctx.strokeStyle=BORD; ctx.lineWidth=0.3;
    ctx.beginPath(); ctx.moveTo(ox,y+rowH); ctx.lineTo(ox+totalW,y+rowH); ctx.stroke();
    y+=rowH;
  });
  ctx.restore();
  return y+Math.round(1*MM);
}

/* ══════════════════════════════════════════════════════════════════════════
   RENDU C — ÉVOLUTIONS / SANKEY
══════════════════════════════════════════════════════════════════════════ */
async function renderEvol(state, opts){
  const { w, h } = A4L;
  const c = mkCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = BG; ctx.fillRect(0,0,w,h);

  const elA = state.evolElA||{}, elB = state.evolElB||{};
  let y = MAR;
  if(opts.title){
    const lbl = [elA.label, elB.label].filter(Boolean).join(' \u2192 ');
    y = drawHeader(ctx, { label: lbl, date: '' }, 'Flux de vote \u00b7 \u00c9volutions', w);
  }

  /* Récupérer le SVG Sankey */
  const svgEl = document.getElementById('sk-svg');
  const hasSankey = svgEl && svgEl.children.length > 1;

  if(hasSankey){
    await drawSankeyRebuild(ctx, svgEl, state, MAR, y, w-MAR*2, h-y-MAR-(opts.sources?Math.round(5*MM):0));
  } else {
    ctx.fillStyle=TXT3; ctx.font=`${Math.round(10*PT)}px DM Sans,sans-serif`;
    ctx.fillText("Affichez d\u2019abord la vue \u00c9volutions dans l\u2019application, puis exportez.", MAR, y+Math.round(5*MM));
  }

  if(opts.sources) drawFooter(ctx,
    "Minist\u00e8re de l'Int\u00e9rieur \u00b7 Ville de Villejuif \u00b7 M\u00e9thode\u202f: OLS \u00e9cologique",
    w, h);

  /* Note méthodologique */
  const noteY = h - MAR - Math.round(3.5*MM);
  const noteW = w - MAR*2;
  ctx.fillStyle=BG2; roundRect(ctx,MAR,noteY,noteW,Math.round(3*MM),3); ctx.fill();
  ctx.strokeStyle=BORD; ctx.lineWidth=0.5; ctx.stroke();
  ctx.fillStyle=TXT3; ctx.font=`italic ${Math.round(7*PT)}px DM Sans,sans-serif`;
  ctx.fillText('\u26a0\ufe0f  Les flux affich\u00e9s sont des estimations statistiques (r\u00e9gression OLS \u00e9cologique sur les bureaux de vote communs),', MAR+Math.round(2*MM), noteY+Math.round(1.3*MM));
  ctx.fillText('pas des comportements individuels observ\u00e9s. Largeur des bandes \u221d volumes de transferts estim\u00e9s.', MAR+Math.round(2*MM), noteY+Math.round(2.3*MM));

  return c;
}

/* Redessine le Sankey en Canvas 2D natif, fond blanc, double-couche */
async function drawSankeyRebuild(ctx, svgEl, state, x, y, availW, availH){
  /* Extraire les données des noeuds et flux depuis l'état */
  // On reconstruit depuis _exportGetState qui expose les données brutes
  // Le SVG est utilisé uniquement pour lire les dimensions réelles
  const svgW = parseFloat(svgEl.getAttribute('width'))||900;
  const svgH = parseFloat(svgEl.getAttribute('height'))||580;

  // Approche: rasteriser le SVG avec fond blanc et le dessiner proprement
  return new Promise((resolve)=>{
    try {
      const clone = svgEl.cloneNode(true);
      const NS = 'http://www.w3.org/2000/svg';
      // Fond blanc
      const bg = document.createElementNS(NS,'rect');
      bg.setAttribute('width','100%'); bg.setAttribute('height','100%'); bg.setAttribute('fill','#ffffff');
      clone.insertBefore(bg, clone.firstChild);
      // Textes lisibles sur fond blanc
      clone.querySelectorAll('text').forEach(t=>{
        const fill = t.getAttribute('fill')||'';
        if(!fill||fill==='#d4d0ca'||fill==='rgba(255,255,255,0.8)') t.setAttribute('fill','#1a1a1a');
        if(fill==='#706b63') t.setAttribute('fill','#6a6560');
        if(fill==='#b8282e') t.setAttribute('fill','#b8282e');
      });
      // Chemins Bezier (flux) : rendre plus lisibles sur blanc
      clone.querySelectorAll('path').forEach(p=>{
        const fill = p.getAttribute('fill')||'';
        // Si c'est un gradient (flux), augmenter légèrement l'opacité
        if(fill.startsWith('url(')) p.style.opacity='0.75';
      });
      const svgStr = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([svgStr],{type:'image/svg+xml'});
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = ()=>{
        URL.revokeObjectURL(url);
        const scale = Math.min(availW/img.naturalWidth, availH/img.naturalHeight);
        const dw = Math.round(img.naturalWidth*scale);
        const dh = Math.round(img.naturalHeight*scale);
        // Fond doux
        ctx.fillStyle=BG2; roundRect(ctx,x,y,dw,dh,4); ctx.fill();
        ctx.strokeStyle=BORD; ctx.lineWidth=0.5; roundRect(ctx,x,y,dw,dh,4); ctx.stroke();
        ctx.drawImage(img, x, y, dw, dh);
        resolve();
      };
      img.onerror = ()=>{ URL.revokeObjectURL(url); resolve(); };
      img.src = url;
    } catch(e){ resolve(); }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL + API PUBLIQUE
══════════════════════════════════════════════════════════════════════════ */
const MODAL_CSS = `
#xp-ov{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);backdrop-filter:blur(5px);align-items:center;justify-content:center}
#xp-ov.vis{display:flex}
#xp-box{background:#1a1b1f;border:1px solid rgba(255,255,255,.13);border-radius:12px;width:360px;max-width:94vw;font-family:'DM Sans',-apple-system,sans-serif;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.55)}
#xp-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid rgba(255,255,255,.07)}
#xp-hdr h3{font-size:13px;font-weight:700;color:#fff;margin:0}
#xp-xl{background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;font-size:16px;padding:2px 4px;line-height:1;transition:color .15s}
#xp-xl:hover{color:#fff}
#xp-bd{padding:14px 18px}
.xs{margin-bottom:12px}
.xst{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#b8282e;margin-bottom:7px}
.xvr{display:flex;gap:5px;flex-wrap:wrap}
.xvb{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:5px;padding:5px 11px;font-size:11px;font-weight:600;color:rgba(255,255,255,.5);cursor:pointer;font-family:inherit;transition:all .2s}
.xvb:hover{color:rgba(255,255,255,.8);background:rgba(255,255,255,.08)}
.xvb.on{background:rgba(184,40,46,.15);border-color:#b8282e;color:#fff}
.xck{display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer;font-size:12px;color:rgba(255,255,255,.62);user-select:none;transition:color .15s}
.xck:hover{color:#fff}
.xck input{width:13px;height:13px;cursor:pointer;flex-shrink:0;accent-color:#b8282e}
#xp-fn{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:5px;padding:6px 10px;font-size:11px;font-family:inherit;color:rgba(255,255,255,.5);margin-top:7px;box-sizing:border-box}
#xp-fn:focus{outline:none;border-color:#b8282e}
#xp-ft{display:flex;gap:8px;align-items:center;padding:11px 18px;border-top:1px solid rgba(255,255,255,.06)}
.xfb{flex:1;padding:9px;border-radius:5px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;transition:all .2s;letter-spacing:.3px}
.xfb:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.2);color:#fff}
.xfb:disabled{opacity:.3;cursor:not-allowed}
.xfb.png{color:#64b5f6}.xfb.pdf{color:#ef9a9a}
#xp-pg{font-size:10px;color:rgba(255,255,255,.4);flex:1;text-align:center;display:none}
`;

const MODAL_HTML = `
<style>${MODAL_CSS}</style>
<div id="xp-ov">
  <div id="xp-box">
    <div id="xp-hdr"><h3>Exporter</h3><button id="xp-xl" onclick="XP.close()">&#x2715;</button></div>
    <div id="xp-bd">
      <div class="xs">
        <div class="xst">Vue &#xe0; exporter</div>
        <div class="xvr">
          <button class="xvb" data-v="map"   onclick="XP.setView(this)">&#x1F5FA; Carte</button>
          <button class="xvb" data-v="panel" onclick="XP.setView(this)">&#x1F4CA; R&#xe9;sultats</button>
          <button class="xvb" data-v="evol"  onclick="XP.setView(this)">&#x1F500; &#xc9;volutions</button>
        </div>
      </div>
      <div class="xs">
        <div class="xst">Inclure</div>
        <label class="xck"><input type="checkbox" id="xp-ti" checked> Titre &amp; &#xe9;lection</label>
        <label class="xck"><input type="checkbox" id="xp-le" checked> L&#xe9;gende</label>
        <label class="xck"><input type="checkbox" id="xp-so" checked> Sources</label>
        <label class="xck" id="xp-tb-row"><input type="checkbox" id="xp-tb"> Tableau donn&#xe9;es brutes</label>
      </div>
      <div class="xs">
        <div class="xst">Fichier</div>
        <input id="xp-fn" type="text" spellcheck="false">
      </div>
    </div>
    <div id="xp-ft">
      <span id="xp-pg"></span>
      <button class="xfb png" onclick="XP.run('png')">&#x2B07; PNG</button>
      <button class="xfb pdf" onclick="XP.run('pdf')">&#x2B07; PDF</button>
    </div>
  </div>
</div>`;

/* ── API publique ───────────────────────────────────────────────────────── */
window.XP = {
  _v: 'map',

  init(){ document.body.insertAdjacentHTML('beforeend', MODAL_HTML); },

  setView(btn){
    document.querySelectorAll('.xvb').forEach(b=>b.classList.remove('on'));
    btn.classList.add('on');
    this._v = btn.dataset.v;
    document.getElementById('xp-tb-row').style.display = this._v==='evol'?'none':'flex';
    this._fn();
  },

  _fn(){
    const s = window._exportGetState?.() || {};
    const el = s.election || {};
    const date = (el.date||'').replace(/\//g,'-');
    const ms = (s.modeSlug||'').replace(/[^a-z0-9]/gi,'_');
    const vs = {map:'carte',panel:'resultats',evol:'evolutions'}[this._v]||'export';
    document.getElementById('xp-fn').value = `villejuif_${vs}_${ms}_${date||'2026'}`;
  },

  open(){
    const s = window._exportGetState?.() || {};
    const auto = s.mode==='evol' ? 'evol' : 'map';
    document.querySelectorAll('.xvb').forEach(b=>b.classList.toggle('on', b.dataset.v===auto));
    this._v = auto;
    document.getElementById('xp-tb-row').style.display = auto==='evol'?'none':'flex';
    this._fn();
    document.getElementById('xp-ov').classList.add('vis');
  },

  close(){ document.getElementById('xp-ov').classList.remove('vis'); },

  async run(fmt){
    const btns=document.querySelectorAll('.xfb'), pg=document.getElementById('xp-pg');
    btns.forEach(b=>b.disabled=true); pg.style.display='block'; pg.textContent='Pr\u00e9paration\u2026';
    try{
      const s = window._exportGetState?.() || {};
      const opts = {
        title:  document.getElementById('xp-ti').checked,
        legend: document.getElementById('xp-le').checked,
        sources:document.getElementById('xp-so').checked,
        table:  document.getElementById('xp-tb').checked,
      };
      const fname = (document.getElementById('xp-fn').value||'villejuif_export')+'.'+fmt;
      pg.textContent = 'Rendu\u2026';
      let canvas;
      if(this._v==='map')        canvas = await renderMap(s, opts);
      else if(this._v==='panel') canvas = await renderPanel(s, opts);
      else                       canvas = await renderEvol(s, opts);
      if(!canvas){ pg.textContent='\u26a0 Erreur.'; return; }

      if(fmt==='png'){
        canvas.toBlob(blob=>{
          const a=document.createElement('a');
          a.href=URL.createObjectURL(blob); a.download=fname; a.click();
          setTimeout(()=>URL.revokeObjectURL(a.href),5000);
          pg.textContent='\u2713 PNG export\u00e9';
          setTimeout(()=>{ pg.style.display='none'; btns.forEach(b=>b.disabled=false); },2000);
        },'image/png');
      } else {
        pg.textContent='G\u00e9n\u00e9ration PDF A4\u2026';
        const { jsPDF } = window.jspdf;
        const ori = this._v==='panel'?'p':'l';
        const pdf = new jsPDF({ orientation:ori, unit:'px', format:[canvas.width,canvas.height], hotfixes:['px_scaling'] });
        pdf.addImage(canvas.toDataURL('image/jpeg',0.93),'JPEG',0,0,canvas.width,canvas.height,'','FAST');
        pdf.save(fname);
        pg.textContent='\u2713 PDF export\u00e9';
        setTimeout(()=>{ pg.style.display='none'; btns.forEach(b=>b.disabled=false); },2000);
      }
    }catch(err){
      console.error('XP',err);
      pg.textContent='\u26a0 '+err.message;
      setTimeout(()=>{ pg.style.display='none'; btns.forEach(b=>b.disabled=false); },4000);
    }
  }
};

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>XP.init());
else XP.init();

})();
