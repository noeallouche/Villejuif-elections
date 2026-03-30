/**
 * export.js — Moteur d'export Villejuif Élections
 * Rendu Canvas 2D natif sur fond blanc, format A4.
 * Référence window._exportGetState() exposé par index.html.
 */
(function() { // IIFE — isole les variables du scope global

/* ─── Constants ─────────────────────────────────────────────────────────── */
const A4_MM   = { w: 297, h: 210 };          // landscape mm
const A4_PT   = { w: 841.89, h: 595.28 };    // landscape pt (72dpi)
const A4_PORT = { w: 595.28, h: 841.89 };    // portrait pt
const PX_PER_MM = 3.7795275591;

// Palette for white-bg rendering
const C = {
  bg:        '#ffffff',
  bg2:       '#f5f5f0',
  border:    '#e0ddd8',
  border2:   '#ccc9c3',
  txt:       '#1a1a1a',
  txt2:      '#4a4540',
  txt3:      '#8a8580',
  accent:    '#b8282e',
  accentL:   '#f0d0d1',
};

/* ─── Modal HTML injection ──────────────────────────────────────────────── */
const MODAL_CSS = `
#xp-modal{display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);
  backdrop-filter:blur(6px);align-items:center;justify-content:center}
#xp-modal.vis{display:flex}
#xp-box{background:#1a1b1f;border:1px solid rgba(255,255,255,.14);border-radius:12px;
  width:380px;max-width:94vw;box-shadow:0 16px 64px rgba(0,0,0,.6);overflow:hidden;
  font-family:'DM Sans',-apple-system,sans-serif}
#xp-hdr{padding:15px 18px 13px;border-bottom:1px solid rgba(255,255,255,.08);
  display:flex;align-items:center;justify-content:space-between}
#xp-hdr h3{font-size:13px;font-weight:700;color:#fff;letter-spacing:.01em}
#xp-badge{font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;
  background:rgba(184,40,46,.15);color:#e07070;border:1px solid rgba(184,40,46,.3);
  margin-left:8px;letter-spacing:.03em}
#xp-close{background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;
  font-size:17px;padding:2px 4px;transition:color .15s}
#xp-close:hover{color:#fff}
#xp-body{padding:14px 18px}
.xp-sec{margin-bottom:13px}
.xp-sec-t{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:2px;
  color:#b8282e;margin-bottom:8px}
.xp-ck{display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer;
  font-size:12px;color:rgba(255,255,255,.7);transition:color .15s;user-select:none}
.xp-ck:hover{color:#fff}
.xp-ck input{width:13px;height:13px;cursor:pointer;flex-shrink:0;accent-color:#b8282e}
#xp-fn{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
  border-radius:5px;padding:6px 10px;font-size:11px;font-family:inherit;
  color:rgba(255,255,255,.6);margin-top:8px}
#xp-fn:focus{outline:none;border-color:#b8282e}
#xp-foot{padding:12px 18px;border-top:1px solid rgba(255,255,255,.06);
  display:flex;gap:8px;align-items:center}
.xp-fb{flex:1;padding:9px;border-radius:5px;border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.05);font-size:12px;font-weight:700;
  font-family:inherit;cursor:pointer;transition:all .2s;letter-spacing:.4px}
.xp-fb:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.25);color:#fff}
.xp-fb:disabled{opacity:.3;cursor:not-allowed}
.xp-fb.png{color:#64b5f6}
.xp-fb.pdf{color:#ef9a9a}
#xp-prog{font-size:10px;color:rgba(255,255,255,.4);flex:1;text-align:center;display:none}
`;

const MODAL_HTML = `
<style>${MODAL_CSS}</style>
<div id="xp-modal">
  <div id="xp-box">
    <div id="xp-hdr">
      <div style="display:flex;align-items:center">
        <h3>Export</h3>
        <span id="xp-badge">—</span>
      </div>
      <button id="xp-close" onclick="XP.close()">✕</button>
    </div>
    <div id="xp-body">
      <div class="xp-sec">
        <div class="xp-sec-t">Éléments à inclure</div>
        <label class="xp-ck"><input type="checkbox" id="xp-title" checked> Titre & élection</label>
        <label class="xp-ck"><input type="checkbox" id="xp-legend" checked> Légende</label>
        <label class="xp-ck"><input type="checkbox" id="xp-sources" checked> Sources</label>
        <label class="xp-ck"><input type="checkbox" id="xp-table"> Tableau données brutes</label>
      </div>
      <div class="xp-sec">
        <div class="xp-sec-t">Nom du fichier</div>
        <input id="xp-fn" type="text" spellcheck="false" placeholder="villejuif_export">
      </div>
    </div>
    <div id="xp-foot">
      <span id="xp-prog"></span>
      <button class="xp-fb png" onclick="XP.run('png')">⬇ PNG</button>
      <button class="xp-fb pdf" onclick="XP.run('pdf')">⬇ PDF</button>
    </div>
  </div>
</div>
`;

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const fP  = v => v.toFixed(1).replace('.', ',') + ' %';
const fN  = v => v.toLocaleString('fr-FR');

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

/** Lighten a hex color toward white for white-bg rendering */
function lighten(hex, t=0.5) {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${Math.round(r+(255-r)*t)},${Math.round(g+(255-g)*t)},${Math.round(b+(255-b)*t)})`;
}

/** Darken a hex color toward black */
function darken(hex, t=0.4) {
  const [r,g,b] = hexToRgb(hex);
  return `rgb(${Math.round(r*(1-t))},${Math.round(g*(1-t))},${Math.round(b*(1-t))})`;
}

/** Perceived luminance — returns readable text color (dark or light) for a bg */
function contrastText(hex) {
  const [r,g,b] = hexToRgb(hex);
  return (0.299*r + 0.587*g + 0.114*b) > 160 ? '#1a1a1a' : '#ffffff';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

/* ─── Canvas drawing primitives ─────────────────────────────────────────── */

/** Draw page header: title + election label */
function drawHeader(ctx, state, y0=0) {
  const { election, modeLabel, candName } = state;
  const x = 40;

  // Red accent bar
  ctx.fillStyle = C.accent;
  ctx.fillRect(x, y0+18, 4, 28);

  // Main title
  ctx.fillStyle = C.txt;
  ctx.font = 'bold 20px "DM Sans", sans-serif';
  ctx.fillText('Villejuif', x+14, y0+32);
  ctx.fillStyle = C.accent;
  ctx.font = 'italic bold 20px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(' élections', x+14 + ctx.measureText('Villejuif').width, y0+32);

  // Subtitle line
  ctx.fillStyle = C.txt2;
  ctx.font = '600 11px "DM Sans", sans-serif';
  const sub = [
    candName ? `Score — ${candName}` : modeLabel,
    election?.label,
    election?.date
  ].filter(Boolean).join('  ·  ');
  ctx.fillText(sub, x+14, y0+50);

  // Separator line
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y0+64); ctx.lineTo(ctx.canvas.width - x, y0+64);
  ctx.stroke();

  return y0 + 72; // returns next Y
}

/** Draw sources footer */
function drawSources(ctx, y, sourceText) {
  const W = ctx.canvas.width;
  ctx.fillStyle = C.border;
  ctx.fillRect(40, y, W-80, 1);
  ctx.fillStyle = C.txt3;
  ctx.font = '9px "DM Sans", sans-serif';
  ctx.fillText('Sources : ' + sourceText, 40, y + 14);
  ctx.fillText('Observatoire électoral · Villejuif · villejuif-elections', W - 40 - ctx.measureText('Observatoire électoral · Villejuif · villejuif-elections').width, y + 14);
}

/** Draw the map legend for current mode */
function drawMapLegend(ctx, state, x, y, maxW=220) {
  const { mode, candidates, bvWinnerCounts, candName, candColor, candAvg, candMax } = state;
  const PAD = 10, LINE = 16, R = 5;

  let items = [];

  if (mode === 'winner' && bvWinnerCounts) {
    const entries = Object.entries(bvWinnerCounts).sort((a,b)=>b[1]-a[1]);
    items = entries.map(([nuance, count]) => {
      const c = candidates.find(c=>c.nuance===nuance);
      return { color: c?.color||'#888', label: c?.nom||nuance, right: `${count} BV` };
    });
  } else if (mode === 'participation') {
    return drawGradientLegend(ctx, 'Participation', ['#bbdefb','#64b5f6','#1e88e5','#0d47a1'], ['35 %','52 %','70 %'], x, y, maxW);
  } else if (mode === 'gd') {
    return drawGradientLegend(ctx, 'Gauche / Droite',
      ['#7B1FA2','#D32F2F','#eeeeee','#1565C0','#1A237E'],
      ['Ext.G','Gauche','50/50','Droite','Ext.D'], x, y, maxW);
  } else if (mode === 'frag') {
    return drawGradientLegend(ctx, 'Fragmentation (ENP)', ['#00C853','#9C27B0'], ['Faible','Élevé'], x, y, maxW);
  } else if (mode === 'hlm') {
    return drawBubbleLegend(ctx, x, y, maxW);
  } else if (candName) {
    return drawDivergentLegend(ctx, candName, candColor, candAvg, candMax, x, y, maxW);
  }

  if (!items.length) return y;

  // Box
  const boxH = PAD*2 + 16 + items.length * LINE;
  ctx.fillStyle = C.bg2;
  roundRect(ctx, x, y, maxW, boxH, R);
  ctx.fill();
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Title
  ctx.fillStyle = C.accent;
  ctx.font = '600 9px "DM Sans", sans-serif';
  ctx.fillText('LISTE EN TÊTE', x+PAD, y+PAD+9);

  items.forEach((item, i) => {
    const iy = y + PAD + 18 + i * LINE;
    // dot
    ctx.fillStyle = item.color;
    roundRect(ctx, x+PAD, iy, 10, 10, 3);
    ctx.fill();
    // label
    ctx.fillStyle = C.txt;
    ctx.font = '11px "DM Sans", sans-serif';
    const label = item.label.length > 22 ? item.label.slice(0,21)+'…' : item.label;
    ctx.fillText(label, x+PAD+14, iy+9);
    // right count
    if (item.right) {
      ctx.fillStyle = C.txt3;
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillText(item.right, x+maxW-PAD-ctx.measureText(item.right).width, iy+9);
    }
  });

  return y + boxH + 8;
}

function drawGradientLegend(ctx, title, colors, labels, x, y, maxW) {
  const PAD=10, R=5, barH=10, boxH=54;
  ctx.fillStyle = C.bg2;
  roundRect(ctx, x, y, maxW, boxH, R); ctx.fill();
  ctx.strokeStyle = C.border; ctx.lineWidth=1; ctx.stroke();

  ctx.fillStyle = C.accent; ctx.font='600 9px "DM Sans",sans-serif';
  ctx.fillText(title.toUpperCase(), x+PAD, y+PAD+9);

  const bx=x+PAD, by=y+PAD+16, bw=maxW-PAD*2;
  const grd=ctx.createLinearGradient(bx,0,bx+bw,0);
  colors.forEach((c,i)=>grd.addColorStop(i/(colors.length-1),c));
  ctx.fillStyle=grd;
  roundRect(ctx,bx,by,bw,barH,3); ctx.fill();

  ctx.fillStyle=C.txt3; ctx.font='9px "DM Sans",sans-serif';
  labels.forEach((l,i)=>{
    const lx=bx+i/(labels.length-1)*bw;
    const tw=ctx.measureText(l).width;
    const ax=i===0?lx:i===labels.length-1?lx-tw:lx-tw/2;
    ctx.fillText(l, ax, by+barH+13);
  });
  return y+boxH+8;
}

function drawBubbleLegend(ctx, x, y, maxW) {
  const PAD=10, R=5, boxH=44;
  ctx.fillStyle=C.bg2; roundRect(ctx,x,y,maxW,boxH,R); ctx.fill();
  ctx.strokeStyle=C.border; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle=C.accent; ctx.font='600 9px "DM Sans",sans-serif';
  ctx.fillText('LOGEMENTS SOCIAUX', x+PAD, y+PAD+9);
  const sizes=[4,7,10,14];
  let bx=x+PAD, by=y+PAD+22;
  sizes.forEach(r=>{
    ctx.beginPath(); ctx.arc(bx+r,by,r,0,Math.PI*2);
    ctx.fillStyle='rgba(244,143,177,0.7)'; ctx.fill();
    bx+=r*2+5;
  });
  ctx.fillStyle=C.txt3; ctx.font='9px "DM Sans",sans-serif';
  ctx.fillText('taille ∝ nb logements', bx+4, by+4);
  return y+boxH+8;
}

function drawDivergentLegend(ctx, name, color, avg, max, x, y, maxW) {
  const PAD=10, R=5, barH=10, boxH=60;
  ctx.fillStyle=C.bg2; roundRect(ctx,x,y,maxW,boxH,R); ctx.fill();
  ctx.strokeStyle=C.border; ctx.lineWidth=1; ctx.stroke();

  const short=name.length>24?name.slice(0,22)+'…':name;
  ctx.fillStyle=C.accent; ctx.font='600 9px "DM Sans",sans-serif';
  ctx.fillText((short+'  —  INTENSITÉ').toUpperCase(), x+PAD, y+PAD+9);

  const bx=x+PAD, by=y+PAD+16, bw=maxW-PAD*2;
  const avgPct=max>0?avg/max:0.5;
  const grd=ctx.createLinearGradient(bx,0,bx+bw,0);
  grd.addColorStop(0,'#e8e6e0');
  grd.addColorStop(avgPct,'#c8c6c0');
  grd.addColorStop(1,color);
  ctx.fillStyle=grd; roundRect(ctx,bx,by,bw,barH,3); ctx.fill();

  // avg marker
  const mx=bx+avgPct*bw;
  ctx.strokeStyle=darken(color,0.2); ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(mx,by-2); ctx.lineTo(mx,by+barH+2); ctx.stroke();

  ctx.fillStyle=C.txt3; ctx.font='9px "DM Sans",sans-serif';
  ctx.fillText('0 %', bx, by+barH+13);
  ctx.fillStyle=color; ctx.font='bold 9px "DM Sans",sans-serif';
  const avgLabel='▼ '+fP(avg);
  ctx.fillText(avgLabel, mx-ctx.measureText(avgLabel).width/2, by+barH+13);
  ctx.fillStyle=C.txt3; ctx.font='9px "DM Sans",sans-serif';
  ctx.fillText(fP(max), bx+bw-ctx.measureText(fP(max)).width, by+barH+13);

  return y+boxH+8;
}

/** Draw results panel: KPIs + bars */
function drawResultsPanel(ctx, state, x, y, w) {
  const { data, candidates, election } = state;
  if (!data || !data.length) return y;

  // Aggregate
  let ins=0,vot=0,exp=0;
  const vm={};
  data.forEach(row=>{
    ins+=row.ins||0; vot+=row.vot||0; exp+=row.exp||0;
    candidates.forEach(c=>{vm[c.nuance]=(vm[c.nuance]||0)+(parseInt(row[c.nuance])||0);});
  });
  const part=ins>0?vot/ins*100:0;
  const lists=candidates.map(c=>({...c,voix:vm[c.nuance]||0,pct:exp>0?(vm[c.nuance]||0)/exp*100:0}))
    .sort((a,b)=>b.voix-a.voix);

  // KPI row
  const kpis=[
    {v:fN(ins), l:'Inscrits'},
    {v:fP(part), l:'Participation'},
    {v:fP(100-part), l:'Abstention'},
  ];
  const kw=(w-40)/3, kh=52, ky=y;
  kpis.forEach((k,i)=>{
    const kx=x+i*(kw+6);
    ctx.fillStyle=C.bg2; roundRect(ctx,kx,ky,kw,kh,6); ctx.fill();
    ctx.strokeStyle=C.border; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle=C.txt; ctx.font='bold 18px "Cormorant Garamond",Georgia,serif';
    const tw=ctx.measureText(k.v).width;
    ctx.fillText(k.v, kx+kw/2-tw/2, ky+28);
    ctx.fillStyle=C.txt3; ctx.font='600 8px "DM Sans",sans-serif';
    const lw=ctx.measureText(k.l).width;
    ctx.fillText(k.l, kx+kw/2-lw/2, ky+42);
  });

  // Balance bar
  const barY=ky+kh+12, barH=8, barX=x, barW=w;
  const blocs=[
    {key:'ex_gauche',color:'#7B1FA2'},
    {key:'gauche_rad',color:'#C62828'},
    {key:'gauche',color:'#EC407A'},
    {key:'centre',color:'#FF8F00'},
    {key:'droite',color:'#1565C0'},
    {key:'ex_droite',color:'#1A237E'},
  ];
  let bvx=barX;
  blocs.forEach(bl=>{
    const sum=lists.filter(l=>l.bloc===bl.key).reduce((s,l)=>s+l.voix,0);
    const segW=exp>0?sum/exp*barW:0;
    if(segW<1)return;
    ctx.fillStyle=bl.color; ctx.fillRect(bvx,barY,segW,barH);
    bvx+=segW;
  });
  // remainder
  const used=bvx-barX;
  if(barW-used>0){ctx.fillStyle='#aaa';ctx.fillRect(bvx,barY,barW-used,barH);}
  // corners
  roundRect(ctx,barX,barY,barW,barH,4);
  ctx.save(); ctx.clip();
  bvx=barX;
  blocs.forEach(bl=>{
    const sum=lists.filter(l=>l.bloc===bl.key).reduce((s,l)=>s+l.voix,0);
    const segW=exp>0?sum/exp*barW:0;
    if(segW<1)return;
    ctx.fillStyle=bl.color; ctx.fillRect(bvx,barY,segW,barH);
    bvx+=segW;
  });
  ctx.restore();

  // Bars
  let by2=barY+barH+18;
  const maxPct=lists[0]?.pct||1;
  lists.forEach((l,i)=>{
    const rowH=22, rowY=by2+i*rowH;
    // nuance badge
    ctx.fillStyle=lighten(l.color, 0.75);
    roundRect(ctx,x,rowY+3,26,13,3); ctx.fill();
    ctx.fillStyle=darken(l.color,0.1);
    ctx.font='bold 7px "DM Sans",sans-serif';
    ctx.fillText(l.nuance, x+3, rowY+13);
    // name
    ctx.fillStyle=C.txt;
    ctx.font='11px "DM Sans",sans-serif';
    const nm=l.nom.length>32?l.nom.slice(0,30)+'…':l.nom;
    ctx.fillText(nm, x+30, rowY+13);
    // pct
    ctx.fillStyle=l.color;
    ctx.font='bold 13px "Cormorant Garamond",Georgia,serif';
    const pctStr=fP(l.pct);
    ctx.fillText(pctStr, x+w-70-ctx.measureText(pctStr).width, rowY+13);
    // voix
    ctx.fillStyle=C.txt3; ctx.font='9px "DM Sans",sans-serif';
    const vStr=fN(l.voix);
    ctx.fillText(vStr, x+w-ctx.measureText(vStr).width, rowY+13);
    // progress bar
    const barW2=w*0.55, barX2=x+30, barY2=rowY+rowH-4;
    ctx.fillStyle=C.bg2; ctx.fillRect(barX2,barY2,barW2,2);
    ctx.fillStyle=l.color; ctx.fillRect(barX2,barY2,barW2*l.pct/maxPct,2);

    by2;
  });

  return by2 + lists.length*22 + 10;
}

/** Draw raw data table */
function drawDataTable(ctx, state, x, y, w) {
  const { data, candidates } = state;
  if (!data || !data.length) return y;

  // Section title
  ctx.fillStyle=C.accent; ctx.font='600 9px "DM Sans",sans-serif';
  ctx.fillText('DONNÉES BRUTES PAR BUREAU DE VOTE', x, y+10);
  y+=18;

  const cols=['BV','Inscrits','Votants','Part.%','Exprimés',...candidates.map(c=>c.nuance)];
  const fixedCols=5;
  const fixedW=[28,52,52,42,52];
  const candCols=candidates.length;
  const candW=Math.max(36, Math.min(60, (w - fixedW.reduce((a,b)=>a+b,0) - fixedCols*2) / candCols - 2));
  const totalW=fixedW.reduce((a,b)=>a+b,0)+fixedCols*2+candCols*(candW+2);
  const scale=Math.min(1, w/totalW);

  const rowH=14, headerH=18;
  ctx.save();
  ctx.scale(scale,1);
  const xs=x/scale;
  const ws=fixedW.map(v=>v).concat(candidates.map(()=>candW));

  // Header
  ctx.fillStyle=C.accent;
  ctx.fillRect(xs, y, totalW/scale < w/scale ? totalW : w/scale, headerH);
  let cx=xs;
  cols.forEach((col,i)=>{
    ctx.fillStyle='#fff'; ctx.font='bold 7px "DM Sans",sans-serif';
    ctx.fillText(col, cx+2, y+11);
    cx+=(ws[i]||candW)+2;
  });
  y+=headerH;

  // Rows
  data.slice().sort((a,b)=>parseInt(a.bv)-parseInt(b.bv)).forEach((row,ri)=>{
    ctx.fillStyle=ri%2===0?C.bg:C.bg2;
    ctx.fillRect(xs, y, w/scale, rowH);
    let cx=xs;
    const vals=[
      String(parseInt(row.bv)).padStart(2,'0'),
      fN(row.ins||0),
      fN(row.vot||0),
      row.ins>0?((row.vot||0)/(row.ins||1)*100).toFixed(1):'—',
      fN(row.exp||0),
      ...candidates.map(c=>{
        const v=parseInt(row[c.nuance])||0;
        const pct=row.exp>0?(v/row.exp*100).toFixed(1):'0';
        return `${fN(v)} (${pct}%)`;
      })
    ];
    vals.forEach((val,i)=>{
      const c=i>=fixedCols?candidates[i-fixedCols]:null;
      ctx.fillStyle=c?c.color:i===3?'#1565C0':C.txt;
      ctx.font=(i===0?'bold ':'')+`8px "DM Sans",sans-serif`;
      ctx.fillText(val, cx+2, y+10);
      cx+=(ws[i]||candW)+2;
    });
    // border
    ctx.strokeStyle=C.border; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.moveTo(xs,y+rowH); ctx.lineTo(xs+w/scale,y+rowH); ctx.stroke();
    y+=rowH;
  });
  ctx.restore();
  return y+8;
}

/* ─── SVG → Image ───────────────────────────────────────────────────────── */
function svgToImage(svgEl) {
  return new Promise((resolve, reject) => {
    // Clone and set white bg
    const clone = svgEl.cloneNode(true);
    clone.style.background = '#ffffff';
    // Inline all computed styles on paths/rects/texts
    const s = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([s], {type:'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load error')); };
    img.src = url;
  });
}

/* ─── Main render functions ─────────────────────────────────────────────── */

/** Render MAP view */
async function renderMap(state, opts) {
  // A4 landscape at 150dpi → 1754 × 1240
  const DPI=150, MM2PX=DPI/25.4;
  const W=Math.round(297*MM2PX), H=Math.round(210*MM2PX);
  const MARGIN=40;

  const c=document.createElement('canvas');
  c.width=W; c.height=H;
  const ctx=c.getContext('2d');

  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);

  let y=MARGIN;
  if(opts.title) y=drawHeader(ctx,state,y-MARGIN);

  // Map image
  const mapCanvas=state.mapCanvas;
  if(mapCanvas){
    const mH=H-y-MARGIN-(opts.sources?28:0);
    const mW=W-MARGIN*2-260; // leave right side for legend
    // scale map to fit
    const scale=Math.min(mW/mapCanvas.width, mH/mapCanvas.height);
    const dw=mapCanvas.width*scale, dh=mapCanvas.height*scale;
    const mx=MARGIN, my=y;

    // subtle shadow
    ctx.shadowColor='rgba(0,0,0,0.12)';
    ctx.shadowBlur=12;
    ctx.fillStyle=C.border;
    ctx.fillRect(mx,my,dw,dh);
    ctx.shadowColor='transparent';

    ctx.drawImage(mapCanvas,mx,my,dw,dh);

    // thin border
    ctx.strokeStyle=C.border2; ctx.lineWidth=1;
    ctx.strokeRect(mx,my,dw,dh);

    // Legend area (right side)
    if(opts.legend){
      const lx=mx+dw+20, ly=my, lw=W-lx-MARGIN;
      drawMapLegend(ctx,state,lx,ly,lw);
    }
  }

  if(opts.sources){
    drawSources(ctx,'Ministère de l\'Intérieur · Ville de Villejuif · RPLS (SDES)', H-MARGIN+12);
  }

  return c;
}

/** Render RESULTS panel */
async function renderPanel(state, opts) {
  const DPI=150, MM2PX=DPI/25.4;
  const W=Math.round(210*MM2PX), H=Math.round(297*MM2PX);
  const MARGIN=40;

  const c=document.createElement('canvas');
  c.width=W; c.height=H;
  const ctx=c.getContext('2d');
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);

  let y=MARGIN;
  if(opts.title) y=drawHeader(ctx,state,y-MARGIN);

  const contentW=W-MARGIN*2;
  y=drawResultsPanel(ctx,state,MARGIN,y,contentW);

  if(opts.table && y < H-120){
    y+=10;
    y=drawDataTable(ctx,state,MARGIN,y,contentW);
  }

  if(opts.sources){
    drawSources(ctx,'Ministère de l\'Intérieur · Ville de Villejuif',H-MARGIN+12);
  }

  return c;
}

/** Render EVOLUTIONS (Sankey) */
async function renderEvol(state, opts) {
  const DPI=150, MM2PX=DPI/25.4;
  const W=Math.round(297*MM2PX), H=Math.round(210*MM2PX);
  const MARGIN=40;

  const c=document.createElement('canvas');
  c.width=W; c.height=H;
  const ctx=c.getContext('2d');
  ctx.fillStyle=C.bg; ctx.fillRect(0,0,W,H);

  let y=MARGIN;
  if(opts.title) y=drawHeader(ctx,state,y-MARGIN);

  // Render Sankey SVG → image
  const svgEl=document.getElementById('sk-svg');
  if(svgEl){
    try{
      // Temporarily make SVG background white for export
      const origBg=svgEl.style.background;
      svgEl.style.background='#ffffff';
      const img=await svgToImage(svgEl);
      svgEl.style.background=origBg;

      const avH=H-y-MARGIN-(opts.sources?28:0);
      const avW=W-MARGIN*2;
      const scale=Math.min(avW/img.naturalWidth, avH/img.naturalHeight);
      const dw=img.naturalWidth*scale, dh=img.naturalHeight*scale;

      ctx.shadowColor='rgba(0,0,0,0.08)'; ctx.shadowBlur=8;
      ctx.fillStyle=C.bg2; ctx.fillRect(MARGIN,y,dw,dh);
      ctx.shadowColor='transparent';
      ctx.drawImage(img,MARGIN,y,dw,dh);
      ctx.strokeStyle=C.border; ctx.lineWidth=1;
      ctx.strokeRect(MARGIN,y,dw,dh);
    }catch(e){
      ctx.fillStyle=C.txt2; ctx.font='13px "DM Sans",sans-serif';
      ctx.fillText('Erreur de rendu du diagramme.',MARGIN,y+40);
    }
  }

  if(opts.sources){
    drawSources(ctx,'Ministère de l\'Intérieur · Ville de Villejuif · Méthode : OLS écologique',H-MARGIN+12);
  }

  return c;
}

/* ─── PDF generation ────────────────────────────────────────────────────── */
function canvasToPDF(canvas, orientation) {
  const { jsPDF } = window.jspdf;
  const W=canvas.width, H=canvas.height;
  const pdf=new jsPDF({ orientation, unit:'px', format:[W,H], hotfixes:['px_scaling'] });
  pdf.addImage(canvas.toDataURL('image/jpeg',0.92),'JPEG',0,0,W,H,'','FAST');
  return pdf;
}

/* ─── Public API ────────────────────────────────────────────────────────── */
window.XP = {
  _view: null,

  init() {
    document.body.insertAdjacentHTML('beforeend', MODAL_HTML);
  },

  open() {
    const state = window._exportGetState?.() || {};
    this._view = state.view || 'map';

    // Badge = current view label
    const labels={ map:'Carte', panel:'Résultats', evol:'Évolutions' };
    document.getElementById('xp-badge').textContent = labels[this._view] || this._view;

    // Auto filename
    const el=state.election||{};
    const date=(el.date||'').replace(/\//g,'-');
    const viewSlug={ map:'carte', panel:'resultats', evol:'evolutions' }[this._view]||'export';
    const modeSlug=(state.modeSlug||'').replace(/[^a-z0-9]/gi,'_');
    document.getElementById('xp-fn').value=`villejuif_${viewSlug}_${modeSlug}_${date||'2026'}`;

    // Show/hide table option for evol
    document.querySelector('label:has(#xp-table)').style.display=
      this._view==='evol'?'none':'flex';

    document.getElementById('xp-modal').classList.add('vis');
  },

  close() {
    document.getElementById('xp-modal').classList.remove('vis');
  },

  async run(fmt) {
    const btns=document.querySelectorAll('.xp-fb');
    const prog=document.getElementById('xp-prog');
    btns.forEach(b=>b.disabled=true);
    prog.style.display='block';
    prog.textContent='Préparation…';

    try {
      const state=window._exportGetState?.() || {};
      const opts={
        title:  document.getElementById('xp-title').checked,
        legend: document.getElementById('xp-legend').checked,
        sources:document.getElementById('xp-sources').checked,
        table:  document.getElementById('xp-table').checked,
      };
      const fname=(document.getElementById('xp-fn').value||'villejuif_export')+'.'+fmt;

      prog.textContent='Rendu en cours…';
      let canvas, orientation;

      if(this._view==='map'){
        canvas=await renderMap(state,opts);
        orientation='l';
      } else if(this._view==='panel'){
        canvas=await renderPanel(state,opts);
        orientation='p';
      } else {
        canvas=await renderEvol(state,opts);
        orientation='l';
      }

      if(!canvas){ prog.textContent='⚠ Erreur de rendu.'; return; }

      if(fmt==='png'){
        prog.textContent='Téléchargement…';
        canvas.toBlob(blob=>{
          const a=document.createElement('a');
          a.href=URL.createObjectURL(blob);
          a.download=fname;
          a.click();
          setTimeout(()=>URL.revokeObjectURL(a.href),5000);
          prog.textContent='✓ PNG exporté';
          setTimeout(()=>{ prog.style.display='none'; btns.forEach(b=>b.disabled=false); },2000);
        },'image/png');
      } else {
        prog.textContent='Génération PDF A4…';
        const pdf=canvasToPDF(canvas,orientation);
        pdf.save(fname);
        prog.textContent='✓ PDF exporté';
        setTimeout(()=>{ prog.style.display='none'; btns.forEach(b=>b.disabled=false); },2000);
      }
    } catch(err) {
      console.error('XP.run error',err);
      prog.textContent='⚠ Erreur : '+err.message;
      setTimeout(()=>{ prog.style.display='none'; btns.forEach(b=>b.disabled=false); },4000);
    }
  }
};

// Auto-init when DOM ready
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>XP.init());
}else{
  XP.init();
}
})(); // end IIFE
