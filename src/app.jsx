import { useState, useMemo, useCallback } from "react";
import { Archive, ChevronDown, Info, RotateCcw, Scale, X } from "lucide-react";
import { FRAGEN, PARTEIEN } from "./daten.js";

function berechneMatch(partei, nutzerAntworten, doppelt) {
  let punkte=0, max=0;
  for(const [id,a] of Object.entries(nutzerAntworten)){
    if(a==="skip") continue;
    const pa=partei.antworten[id];
    if(pa===null||pa===undefined) continue;
    const w=doppelt.has(id)?2:1;
    max+=2*w;
    if(a===pa) punkte+=2*w;
    else if(a==="neutral"||pa==="neutral") punkte+=1*w;
  }
  return max===0?null:Math.round((punkte/max)*100);
}

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

const ROT="var(--color-red-500)";
const INK="var(--color-ink)";
const LINIE="var(--color-ink-line)";
const LEISE="var(--color-ink-muted)";

// Neun Themen, neun Farben — die Reihenfolge folgt dem Rainbow-Stripe, die
// Helligkeit nicht: rb-3, rb-4 und rb-6 sind als Flaechenfarben gedacht und
// erreichen als 0,65-rem-Kicker keine 4,5:1. Die Toene hier sind deshalb auf
// Textstaerke abgedunkelt, geprueft gegen Weiss. Dokumentierte Abweichung,
// vergleichbar mit den eigenen Diagrammfarben in haushaltvis.
const KAT_FARBEN={
  "Verkehr & Mobilität":"var(--color-red-600)",
  "Digitalisierung & Transparenz":"var(--color-purple-accent)",
  "Stadtentwicklung & Bauen":"var(--color-rb-8)",
  "Wirtschaft & Finanzen":"#0a6b36",
  "Soziales & Bildung":"#b3186b",
  "Kultur & Gesellschaft":"#9c5308",
  "Klima & Umwelt":"#12756f",
  "Freizeit & Sport":"#046282",
  "Demokratie & Beteiligung":"var(--color-rb-7)",
};

const ANT_CFG={
  ja:{sym:"✓",farbe:"#15803d",hell:"#dcfce7",label:"Ja"},
  neutral:{sym:"–",farbe:"#4b5563",hell:"#f1f5f9",label:"Neutral"},
  nein:{sym:"✕",farbe:"#b91c1c",hell:"#fee2e2",label:"Nein"},
  skip:{sym:"·",farbe:LEISE,hell:"var(--color-cream-dark)",label:"Übersprungen"},
};

function Stripe(){
  return <div className="wk-stripe" aria-hidden="true">{Array.from({length:9},(_,i)=><span key={i}/>)}</div>;
}

// Nähe zweier Parteien auf derselben Skala wie das eigene Ergebnis: gleiche
// Antwort zwei Punkte, einer neutral einen, gegensätzlich keinen.
function naeheProzent(a,b){
  let punkte=0,max=0;
  for(const f of FRAGEN){
    const x=a.antworten[f.id],y=b.antworten[f.id];
    if(x==null||y==null) continue;
    max+=2;
    if(x===y) punkte+=2;
    else if(x==="neutral"||y==="neutral") punkte+=1;
  }
  return max===0?null:Math.round((punkte/max)*100);
}

const KURZ={csu:"CSU",fw:"Freie Wähler",gruene:"Grüne",spd:"SPD",fresh:"FRESH",linke:"Linke"};

// Kein Kräftemodell wie im council-Tool: dort ist der Graph dünn, hier ist er
// vollständig — fünfzehn Kanten zwischen sechs Knoten, alle positiv. Abstoßung
// gegen Anziehung ergäbe dabei einen Klumpen. Stattdessen bekommt jedes Paar
// eine Soll-Länge aus seiner Unähnlichkeit, und die Schleife verkleinert die
// Abweichung davon. Startpositionen auf dem Kreis, feste Rundenzahl, kein
// Zufall: dasselbe Bild bei jedem Aufruf.
function netzLayout(parteien,paare,W,H,rand){
  const n=parteien.length;
  const pos=parteien.map((_,i)=>{
    const a=2*Math.PI*i/n-Math.PI/2;
    return {x:W/2+Math.cos(a)*W*.3,y:H/2+Math.sin(a)*H*.3};
  });
  const idx=Object.fromEntries(parteien.map((p,i)=>[p.id,i]));
  const werte=paare.map(p=>p.pct);
  const min=Math.min(...werte),max=Math.max(...werte);
  const soll=paare.map(p=>{
    const t=max===min?.5:(p.pct-min)/(max-min);
    return {i:idx[p.a.id],j:idx[p.b.id],l:130-t*85};
  });
  for(let runde=0;runde<400;runde++){
    for(const {i,j,l} of soll){
      const dx=pos[j].x-pos[i].x,dy=pos[j].y-pos[i].y;
      const d=Math.hypot(dx,dy)||.01;
      const k=((d-l)/d)*.12;
      pos[i].x+=dx*k; pos[i].y+=dy*k;
      pos[j].x-=dx*k; pos[j].y-=dy*k;
    }
  }
  const xs=pos.map(p=>p.x),ys=pos.map(p=>p.y);
  const bx=Math.min(...xs),by=Math.min(...ys);
  const bw=Math.max(...xs)-bx||1,bh=Math.max(...ys)-by||1;
  const s=Math.min((W-rand*2)/bw,(H-rand*2)/bh);
  return pos.map(p=>({
    x:rand+(p.x-bx)*s+((W-rand*2)-bw*s)/2,
    y:rand+(p.y-by)*s+((H-rand*2)-bh*s)/2,
  }));
}

function NaeheNetz(){
  const {parteien,paare,pos,min,max}=useMemo(()=>{
    const parteien=PARTEIEN.filter(p=>p.teilnehmend);
    const paare=[];
    for(let i=0;i<parteien.length;i++)
      for(let j=i+1;j<parteien.length;j++)
        paare.push({a:parteien[i],b:parteien[j],pct:naeheProzent(parteien[i],parteien[j])});
    const werte=paare.map(p=>p.pct);
    return {parteien,paare,pos:netzLayout(parteien,paare,300,190,34),
            min:Math.min(...werte),max:Math.max(...werte)};
  },[]);
  const idx=Object.fromEntries(parteien.map((p,i)=>[p.id,i]));

  return(
    <div>
      <p style={{fontSize:".75rem",color:LEISE,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>Wie nah sich die Parteien stehen</p>
      <svg viewBox="0 0 300 190" style={{width:"100%",height:"auto",display:"block"}} role="img"
           aria-label={`Nähe-Netz der ${parteien.length} teilnehmenden Parteien, Übereinstimmung zwischen ${min} und ${max} Prozent`}>
        {/* Schwache Kanten zuerst, damit die starken oben liegen. */}
        {paare.slice().sort((p,q)=>p.pct-q.pct).map(p=>{
          const t=max===min?1:(p.pct-min)/(max-min);
          const A=pos[idx[p.a.id]],B=pos[idx[p.b.id]];
          return <line key={p.a.id+p.b.id} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                       stroke="var(--color-ink)" strokeOpacity={(.05+t*t*.42).toFixed(3)}
                       strokeWidth={(.5+t*2).toFixed(2)}/>;
        })}
        {parteien.map((p,i)=>(
          <g key={p.id}>
            <circle cx={pos[i].x} cy={pos[i].y} r="6" fill={p.farbe}/>
            <text x={pos[i].x} y={pos[i].y-11} textAnchor="middle"
                  style={{fontSize:"9px",fontWeight:700,fill:"var(--color-ink)"}}>{KURZ[p.id]||p.name}</text>
          </g>
        ))}
      </svg>
      <p style={{fontSize:".78rem",color:"var(--color-ink-soft)",lineHeight:1.6,marginTop:6}}>
        Kurze, kräftige Linien heißen: die beiden haben oft gleich geantwortet. Die
        Übereinstimmung reicht von {min}{" "}% bis {max}{" "}% — keine zwei
        Parteien lagen also grundsätzlich auseinander. Gerechnet über die{" "}
        {FRAGEN.length} Fragen dieses Werkzeugs, nicht über das Abstimmungsverhalten
        im Stadtrat.
      </p>
    </div>
  );
}

function ArchivHinweis({kompakt}){
  return(
    <div style={{background:"var(--color-gold-100)",border:`1px solid var(--color-gold-200)`,borderRadius:"var(--radius-lg)",padding:kompakt?"9px 13px":"11px 15px",display:"flex",gap:9,alignItems:"flex-start"}}>
      <Archive size={15} strokeWidth={2} aria-hidden="true" style={{color:"var(--color-gold-700)",flexShrink:0,marginTop:2}}/>
      <p style={{fontSize:".82rem",color:"var(--color-gold-700)",lineHeight:1.6}}>
        <strong>Archiv.</strong> Die Kommunalwahl 2026 ist entschieden. Die Antworten stehen auf
        dem Stand des Wahltags und werden nicht mehr gepflegt.
      </p>
    </div>
  );
}

function AntwortIcon({antwort,size=24}){
  const c=ANT_CFG[antwort]||{sym:"?",farbe:LEISE,hell:"var(--color-cream-dark)"};
  return(
    <div aria-label={c.label} style={{width:size,height:size,borderRadius:"50%",background:c.hell,border:`2px solid ${c.farbe}`,display:"flex",alignItems:"center",justifyContent:"center",color:c.farbe,fontWeight:700,fontSize:size*.44,flexShrink:0}}>
      {c.sym}
    </div>
  );
}

function DetailPanel({partei,nutzerAntworten}){
  const geordnet=FRAGEN.filter(f=>{
    const na=nutzerAntworten[f.id],pa=partei.antworten[f.id];
    return na&&na!=="skip"&&pa!==null&&pa!==undefined;
  });
  if(!geordnet.length) return(
    <div className="wk-expand" style={{padding:"14px 16px",borderTop:`1px solid ${LINIE}`}}>
      <p style={{fontSize:".83rem",color:LEISE,fontStyle:"italic"}}>Keine Antworten verfügbar.</p>
    </div>
  );
  return(
    <div className="wk-expand" style={{borderTop:`1px solid ${LINIE}`}}>
      <div style={{display:"flex",gap:16,padding:"8px 16px",background:"var(--color-cream)",borderBottom:`1px solid ${LINIE}`,justifyContent:"flex-end"}}>
        {[{farbe:partei.farbe,label:partei.name},{farbe:LEISE,label:"Du"}].map(({farbe,label})=>(
          <div key={label} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:farbe}}/>
            <span style={{fontSize:".72rem",color:"var(--color-ink-soft)"}}>{label}</span>
          </div>
        ))}
      </div>
      {geordnet.map(frage=>{
        const pa=partei.antworten[frage.id],na=nutzerAntworten[frage.id];
        const beg=partei.begruendungen?.[frage.id];
        const kc=KAT_FARBEN[frage.kategorie]||ROT;
        const match=pa===na,teilMatch=!match&&(pa==="neutral"||na==="neutral");
        return(
          <div key={frage.id} className="wk-row" style={{padding:"11px 16px",background:match?"#f2faf5":teilMatch?"var(--color-cream)":"#fff"}}>
            <div style={{fontSize:".65rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",color:kc,marginBottom:5}}>{frage.kategorie}</div>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <p style={{flex:1,fontSize:".84rem",color:INK,lineHeight:1.5}}>{frage.text}</p>
              <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:partei.farbe}}/>
                  <AntwortIcon antwort={pa}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:LEISE}}/>
                  <AntwortIcon antwort={na}/>
                </div>
              </div>
            </div>
            {beg
              /* Zitat-Einzug mit neutraler Haarlinie. Vorher lief hier ein
                 3-px-Balken in der Parteifarbe — genau der einseitige
                 Kantenakzent, den der Kanon ausschliesst. */
              ?<blockquote style={{marginTop:7,borderLeft:`1px solid ${LINIE}`,paddingLeft:11}}>
                <p style={{fontSize:".78rem",color:"var(--color-ink-soft)",lineHeight:1.55,fontStyle:"italic"}}>{beg}</p>
               </blockquote>
              :<p style={{marginTop:4,fontSize:".74rem",color:LEISE,fontStyle:"italic"}}>Keine Begründung eingereicht.</p>
            }
          </div>
        );
      })}
    </div>
  );
}

function InfoPopup({onClose}){
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgb(28 28 28 / .6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div className="wk-modal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"var(--radius-2xl)",maxWidth:460,width:"100%",boxShadow:"var(--shadow-lift)",maxHeight:"88vh",overflowY:"auto"}}>
        <Stripe/>
        <div style={{padding:"22px 24px 26px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <h2 style={{fontFamily:"var(--font-display)",color:ROT,fontSize:"var(--text-display-4)"}}>Über dieses Projekt</h2>
            <button onClick={onClose} aria-label="Schließen" style={{background:"none",border:"none",cursor:"pointer",color:LEISE,lineHeight:0,padding:2}}><X size={20} strokeWidth={2}/></button>
          </div>
          <p style={{fontSize:".9rem",color:"var(--color-ink-soft)",lineHeight:1.7,marginBottom:14}}>Der <strong>Moos-O-Mat</strong> ist ein überparteiliches und ehrenamtliches Projekt zur Kommunalwahl in Moosburg a.d. Isar.</p>
          <div style={{marginBottom:14}}><ArchivHinweis kompakt/></div>
          <div style={{background:"var(--color-cream)",border:`1px solid ${LINIE}`,borderRadius:"var(--radius-lg)",padding:"11px 14px",marginBottom:16}}>
            <p style={{fontSize:".85rem",color:INK,fontWeight:700,marginBottom:4}}>Keine Wahlempfehlung</p>
            <p style={{fontSize:".82rem",color:"var(--color-ink-soft)",lineHeight:1.62}}>Dieses Tool stellt ausdrücklich <strong>keine Wahlempfehlung</strong> dar. Für die Inhalte der Parteiantworten sind ausschließlich die jeweiligen Parteien selbst verantwortlich.</p>
          </div>
          <div style={{marginBottom:18}}><NaeheNetz/></div>
          <p style={{fontSize:".75rem",color:LEISE,fontWeight:700,textTransform:"uppercase",letterSpacing:".07em",marginBottom:9}}>Ehrenamtlich beteiligt</p>
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
            {[["Benedict Aria Gruber","Digitalisierungsreferent, StR · FRESH"],["Philipp Fincke","StR · FDP / parteilos"],["Kilian Linz","StR · Grüne"],["Stefan John","StR a.D. · Linke"]].map(([n,r])=>(
              <div key={n} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 11px",background:"var(--color-cream)",borderRadius:"var(--radius-md)",gap:10}}>
                <span style={{fontWeight:700,color:INK,fontSize:".87rem"}}>{n}</span>
                <span style={{color:"var(--color-ink-soft)",fontSize:".75rem",textAlign:"right",lineHeight:1.3}}>{r}</span>
              </div>
            ))}
          </div>
          <button onClick={onClose} className="wk-prim" style={{width:"100%",background:ROT,color:"#fff",border:"none",borderRadius:"var(--radius-lg)",padding:"11px",fontSize:".93rem",fontWeight:700,cursor:"pointer",transition:"background .18s,transform .18s"}}>Schließen</button>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({onStart,onInfo}){
  return(
    <div style={{minHeight:"100%",display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"36px 16px 48px"}}>
      <div style={{maxWidth:520,width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:18}}>
        <div className="wk-fu wk-fu1" style={{fontSize:".78rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".12em",color:"var(--color-gold-700)"}}>Moosburg a.d. Isar</div>
        <h1 className="wk-fu wk-fu2" style={{fontFamily:"var(--font-display)",fontSize:"clamp(2.4rem,8vw,var(--text-display-1))",color:ROT,textAlign:"center",lineHeight:1.05,letterSpacing:"-.02em",fontWeight:700}}>Moos-O-Mat</h1>
        <p className="wk-fu wk-fu3" style={{color:"var(--color-ink-soft)",fontSize:"1rem",textAlign:"center",lineHeight:1.65}}>Kommunalwahl Moosburg · Finde heraus, welche Partei deinen Ansichten am nächsten steht.</p>
        <div className="wk-fu wk-fu3" style={{width:"100%",maxWidth:440}}><ArchivHinweis/></div>
        <div className="wk-fu wk-fu3" style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
          {[["36","Fragen"],["6","Parteien"],["~10","Minuten"]].map(([z,l])=>(
            <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"#fff",border:`1px solid ${LINIE}`,borderRadius:"var(--radius-xl)",padding:"12px 20px",minWidth:84}}>
              <span style={{fontFamily:"var(--font-display)",fontSize:"1.7rem",color:ROT,fontWeight:700}}>{z}</span>
              <span style={{fontSize:".74rem",color:LEISE,textTransform:"uppercase",letterSpacing:".07em"}}>{l}</span>
            </div>
          ))}
        </div>
        <div className="wk-fu wk-fu3" style={{background:"#fff",border:`1px solid ${LINIE}`,borderRadius:"var(--radius-xl)",padding:"14px 20px",maxWidth:440,width:"100%"}}>
          <p style={{color:"var(--color-ink-soft)",fontSize:".9rem",lineHeight:1.68,textAlign:"center"}}>Fragen in <strong>zufälliger Reihenfolge</strong>. Antworte mit <strong>Ja</strong>, <strong>Neutral</strong> oder <strong>Nein</strong>, oder überspringe. Am Ende kannst du Themen <strong>doppelt gewichten</strong>.</p>
        </div>
        <button className="wk-fu wk-fu4 wk-prim" onClick={onStart} style={{background:ROT,color:"#fff",border:"none",borderRadius:"var(--radius-xl)",padding:"14px 36px",fontSize:"1rem",fontWeight:700,cursor:"pointer",transition:"background .18s,transform .18s"}}>Jetzt starten →</button>
        <button className="wk-fu wk-fu5 wk-ghost" onClick={onInfo} style={{display:"flex",alignItems:"center",gap:7,background:"transparent",border:`1px solid ${LINIE}`,borderRadius:99,padding:"6px 18px",fontSize:".82rem",color:"var(--color-ink-soft)",cursor:"pointer",transition:"background .15s"}}><Info size={14} strokeWidth={2} aria-hidden="true"/>Über dieses Projekt</button>
        <p className="wk-fu wk-fu5" style={{fontSize:".75rem",color:LEISE,textAlign:"center"}}>Keine Daten werden gespeichert · Alles läuft lokal in deinem Browser</p>
      </div>
    </div>
  );
}

function QuizScreen({frage,idx,gesamt,onAntwort,aktAntwort,onZurueck}){
  const kc=KAT_FARBEN[frage.kategorie]||ROT;
  const fp=(idx/gesamt)*100;
  return(
    <div style={{height:"100%",display:"flex",flexDirection:"column"}}>
      <div style={{flex:1,overflowY:"auto",display:"flex",justifyContent:"center",padding:"18px 14px 10px"}}>
        <div style={{maxWidth:560,width:"100%",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div role="progressbar" aria-valuenow={idx+1} aria-valuemin={1} aria-valuemax={gesamt} style={{flex:1,height:5,background:"var(--color-cream-dark)",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${fp}%`,background:"var(--color-gold-500)",borderRadius:99,transition:"width .4s ease"}}/>
            </div>
            <span style={{fontSize:".82rem",color:LEISE,minWidth:46,textAlign:"right"}}>{idx+1} / {gesamt}</span>
          </div>
          <div style={{padding:"3px 11px",borderRadius:99,fontSize:".72rem",fontWeight:700,letterSpacing:".05em",background:"#fff",color:kc,border:`1px solid ${LINIE}`,alignSelf:"flex-start",textTransform:"uppercase"}}>{frage.kategorie}</div>
          <div key={frage.id} className="wk-karte" style={{background:"#fff",borderRadius:"var(--radius-2xl)",padding:"22px",border:`1px solid ${LINIE}`,boxShadow:"var(--shadow-soft)"}}>
            <p style={{fontFamily:"var(--font-display)",fontSize:"clamp(1.05rem,3.4vw,1.25rem)",color:INK,lineHeight:1.5}}>{frage.text}</p>
          </div>
        </div>
      </div>
      <div style={{borderTop:`1px solid ${LINIE}`,padding:"10px 14px 16px",display:"flex",justifyContent:"center",flexShrink:0}}>
        <div style={{maxWidth:560,width:"100%",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",gap:9}}>
            {["ja","neutral","nein"].map(val=>{
              const {sym,farbe,hell,label}=ANT_CFG[val];
              const aktiv=aktAntwort===val;
              return(
                <button key={val} className="wk-ans" onClick={()=>onAntwort(val)} aria-pressed={aktiv} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"11px 6px",borderRadius:"var(--radius-xl)",border:`2px solid ${farbe}`,background:aktiv?farbe:hell,color:aktiv?"#fff":farbe,fontSize:".88rem",fontWeight:aktiv?700:600,transition:"background .1s,color .1s"}}>
                  <span style={{fontSize:"1.1rem"}}>{sym}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",gap:7}}>
            {idx>0&&<button className="wk-ghost" onClick={onZurueck} style={{flex:1,background:"var(--color-cream-dark)",border:"none",borderRadius:"var(--radius-lg)",padding:"8px",fontSize:".85rem",color:"var(--color-ink-soft)",cursor:"pointer",transition:"background .15s"}}>← Zurück</button>}
            <button className="wk-ghost" onClick={()=>onAntwort("skip")} style={{flex:1,background:"var(--color-cream-dark)",border:"none",borderRadius:"var(--radius-lg)",padding:"8px",fontSize:".85rem",color:"var(--color-ink-soft)",cursor:"pointer",transition:"background .15s"}}>Überspringen →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GewichtungScreen({fragen,doppelt,onToggle,onWeiter,onZurueck,beantw}){
  return(
    <div style={{minHeight:"100%",display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"24px 14px 48px"}}>
      <div style={{maxWidth:580,width:"100%",display:"flex",flexDirection:"column",gap:14}}>
        <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(1.5rem,5vw,var(--text-display-3))",color:ROT,letterSpacing:"-.02em"}}>Doppelte Gewichtung</h2>
        <p style={{color:"var(--color-ink-soft)",fontSize:".92rem",lineHeight:1.62}}>Du hast <strong>{beantw} Fragen</strong> beantwortet. Wähle Fragen, die dir besonders wichtig sind — sie fließen <strong>doppelt</strong> ins Ergebnis ein.</p>
        {doppelt.size>0&&<div style={{background:"var(--color-gold-100)",border:`1px solid var(--color-gold-200)`,borderRadius:"var(--radius-lg)",padding:"9px 14px",fontSize:".87rem",color:"var(--color-gold-700)",display:"flex",alignItems:"center",gap:8}}><Scale size={15} strokeWidth={2} aria-hidden="true" style={{flexShrink:0}}/><span><strong>{doppelt.size}</strong> {doppelt.size===1?"Frage":"Fragen"} doppelt gewichtet</span></div>}
        <div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:"46vh",overflowY:"auto",paddingRight:3}}>
          {fragen.map(f=>{
            const aktiv=doppelt.has(f.id),kc=KAT_FARBEN[f.kategorie]||ROT;
            return(
              <button key={f.id} className="wk-gwt" onClick={()=>onToggle(f.id)} aria-pressed={aktiv} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 13px",borderRadius:"var(--radius-xl)",background:aktiv?"var(--color-gold-100)":"#fff",border:`1px solid ${aktiv?"var(--color-gold-500)":LINIE}`,cursor:"pointer",transition:"background .15s,border-color .15s",textAlign:"left"}}>
                <div style={{flex:1}}>
                  <span style={{fontSize:".68rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",color:kc,display:"block",marginBottom:2}}>{f.kategorie}</span>
                  <p style={{fontSize:".85rem",color:INK,lineHeight:1.4}}>{f.text}</p>
                </div>
                <div style={{minWidth:34,height:34,borderRadius:"var(--radius-md)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:".78rem",background:aktiv?"var(--color-gold-500)":"var(--color-cream-dark)",color:aktiv?"#fff":LEISE,flexShrink:0}}>{aktiv?"×2":"×1"}</div>
              </button>
            );
          })}
        </div>
        <div style={{display:"flex",gap:9}}>
          <button className="wk-ghost" onClick={onZurueck} style={{background:"var(--color-cream-dark)",border:"none",borderRadius:"var(--radius-lg)",padding:"11px 18px",fontSize:".88rem",color:"var(--color-ink-soft)",cursor:"pointer",transition:"background .15s"}}>← Zurück</button>
          <button className="wk-prim" onClick={onWeiter} style={{flex:1,background:ROT,color:"#fff",border:"none",borderRadius:"var(--radius-xl)",padding:"11px 18px",fontSize:".97rem",fontWeight:700,cursor:"pointer",transition:"background .18s,transform .18s"}}>Ergebnis anzeigen →</button>
        </div>
      </div>
    </div>
  );
}

function ErgebnisseScreen({ergebnisse,nutzerAntworten,onNeustart,doppeltAnz,beantw}){
  const [expandedId,setExpandedId]=useState(null);
  const maxMatch=ergebnisse.reduce((m,p)=>(p.match!==null&&p.match>m?p.match:m),0);
  return(
    <div style={{minHeight:"100%",display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"24px 14px 48px"}}>
      <div style={{maxWidth:580,width:"100%",display:"flex",flexDirection:"column",gap:10}}>
        <h2 style={{fontFamily:"var(--font-display)",fontSize:"clamp(1.5rem,5vw,var(--text-display-3))",color:ROT,letterSpacing:"-.02em"}}>Dein Ergebnis</h2>
        <p style={{color:"var(--color-ink-soft)",fontSize:".9rem"}}>{beantw} beantwortete Fragen{doppeltAnz>0?` · ${doppeltAnz} doppelt gewichtet`:""} · <em>Tippe für Details</em></p>
        <ArchivHinweis kompakt/>
        {ergebnisse.map((p,i)=>{
          const isOpen=expandedId===p.id;
          return(
            <div key={p.id} className="wk-karte" style={{background:"#fff",border:`1px solid ${isOpen?p.farbe:LINIE}`,borderRadius:"var(--radius-xl)",boxShadow:isOpen?"var(--shadow-lift)":"var(--shadow-soft)",animationDelay:`${i*.065}s`,opacity:p.teilnehmend?1:.62,overflow:"hidden",transition:"border-color .2s,box-shadow .2s"}}>
              <div className="wk-hdr" onClick={()=>p.teilnehmend&&setExpandedId(isOpen?null:p.id)} style={{padding:"14px 16px",cursor:p.teilnehmend?"pointer":"default"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:p.farbe,flexShrink:0}}/>
                    <span style={{fontFamily:"var(--font-display)",fontSize:"1rem",color:INK,fontWeight:700}}>{p.name}</span>
                    {!p.teilnehmend&&<span style={{background:"var(--color-cream-dark)",color:"var(--color-ink-soft)",fontSize:".7rem",fontWeight:700,padding:"2px 8px",borderRadius:99}}>Nicht teilgenommen</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    {p.match!==null?<span style={{fontFamily:"var(--font-display)",fontSize:"1.3rem",fontWeight:700,color:INK}}>{p.match} %</span>:<span style={{color:LEISE,fontSize:"1.1rem",fontFamily:"var(--font-display)"}}>–</span>}
                    {p.teilnehmend&&<ChevronDown size={16} strokeWidth={2} aria-hidden="true" style={{color:LEISE,flexShrink:0,transform:isOpen?"rotate(180deg)":"none",transition:"transform .25s"}}/>}
                  </div>
                </div>
                <div style={{height:7,background:"var(--color-cream-dark)",borderRadius:99,overflow:"hidden",marginBottom:5}}>
                  {p.match!==null&&<div className="wk-bar" style={{height:"100%",width:`${p.match}%`,background:p.farbe,borderRadius:99,animationDelay:`${i*.065+.18}s`}}/>}
                </div>
                {p.match===null&&<p style={{fontSize:".78rem",color:LEISE,fontStyle:"italic",lineHeight:1.5,marginTop:3}}>Diese Partei hat ihre Antworten nicht fristgerecht eingereicht.</p>}
                {p.match===maxMatch&&p.match!==null&&<div style={{marginTop:7,fontSize:".72rem",color:"var(--color-gold-700)",fontWeight:700,textTransform:"uppercase",letterSpacing:".08em"}}>Beste Übereinstimmung</div>}
              </div>
              {isOpen&&<DetailPanel partei={p} nutzerAntworten={nutzerAntworten}/>}
            </div>
          );
        })}
        <div style={{display:"flex",justifyContent:"center",marginTop:4}}>
          <button className="wk-prim" onClick={onNeustart} style={{display:"flex",alignItems:"center",gap:8,background:ROT,color:"#fff",border:"none",borderRadius:"var(--radius-xl)",padding:"12px 30px",fontSize:".97rem",fontWeight:700,cursor:"pointer",transition:"background .18s,transform .18s"}}><RotateCcw size={16} strokeWidth={2.2} aria-hidden="true"/>Neu starten</button>
        </div>
        <p style={{fontSize:".75rem",color:LEISE,textAlign:"center",paddingBottom:6}}>Überparteiliches, ehrenamtliches Informationsprojekt · Keine Wahlempfehlung</p>
      </div>
    </div>
  );
}

export default function App(){
  const [screen,setScreen]=useState("welcome");
  const [shuffled]=useState(()=>shuffle(FRAGEN));
  const [idx,setIdx]=useState(0);
  const [antworten,setAntw]=useState({});
  const [doppelt,setDoppelt]=useState(new Set());
  const [popup,setPopup]=useState(false);

  const frage=shuffled[idx],gesamt=shuffled.length;
  const beantw=Object.values(antworten).filter(a=>a!=="skip").length;

  const gibAntwort=useCallback((a)=>{
    setAntw(prev=>({...prev,[frage.id]:a}));
    if(idx<gesamt-1) setIdx(i=>i+1); else setScreen("gewichtung");
  },[frage,idx,gesamt]);

  const toggleDoppelt=id=>setDoppelt(prev=>{const s=new Set(prev);s.has(id)?s.delete(id):s.add(id);return s;});

  const ergebnisse=useMemo(()=>{
    if(screen!=="ergebnisse") return [];
    return PARTEIEN
      .map(p=>({...p,match:p.teilnehmend?berechneMatch(p,antworten,doppelt):null}))
      .sort((a,b)=>{if(a.match===null&&b.match===null)return 0;if(a.match===null)return 1;if(b.match===null)return -1;return b.match-a.match;});
  },[screen,antworten,doppelt]);

  const beantwFragen=useMemo(()=>shuffled.filter(f=>antworten[f.id]&&antworten[f.id]!=="skip"),[shuffled,antworten]);
  const neustart=()=>{setAntw({});setDoppelt(new Set());setIdx(0);setScreen("welcome");};

  return(
    <div style={{height:"100vh",overflow:"auto",display:"flex",flexDirection:"column"}}>
      <Stripe/>
      {popup&&<InfoPopup onClose={()=>setPopup(false)}/>}
      <div style={{flex:1,minHeight:0}}>
        {screen==="welcome"    &&<WelcomeScreen onStart={()=>setScreen("quiz")} onInfo={()=>setPopup(true)}/>}
        {screen==="quiz"       &&<QuizScreen frage={frage} idx={idx} gesamt={gesamt} onAntwort={gibAntwort} aktAntwort={antworten[frage?.id]} onZurueck={()=>idx>0&&setIdx(i=>i-1)}/>}
        {screen==="gewichtung" &&<GewichtungScreen fragen={beantwFragen} doppelt={doppelt} onToggle={toggleDoppelt} onWeiter={()=>setScreen("ergebnisse")} onZurueck={()=>{setIdx(gesamt-1);setScreen("quiz");}} beantw={beantw}/>}
        {screen==="ergebnisse" &&<ErgebnisseScreen ergebnisse={ergebnisse} nutzerAntworten={antworten} onNeustart={neustart} doppeltAnz={doppelt.size} beantw={beantw}/>}
      </div>
    </div>
  );
}
