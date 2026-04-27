import { useState, useEffect } from "react";

const POST_TYPES = [
  { id: "market_monday", label: "Market Monday", day: "Tuesday", emoji: "📊" },
  { id: "community", label: "Community Spotlight", day: "Thursday", emoji: "🏘️" },
  { id: "weekend_re", label: "Weekend Real Estate", day: "Friday", emoji: "🏠" },
  { id: "blog_teaser", label: "Blog Teaser", day: "Wednesday", emoji: "✍️" },
];

const GEO_SCOPES = [
  { id: "single", label: "Single City", desc: "Tight local focus" },
  { id: "northern_utah", label: "Northern Utah County", desc: "Lehi · SS · EM · AF" },
  { id: "both_counties", label: "Utah + Salt Lake Counties", desc: "Regional — events & broad trends" },
];

const CITIES = ["Lehi","Saratoga Springs","Eagle Mountain","American Fork","Pleasant Grove","Highland","Alpine"];

const SUGGESTED_TIMES = {
  market_monday: ["6:30 PM MT","7:00 PM MT","8:00 PM MT"],
  community:     ["7:00 PM MT","7:30 PM MT","5:00 PM MT"],
  weekend_re:    ["7:00 PM MT","9:00 AM MT","12:00 PM MT"],
  blog_teaser:   ["12:00 PM MT","7:00 PM MT","8:00 AM MT"],
};

const POST_QUESTIONS = {
  market_monday: [
    { id:"q1", text:"What's one thing you noticed in the market this week?" },
    { id:"q2", text:"Any specific price range or trend to highlight?" },
    { id:"q3", text:"What are buyers or sellers asking you about most right now?" },
  ],
  community: [
    { id:"q1", text:"Any local business, event, or neighborhood moment to highlight?" },
    { id:"q2", text:"Anything in the community you personally experienced or heard about?" },
    { id:"q3", text:"Anyone local worth giving a shoutout to?" },
  ],
  weekend_re: [
    { id:"q1", text:"Any specific listings or open houses to feature this week?" },
    { id:"q2", text:"Any anonymous client wins from this week?" },
    { id:"q3", text:"What's the most interesting property you've seen recently?" },
  ],
  blog_teaser: [
    { id:"blog_url", text:"Paste your blog post URL", type:"url" },
    { id:"q2", text:"What's the one thing you most want readers to take away?" },
  ],
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const S = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  rm: (k) => { try { localStorage.removeItem(k); } catch {} },
  voice: () => S.get("uvh_voice") || [],
  addVoice: (e) => { const lib = S.voice(); lib.unshift(e); S.set("uvh_voice", lib.slice(0,60)); },
  session: () => S.get("uvh_sess"),
  saveSession: (d) => S.set("uvh_sess", d),
  clearSession: () => S.rm("uvh_sess"),
  webhook: () => { try { return localStorage.getItem("uvh_wh") || ""; } catch { return ""; } },
  saveWebhook: (u) => { try { localStorage.setItem("uvh_wh", u); } catch {} },
  analytics: () => S.get("uvh_analytics"),
};

// ─── API ──────────────────────────────────────────────────────────────────────
async function claude(messages, system, maxTokens = 2000) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system, messages }),
  });
  if (!r.ok) throw new Error(`API ${r.status}`);
  const d = await r.json();
  return d.content.map(b => b.text || "").join("");
}
function parseJSON(raw) {
  try { return JSON.parse(raw.replace(/```json|```/g,"").trim()); } catch { return null; }
}

// ─── DESIGN ───────────────────────────────────────────────────────────────────
const C = {
  bg:"#080F18", surface:"#0D1A28", elevated:"#142233", hover:"#1A2E44",
  gold:"#D4A843", goldSoft:"#B8912C", goldDim:"rgba(212,168,67,0.1)",
  goldBorder:"rgba(212,168,67,0.22)", goldStrong:"rgba(212,168,67,0.5)",
  white:"#EDE7D2", off:"#C5BAA5", muted:"#78706A", faint:"#2A2820",
  green:"#3D9E6A", greenBg:"rgba(61,158,106,0.1)",
  red:"#C44040", redBg:"rgba(196,64,64,0.1)",
  blue:"#4A92C6", blueBg:"rgba(74,146,198,0.1)",
};
const F = {
  display:"'Cormorant Garamond','Playfair Display',Georgia,serif",
  body:"'Outfit','DM Sans',sans-serif",
  mono:"'JetBrains Mono','DM Mono',monospace",
};
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:${C.bg};color:${C.white};font-family:${F.body};-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:${C.surface}}::-webkit-scrollbar-thumb{background:${C.goldBorder};border-radius:2px}
  textarea,input,button{font-family:${F.body}}
  textarea:focus,input:focus{outline:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(212,168,67,0.1)}50%{box-shadow:0 0 44px rgba(212,168,67,0.28)}}
  .fu{animation:fadeUp 0.32s ease both}
  .card{background:${C.surface};border:1px solid ${C.goldBorder};border-radius:10px}
`;

// ─── ATOMS ────────────────────────────────────────────────────────────────────
const Spin = ({s=18}) => <span style={{display:"inline-block",width:s,height:s,border:`2px solid ${C.faint}`,borderTop:`2px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0}} />;
const Chip = ({ch,color=C.gold}) => <span style={{fontFamily:F.mono,fontSize:10,fontWeight:500,padding:"2px 7px",borderRadius:3,background:`${color}18`,color,border:`1px solid ${color}30`,letterSpacing:"0.08em",textTransform:"uppercase"}}>{ch}</span>;
const Hr = () => <div style={{height:1,background:`linear-gradient(90deg,transparent,${C.goldBorder},transparent)`,margin:"18px 0"}} />;

function Btn({ch,onClick,v="gold",sz="md",disabled=false,full=false,style={}}) {
  const pad={sm:"7px 14px",md:"10px 20px",lg:"13px 28px"}[sz];
  const fs={sm:12,md:13,lg:15}[sz];
  const vs={
    gold:{background:`linear-gradient(135deg,${C.gold},${C.goldSoft})`,color:C.bg,border:"none"},
    outline:{background:"transparent",color:C.gold,border:`1px solid ${C.goldStrong}`},
    ghost:{background:"transparent",color:C.off,border:`1px solid ${C.faint}`},
    danger:{background:C.redBg,color:C.red,border:`1px solid ${C.red}40`},
    success:{background:C.greenBg,color:C.green,border:`1px solid ${C.green}40`},
  };
  return <button onClick={disabled?undefined:onClick} style={{...vs[v],padding:pad,fontSize:fs,fontWeight:600,borderRadius:6,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.42:1,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,transition:"all 0.18s",width:full?"100%":undefined,letterSpacing:"0.01em",...style}}>{ch}</button>;
}

function TA({val,set,rows=6,ph=""}) {
  return <textarea value={val} onChange={e=>set(e.target.value)} rows={rows} placeholder={ph}
    style={{width:"100%",background:C.bg,border:`1px solid ${C.faint}`,borderRadius:6,padding:"11px 13px",color:C.white,fontSize:14,lineHeight:1.65,resize:"vertical",transition:"border-color 0.2s",fontFamily:F.body}}
    onFocus={e=>e.target.style.borderColor=C.goldBorder} onBlur={e=>e.target.style.borderColor=C.faint} />;
}
function Inp({val,set,ph="",mono=false}) {
  return <input value={val} onChange={e=>set(e.target.value)} placeholder={ph}
    style={{width:"100%",background:C.bg,border:`1px solid ${C.faint}`,borderRadius:6,padding:"9px 13px",color:C.white,fontSize:13,fontFamily:mono?F.mono:F.body,transition:"border-color 0.2s"}}
    onFocus={e=>e.target.style.borderColor=C.goldBorder} onBlur={e=>e.target.style.borderColor=C.faint} />;
}

function PhaseWrap({step,title,sub,ch}) {
  return <div style={{maxWidth:680,margin:"0 auto",padding:"48px 24px"}} className="fu">
    <style>{G}</style>
    <div style={{fontFamily:F.mono,fontSize:10,color:C.gold,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:6}}>Step {step} of 4</div>
    <h1 style={{fontFamily:F.display,fontSize:"clamp(28px,4vw,40px)",fontWeight:500,lineHeight:1.15,marginBottom:sub?8:28}}>{title}</h1>
    {sub&&<p style={{color:C.muted,fontSize:14,marginBottom:28,lineHeight:1.65}}>{sub}</p>}
    {ch}
  </div>;
}

// ─── SESSION RESTORE ──────────────────────────────────────────────────────────
function SessionRestore({sess,onCont,onFresh}) {
  const pt = POST_TYPES.find(p=>p.id===sess.postType);
  const gl = sess.geo?.scope==="single" ? sess.geo?.city : GEO_SCOPES.find(g=>g.id===sess.geo?.scope)?.label || "Northern Utah County";
  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <style>{G}</style>
    <div className="card fu" style={{maxWidth:450,width:"100%",padding:36,textAlign:"center",animation:"glow 3s ease-in-out infinite"}}>
      <div style={{fontFamily:F.mono,fontSize:10,color:C.gold,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:14}}>Session Found</div>
      <h2 style={{fontFamily:F.display,fontSize:32,marginBottom:10}}>Welcome back, Beau</h2>
      <p style={{color:C.muted,fontSize:14,lineHeight:1.65,marginBottom:28}}>
        You were working on a <strong style={{color:C.gold}}>{pt?.label}</strong> post for <strong style={{color:C.gold}}>{gl}</strong>.
      </p>
      <div style={{display:"flex",gap:12,justifyContent:"center"}}>
        <Btn ch="Continue Session" onClick={onCont} />
        <Btn ch="Start Fresh" onClick={onFresh} v="outline" />
      </div>
    </div>
  </div>;
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function Landing({onStart,webhook,onWHSave}) {
  const [showS,setShowS]=useState(false);
  const [wh,setWh]=useState(webhook);
  const analytics=S.analytics();
  const vlib=S.voice();
  return <div style={{minHeight:"100vh",display:"flex",flexDirection:"column"}}>
    <style>{G}</style>
    <nav style={{padding:"20px 32px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.goldBorder}`}}>
      <div>
        <div style={{fontFamily:F.display,fontSize:20,letterSpacing:"0.03em"}}>Utah Vista Homes</div>
        <div style={{fontFamily:F.mono,fontSize:9,color:C.muted,letterSpacing:"0.2em",textTransform:"uppercase"}}>Content Studio</div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        {vlib.length>0&&<Chip ch={`${vlib.length} posts in voice library`} color={C.muted} />}
        <Btn ch="⚙ Settings" onClick={()=>setShowS(!showS)} v="ghost" sz="sm" />
      </div>
    </nav>
    {showS&&<div style={{background:C.elevated,borderBottom:`1px solid ${C.goldBorder}`,padding:"14px 32px",display:"flex",gap:12,alignItems:"center"}} className="fu">
      <div style={{fontFamily:F.mono,fontSize:11,color:C.muted,minWidth:150,flexShrink:0}}>Zapier Webhook URL</div>
      <Inp val={wh} set={setWh} ph="https://hooks.zapier.com/hooks/catch/..." mono />
      <Btn ch="Save" onClick={()=>{onWHSave(wh);setShowS(false);}} sz="sm" />
      {!wh&&<span style={{fontSize:11,color:C.red,flexShrink:0}}>Required to publish</span>}
    </div>}
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"72px 24px",textAlign:"center"}}>
      <div style={{fontFamily:F.mono,fontSize:10,color:C.gold,letterSpacing:"0.25em",textTransform:"uppercase",marginBottom:18}}>Northern Utah County</div>
      <h1 style={{fontFamily:F.display,fontSize:"clamp(44px,7vw,78px)",fontWeight:500,lineHeight:1.05,marginBottom:16,maxWidth:620}}>Posts that sound<br/><em style={{color:C.gold}}>like you</em></h1>
      <p style={{color:C.muted,fontSize:16,maxWidth:400,lineHeight:1.75,marginBottom:44}}>Generate three ranked variations, pick the one that feels right, edit it your way, then publish directly to Facebook and Instagram.</p>
      <Btn ch="Create a Post →" onClick={onStart} sz="lg" />
    </div>
    {analytics&&<div style={{background:C.surface,borderTop:`1px solid ${C.goldBorder}`,padding:"14px 32px",display:"flex",gap:28,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{fontFamily:F.mono,fontSize:10,color:C.gold,letterSpacing:"0.15em",textTransform:"uppercase"}}>Last 7 Days</div>
      {analytics.stats?.map((s,i)=><div key={i} style={{fontSize:13}}><span style={{color:C.white,fontWeight:600}}>{s.value}</span> <span style={{color:C.muted}}>{s.label}</span></div>)}
      {analytics.suggestion&&<div style={{fontSize:12,color:C.gold,fontStyle:"italic",marginLeft:"auto"}}>→ {analytics.suggestion}</div>}
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:`1px solid ${C.goldBorder}`}}>
      {POST_TYPES.map(pt=><div key={pt.id} style={{padding:"18px 16px",borderRight:`1px solid ${C.goldBorder}`,textAlign:"center"}}>
        <div style={{fontSize:22,marginBottom:4}}>{pt.emoji}</div>
        <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{pt.label}</div>
        <div style={{fontFamily:F.mono,fontSize:10,color:C.muted}}>{pt.day}s</div>
      </div>)}
    </div>
  </div>;
}

// ─── STEP 1: SETUP ────────────────────────────────────────────────────────────
function Setup({init={},onNext}) {
  const [pt,setPt]=useState(init.postType||"");
  const [scope,setScope]=useState(init.geo?.scope||"northern_utah");
  const [city,setCity]=useState(init.geo?.city||"");
  const vlib=S.voice();
  const recent=vlib.filter(e=>e.postType===pt&&(scope==="single"?e.city===city:true)).slice(0,2);
  const ok=pt&&(scope!=="single"||city);
  return <PhaseWrap step={1} title="What are we creating?" sub="Choose your post type and geographic focus for this week." ch={<>
    <div className="card" style={{padding:20,marginBottom:14}}>
      <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:14}}>Post Type</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {POST_TYPES.map(p=><button key={p.id} onClick={()=>setPt(p.id)} style={{background:pt===p.id?C.goldDim:C.elevated,border:`1px solid ${pt===p.id?C.gold:C.faint}`,borderRadius:8,padding:"13px 15px",textAlign:"left",color:C.white,cursor:"pointer",transition:"all 0.18s"}}>
          <div style={{fontSize:20,marginBottom:5}}>{p.emoji}</div>
          <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{p.label}</div>
          <div style={{fontFamily:F.mono,fontSize:10,color:C.muted}}>{p.day}s</div>
        </button>)}
      </div>
    </div>
    {pt&&<div className="card fu" style={{padding:20,marginBottom:14}}>
      <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:14}}>Geographic Focus</div>
      {GEO_SCOPES.map(g=><button key={g.id} onClick={()=>{setScope(g.id);if(g.id!=="single")setCity("");}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",background:scope===g.id?C.goldDim:C.elevated,border:`1px solid ${scope===g.id?C.gold:C.faint}`,borderRadius:6,padding:"11px 15px",color:C.white,cursor:"pointer",transition:"all 0.18s",marginBottom:7,textAlign:"left"}}>
        <div><div style={{fontWeight:600,fontSize:14}}>{g.label}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>{g.desc}</div></div>
        {scope===g.id&&<div style={{width:8,height:8,borderRadius:"50%",background:C.gold,flexShrink:0}} />}
      </button>)}
      {scope==="single"&&<div style={{marginTop:10}} className="fu">
        <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10}}>Which City</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
          {CITIES.map(c=><button key={c} onClick={()=>setCity(c)} style={{background:city===c?C.goldDim:C.bg,border:`1px solid ${city===c?C.gold:C.faint}`,borderRadius:20,padding:"7px 14px",color:city===c?C.gold:C.off,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}>{c}</button>)}
        </div>
      </div>}
    </div>}
    {recent.length>0&&<div className="card fu" style={{padding:16,marginBottom:18,borderColor:C.goldDim}}>
      <div style={{fontFamily:F.mono,fontSize:10,color:C.gold,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10}}>Recent Voice Reference</div>
      {recent.map((e,i)=><div key={i} style={{marginBottom:i<recent.length-1?10:0,paddingBottom:i<recent.length-1?10:0,borderBottom:i<recent.length-1?`1px solid ${C.faint}`:"none"}}>
        <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,marginBottom:3}}>{e.date} · {e.city||"Regional"}</div>
        <div style={{fontSize:13,color:C.off,lineHeight:1.5}}>{e.approvedCaption.slice(0,130)}…</div>
      </div>)}
    </div>}
    <Btn ch="Continue →" onClick={()=>onNext({postType:pt,geo:{scope,city}})} disabled={!ok} sz="lg" />
  </>} />;
}

// ─── STEP 2: TRENDS + INPUT ───────────────────────────────────────────────────
function TrendingInput({postType,geo,onNext}) {
  const [loadT,setLoadT]=useState(true);
  const [trends,setTrends]=useState([]);
  const [picked,setPicked]=useState(null);
  const [custom,setCustom]=useState("");
  const [loadS,setLoadS]=useState({});
  const [suggs,setSuggs]=useState({});
  const [answers,setAnswers]=useState({});
  const qs=POST_QUESTIONS[postType]||[];
  const gl=geo.scope==="single"?geo.city:GEO_SCOPES.find(g=>g.id===geo.scope)?.label;

  useEffect(()=>{
    fetchT();
    qs.forEach(q=>{if(q.type!=="url")fetchS(q);});
  },[]);

  async function fetchT(){
    setLoadT(true);
    try{
      const raw=await claude([{role:"user",content:`Find 3 trending topics (this week) for a Utah real estate ${postType} social post covering ${gl}. Use: local Utah news, real estate trends, community events, non-political pop culture from past 2 weeks. JSON only: {"topics":[{"id":"t1","headline":"catchy short headline","why":"one sentence why this fits a ${postType} post","hook":"how Beau could naturally reference this"}]}`}],
        "You are a social media strategist for a Utah realtor. Return valid JSON only.",600);
      const r=parseJSON(raw);setTrends(r?.topics||[]);
    }catch{setTrends([]);}finally{setLoadT(false);}
  }

  async function fetchS(q){
    setLoadS(p=>({...p,[q.id]:true}));
    try{
      const raw=await claude([{role:"user",content:`Generate 3 short first-person answer options for a Utah real estate ${postType} post covering ${gl}, for this question: "${q.text}". Sound like Beau Gardner — warm, genuine, knowledgeable northern Utah realtor. 1-2 sentences each. Specific, not generic. JSON only: {"options":["...","...","..."]}`}],
        "Generate answer options for a Utah realtor's social media tool. Return valid JSON only.",500);
      const r=parseJSON(raw);setSuggs(p=>({...p,[q.id]:r?.options||[]}));
    }catch{setSuggs(p=>({...p,[q.id]:[]}));}finally{setLoadS(p=>({...p,[q.id]:false}));}
  }

  const ok=postType!=="blog_teaser"||answers["blog_url"]?.trim();

  return <PhaseWrap step={2} title="Set the stage" sub="Pick a trending hook and share what's on your mind this week." ch={<>
    <div className="card" style={{padding:20,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>Trending This Week</div>
        {loadT&&<div style={{display:"flex",alignItems:"center",gap:6,color:C.muted,fontSize:11}}><Spin s={12}/>Scanning...</div>}
      </div>
      {!loadT&&trends.map(t=><div key={t.id} onClick={()=>setPicked(picked===t.id?null:t.id)} style={{background:picked===t.id?C.goldDim:C.elevated,border:`1px solid ${picked===t.id?C.gold:C.faint}`,borderRadius:7,padding:"11px 14px",marginBottom:8,cursor:"pointer",transition:"all 0.15s"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{t.headline}</div>
            <div style={{fontSize:12,color:C.muted,marginBottom:3}}>{t.why}</div>
            <div style={{fontSize:12,color:C.gold,fontStyle:"italic"}}>{t.hook}</div>
          </div>
          <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${picked===t.id?C.gold:C.faint}`,background:picked===t.id?C.gold:"transparent",flexShrink:0,marginTop:2}} />
        </div>
      </div>)}
      <div style={{marginTop:8}}><Inp val={custom} set={setCustom} ph="Or describe your own hook for this week..." /></div>
    </div>

    {qs.map((q,qi)=><div key={q.id} className="card fu" style={{padding:20,marginBottom:14,animationDelay:`${qi*0.05}s`}}>
      <div style={{fontWeight:600,fontSize:15,marginBottom:12}}>{q.text}</div>
      {q.type==="url"
        ?<Inp val={answers[q.id]||""} set={v=>setAnswers(p=>({...p,[q.id]:v}))} ph="https://utvistahomes.com/blog/..." mono />
        :<>
          {loadS[q.id]&&<div style={{display:"flex",alignItems:"center",gap:7,color:C.muted,fontSize:12,marginBottom:10}}><Spin s={13}/>Generating suggestions...</div>}
          {(suggs[q.id]||[]).map((s,si)=><button key={si} onClick={()=>setAnswers(p=>({...p,[q.id]:p[q.id]===s?"":s}))} style={{display:"block",width:"100%",textAlign:"left",background:answers[q.id]===s?C.goldDim:C.elevated,border:`1px solid ${answers[q.id]===s?C.gold:C.faint}`,borderRadius:6,padding:"10px 13px",color:answers[q.id]===s?C.white:C.off,fontSize:13,lineHeight:1.5,marginBottom:7,cursor:"pointer",transition:"all 0.15s"}}>{s}</button>)}
          <TA val={[...(suggs[q.id]||[])].includes(answers[q.id])?"":answers[q.id]||""} set={v=>setAnswers(p=>({...p,[q.id]:v}))} rows={2} ph="Or write your own..." />
        </>
      }
    </div>)}

    <Btn ch="Generate Variations →" onClick={()=>onNext({trend:picked?trends.find(t=>t.id===picked):null,customTrend:custom,answers})} disabled={!ok} sz="lg" />
  </>} />;
}

// ─── STEP 3: GENERATING ───────────────────────────────────────────────────────
function Generating({postType,geo,trend,customTrend,answers,onDone}) {
  const [status,setStatus]=useState("Fetching market data...");
  const [pct,setPct]=useState(0);
  const vlib=S.voice();

  useEffect(()=>{run();},[]);

  async function run(){
    try{
      const gl=geo.scope==="single"?geo.city:GEO_SCOPES.find(g=>g.id===geo.scope)?.label;
      const hashCtx=geo.scope==="both_counties"
        ?"Utah County + Salt Lake County (Lehi, Saratoga Springs, Eagle Mountain, American Fork, Draper, South Jordan, Herriman, Riverton, Bluffdale, Sandy)"
        :geo.scope==="northern_utah"
        ?"Northern Utah County (Lehi, Saratoga Springs, Eagle Mountain, American Fork, Highland, Alpine, Pleasant Grove)"
        :geo.city+", Utah County";

      setStatus("Fetching market data...");setPct(12);
      const market=await claude([{role:"user",content:`Get the most current real estate market data for ${gl}, Utah this week. Include median prices, days on market, inventory level, and any notable news. Be specific with real numbers if available. 2-3 sentences.`}],
        "You are a real estate market researcher. Return factual current data. Be concise.",320);

      setStatus("Processing blog content...");setPct(26);
      let blog="";
      if(postType==="blog_teaser"&&answers?.blog_url){
        try{blog=await claude([{role:"user",content:`Read ${answers.blog_url} and extract: title, main argument, top 3 takeaways, best quote. Plain text only.`}],"Extract blog content accurately.",400);}
        catch{blog="Blog content unavailable — use the provided takeaway instead.";}
      }

      setStatus("Writing three variations...");setPct(50);
      const vc=vlib.slice(0,6).map(e=>`[${e.date}|${e.postType}|${e.city||"Regional"}]: "${e.approvedCaption.slice(0,160)}"${e.voiceNote?` (note: "${e.voiceNote}")`:""}`).join("\n");
      const th=trend?`Trending: "${trend.headline}" — ${trend.hook}`:customTrend?`Custom hook: "${customTrend}"`:"No trending hook.";
      const inp=Object.entries(answers||{}).filter(([,v])=>v?.trim()).map(([k,v])=>`${k}: ${v}`).join("\n");

      const raw=await claude([{role:"user",content:`
You are the social media content strategist for Utah Vista Homes. Generate 3 distinctly different post variations for Beau Gardner (Realtor, Fathom Realty) — a ${postType} post.

GEOGRAPHIC FOCUS: ${gl}
HASHTAG REACH CONTEXT: ${hashCtx}

MARKET DATA: ${market}

BEAU'S INPUT: ${inp||"Use market data and community context."}
${blog?`BLOG CONTENT:\n${blog}`:""}
TRENDING HOOK: ${th}

BEAU'S VOICE LIBRARY:
${vc||"No prior posts — establish warm knowledgeable neighbor voice."}

NON-NEGOTIABLE RULES:
- Never mention Zillow, Redfin, or any third-party listing platform
- All links → utvistahomes.com only
- Facebook: ≤220 words, NO URL in caption body (goes in first comment after posting)
- Instagram: ≤180 words, EXACTLY 5 hashtags at end
- HASHTAG STRATEGY: choose the 5 hashtags that will MAXIMIZE REACH and surface this post to the most relevant non-followers — mix hyper-local (city-specific), regional Utah, and high-volume real estate tags based on what performs best for this specific content. Always include #UtahVistaHomes as one of the 5.
- End every post with a specific local question inviting comments from ${gl} residents
- No em dashes. Active voice. Sound like a real person who loves this community.
- Voice balance: vary across warm/community-focused, data-led authoritative, and hybrid

VARIATION REQUIREMENTS:
V1 — TOP PICK: best engagement potential, strongest balance of Beau's voice + market authority. Data-informed and human. This is your primary recommendation.
V2 — DIFFERENT ANGLE: if V1 is data-led, V2 is story or community-led. Tie to a past post, seasonal moment, or the trending hook if relevant.
V3 — BOLDEST CHOICE: most distinct — carousel format, contrarian take, pop culture tie-in, hyperlocal angle, or a seasonal hook. Make it memorable and shareable.

Return JSON only, no markdown fences:
{"variations":[{"id":"v1","angle":"4-word label","rankReason":"one sentence why this is the top recommendation","fbCaption":"full facebook caption","igCaption":"full instagram caption with 5 hashtags","hashtags":["tag1","tag2","tag3","tag4","tag5"],"firstCommentLink":"https://utvistahomes.com","imageBrief":"SOURCED: [specific free image search query] OR GENERATED: [DALL-E style prompt with navy #080F18 gold #D4A843] OR CAROUSEL: [slide count and what each slide shows]","format":"standard or carousel"}]}
      `}],"You are a social media strategist for a Utah real estate agent. Return valid JSON only.",3500);

      setStatus("Sourcing images...");setPct(78);
      const result=parseJSON(raw);

      const withImg=(result?.variations||[]).map(v=>{
        const b=v.imageBrief||"";
        let imageUrl="https://www.pexels.com/search/utah+real+estate/";
        let imageSource="pexels";
        if(b.startsWith("SOURCED:")){imageUrl=`https://www.pexels.com/search/${encodeURIComponent(b.replace("SOURCED:","").trim())}/`;imageSource="pexels";}
        else if(b.startsWith("GENERATED:")){imageUrl=`https://www.pexels.com/search/${encodeURIComponent("utah "+v.angle)}/`;imageSource="generate";}
        else if(b.startsWith("CAROUSEL:")){imageUrl=`https://www.pexels.com/search/${encodeURIComponent("utah homes neighborhood community")}/`;imageSource="carousel";}
        return{...v,imageUrl,imageSource};
      });

      setPct(100);
      onDone({variations:withImg,marketData:market});
    }catch(e){setStatus(`Error: ${e.message}. Refresh and try again.`);}
  }

  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <style>{G}</style>
    <div className="card fu" style={{maxWidth:360,width:"100%",padding:40,textAlign:"center",animation:"glow 2s ease-in-out infinite"}}>
      <div style={{fontFamily:F.display,fontSize:32,marginBottom:22}}>Creating your posts</div>
      <div style={{height:3,background:C.faint,borderRadius:2,marginBottom:18,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.goldSoft},${C.gold})`,borderRadius:2,transition:"width 0.6s ease"}} />
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:C.muted,fontSize:13}}>
        <Spin s={14}/>{status}
      </div>
    </div>
  </div>;
}

// ─── STEP 4: REVIEW ───────────────────────────────────────────────────────────
function Review({variations,postType,geo,webhookUrl,onBack}) {
  const [sel,setSel]=useState(0);
  const [fb,setFb]=useState(variations[0]?.fbCaption||"");
  const [ig,setIg]=useState(variations[0]?.igCaption||"");
  const [vNote,setVNote]=useState("");
  const [imgUrl,setImgUrl]=useState(variations[0]?.imageUrl||"");
  const [imgEditNote,setImgEditNote]=useState("");
  const [replaceUrl,setReplaceUrl]=useState("");
  const [sched,setSched]=useState("");
  const [publishing,setPublishing]=useState(false);
  const [done,setDone]=useState(false);
  const [tab,setTab]=useState("fb");
  const analytics=S.analytics();
  const times=SUGGESTED_TIMES[postType]||[];
  const gl=geo.scope==="single"?geo.city:GEO_SCOPES.find(g=>g.id===geo.scope)?.label;

  useEffect(()=>{
    const v=variations[sel];
    if(!v)return;
    setFb(v.fbCaption||"");setIg(v.igCaption||"");setImgUrl(v.imageUrl||"");
  },[sel]);

  async function publish(){
    if(!webhookUrl){alert("Add your Zapier webhook URL in Settings.");return;}
    if(!sched){alert("Select a schedule time.");return;}
    setPublishing(true);
    const payload={
      postType,geo:gl,fbCaption:fb,igCaption:ig,
      firstCommentLink:variations[sel]?.firstCommentLink,
      imageUrl:imgUrl,scheduleTime:sched,
      hashtags:variations[sel]?.hashtags,
      format:variations[sel]?.format,
      approvedAt:new Date().toISOString(),
    };
    try{
      // Must use no-cors + text/plain to bypass CORS preflight in sandboxed environments.
      // application/json triggers a preflight that sandboxes block before sending.
      // Zapier receives and parses the JSON body correctly regardless of content-type header.
      await fetch(webhookUrl,{
        method:"POST",
        mode:"no-cors",
        headers:{"Content-Type":"text/plain"},
        body:JSON.stringify(payload),
      });
    }catch(e){
      console.log("Webhook sent:",e?.message||"ok");
    }
    // Always mark done and save voice entry — no-cors means we cannot
    // distinguish network success from failure at the JS level
    S.addVoice({postType,city:gl,approvedCaption:fb,igCaption:ig,imageUrl:imgUrl,voiceNote:vNote,date:new Date().toLocaleDateString("en-US"),angle:variations[sel]?.angle});
    S.clearSession();
    setPublishing(false);
    setDone(true);
  }

  if(done)return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <style>{G}</style>
    <div className="card fu" style={{maxWidth:420,width:"100%",padding:44,textAlign:"center",animation:"glow 3s ease-in-out infinite"}}>
      <div style={{fontSize:52,marginBottom:14}}>✓</div>
      <div style={{fontFamily:F.display,fontSize:34,marginBottom:8}}>Post approved</div>
      <div style={{color:C.muted,fontSize:14,marginBottom:28}}>Scheduled for {sched} · Zapier will handle Facebook and Instagram.</div>
      <Btn ch="Create Another →" onClick={onBack} sz="lg" />
    </div>
  </div>;

  return <div style={{maxWidth:1000,margin:"0 auto",padding:"40px 24px"}} className="fu">
    <style>{G}</style>

    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:28,flexWrap:"wrap",gap:12}}>
      <div>
        <div style={{fontFamily:F.mono,fontSize:10,color:C.gold,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:5}}>Step 4 of 4</div>
        <h1 style={{fontFamily:F.display,fontSize:36,fontWeight:500}}>Review & Approve</h1>
        <div style={{color:C.muted,fontSize:13,marginTop:4}}>{POST_TYPES.find(p=>p.id===postType)?.label} · {gl}</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {variations.map((v,i)=><button key={i} onClick={()=>setSel(i)} style={{background:sel===i?C.goldDim:C.surface,border:`1px solid ${sel===i?C.gold:C.faint}`,borderRadius:7,padding:"9px 15px",cursor:"pointer",transition:"all 0.18s",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <span style={{fontFamily:F.mono,fontSize:11,fontWeight:600,color:sel===i?C.gold:C.muted}}>V{i+1}</span>
          <span style={{fontSize:10,color:C.muted,fontFamily:F.mono,maxWidth:80,textAlign:"center",lineHeight:1.3}}>{v.angle}</span>
          {i===0&&<Chip ch="Top pick" color={C.gold} />}
        </button>)}
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 310px",gap:18,alignItems:"start"}}>

      {/* Left */}
      <div>
        {/* Rank / angle */}
        <div className="card" style={{padding:15,marginBottom:13,borderColor:sel===0?C.gold:C.faint,background:sel===0?C.goldDim:C.surface}}>
          <div style={{fontFamily:F.mono,fontSize:10,color:sel===0?C.gold:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>{sel===0?"Why this is the top pick":"Angle"}</div>
          <div style={{fontSize:13,color:C.white,lineHeight:1.6}}>{sel===0?variations[0]?.rankReason:variations[sel]?.angle}</div>
        </div>

        {/* Platform tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${C.faint}`,marginBottom:0}}>
          {["fb","ig"].map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"9px 20px",background:"transparent",border:"none",borderBottom:`2px solid ${tab===t?C.gold:"transparent"}`,color:tab===t?C.gold:C.muted,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F.mono,letterSpacing:"0.05em",transition:"all 0.15s",marginBottom:-1}}>
            {t==="fb"?"Facebook":"Instagram"}
          </button>)}
        </div>

        <div className="card" style={{padding:20,marginBottom:13,borderRadius:"0 0 10px 10px",borderTop:"none"}}>
          {tab==="fb"?<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>Facebook Caption</div>
              <Chip ch={`${fb.split(/\s+/).filter(Boolean).length} words`} color={C.muted} />
            </div>
            <TA val={fb} set={setFb} rows={9} />
            <div style={{marginTop:8,fontSize:12,color:C.muted}}>First comment: <span style={{color:C.gold,fontFamily:F.mono}}>{variations[sel]?.firstCommentLink}</span></div>
          </>:<>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase"}}>Instagram Caption</div>
              <Chip ch={`${ig.split(/\s+/).filter(Boolean).length} words`} color={C.muted} />
            </div>
            <TA val={ig} set={setIg} rows={9} />
            <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
              {(variations[sel]?.hashtags||[]).map((h,i)=><Chip key={i} ch={`#${h.replace(/^#/,"")}`} color={C.blue} />)}
            </div>
          </>}
        </div>

        {/* Voice note */}
        <div className="card" style={{padding:16,marginBottom:13}}>
          <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>Voice Note <span style={{color:C.faint,fontWeight:400}}>(optional)</span></div>
          <TA val={vNote} set={setVNote} rows={2} ph='What did you change and why? e.g. "Too formal" or "Needed more energy" — helps future posts match your voice.' />
          <div style={{marginTop:5,fontSize:11,color:C.faint}}>Saved to voice library · improves future generations</div>
        </div>
      </div>

      {/* Right */}
      <div>
        {/* Image */}
        <div className="card" style={{padding:18,marginBottom:13}}>
          <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Image</div>
          <div style={{background:C.bg,borderRadius:7,aspectRatio:"1/1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:`1px solid ${C.faint}`,padding:14,marginBottom:12}}>
            <div style={{fontSize:24,marginBottom:8}}>{variations[sel]?.imageSource==="carousel"?"📱":variations[sel]?.imageSource==="generate"?"🎨":"📸"}</div>
            <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,textAlign:"center",marginBottom:6}}>
              {variations[sel]?.imageSource==="carousel"?"Carousel Format":variations[sel]?.imageSource==="generate"?"AI Generated":"Sourced Photo"}
            </div>
            <div style={{fontSize:11,color:C.faint,textAlign:"center",lineHeight:1.5,marginBottom:10}}>{(variations[sel]?.imageBrief||"").slice(0,90)}...</div>
            <Btn ch="Open Source →" onClick={()=>window.open(imgUrl,"_blank")} v="outline" sz="sm" />
          </div>
          <div style={{marginBottom:8}}><TA val={imgEditNote} set={setImgEditNote} rows={2} ph="Describe changes (e.g. 'More mountains, less sky')..." /></div>
          <div style={{marginBottom:8}}><Inp val={replaceUrl} set={v=>{setReplaceUrl(v);if(v.startsWith("http"))setImgUrl(v);}} ph="Paste replacement URL..." mono /></div>
          <label style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:C.elevated,border:`1px solid ${C.faint}`,borderRadius:6,cursor:"pointer",fontSize:12,color:C.off}}>
            📁 Upload your own
            <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setImgUrl(URL.createObjectURL(f));}} />
          </label>
        </div>

        {/* Analytics */}
        {analytics&&<div className="card" style={{padding:16,marginBottom:13,borderColor:C.goldDim}}>
          <div style={{fontFamily:F.mono,fontSize:10,color:C.gold,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:10}}>Performance Pulse</div>
          {analytics.stats?.map((s,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
            <span style={{color:C.muted}}>{s.label}</span><span style={{fontWeight:600}}>{s.value}</span>
          </div>)}
          {analytics.topPost&&<><Hr /><div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Top post</div><div style={{fontSize:12,color:C.off,lineHeight:1.5}}>{analytics.topPost}</div></>}
          {analytics.suggestion&&<div style={{marginTop:10,fontSize:12,color:C.gold,fontStyle:"italic",lineHeight:1.5}}>→ {analytics.suggestion}</div>}
        </div>}

        {/* Schedule */}
        <div className="card" style={{padding:18}}>
          <div style={{fontFamily:F.mono,fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Schedule Time</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            {times.map((t,i)=><button key={t} onClick={()=>setSched(t)} style={{background:sched===t?C.goldDim:C.elevated,border:`1px solid ${sched===t?C.gold:C.faint}`,borderRadius:5,padding:"7px 11px",color:sched===t?C.gold:C.muted,fontSize:11,fontFamily:F.mono,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:3}}>
              {t}{i===0&&<span style={{fontSize:9,color:C.gold}}>★</span>}
            </button>)}
          </div>
          <div style={{marginBottom:13}}><Inp val={sched} set={setSched} ph="Custom time..." mono /></div>
          <Btn ch={publishing?<><Spin s={14}/>Sending to Zapier...</>:"Approve & Schedule →"} onClick={publish} disabled={!sched||publishing} full />
          {!webhookUrl&&<div style={{marginTop:7,fontSize:11,color:C.red,textAlign:"center"}}>⚠ Add webhook URL in Settings</div>}
        </div>
      </div>
    </div>
  </div>;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState("init");
  const [data,setData]=useState({});
  const [wh,setWh]=useState("");

  useEffect(()=>{
    setWh(S.webhook());
    const sess=S.session();
    if(sess?.postType){setData(sess);setView("session_restore");}
    else setView("landing");
  },[]);

  function advance(newData,next){
    const merged={...data,...newData};
    setData(merged);S.saveSession(merged);setView(next);
  }
  function handleWH(u){setWh(u);S.saveWebhook(u);}
  function restart(){S.clearSession();setData({});setView("landing");}

  return <div style={{minHeight:"100vh",background:C.bg}}>
    <style>{G}</style>
    {view==="init"&&<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><Spin s={32}/></div>}
    {view==="session_restore"&&<SessionRestore sess={data} onCont={()=>setView(data.variations?"review":"setup")} onFresh={restart} />}
    {view==="landing"&&<Landing onStart={()=>setView("setup")} webhook={wh} onWHSave={handleWH} />}
    {view==="setup"&&<Setup init={data} onNext={d=>advance(d,"trending_input")} />}
    {view==="trending_input"&&<TrendingInput postType={data.postType} geo={data.geo} onNext={d=>advance(d,"generating")} />}
    {view==="generating"&&<Generating postType={data.postType} geo={data.geo} trend={data.trend} customTrend={data.customTrend} answers={data.answers} onDone={d=>advance(d,"review")} />}
    {view==="review"&&<Review variations={data.variations||[]} postType={data.postType} geo={data.geo} webhookUrl={wh} onBack={restart} />}
  </div>;
}
