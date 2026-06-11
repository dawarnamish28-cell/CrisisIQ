let page='',map=null,heat=null,charts={},heatOn=false,imgData=null,aiRes=null;

function go(p){page=p;history.pushState({},'',p==='home'?'/':'/'+p);render()}
window.addEventListener('popstate',()=>{page=location.pathname.replace('/','') || 'home';render()});

function toast(msg,t='in'){
  document.querySelectorAll('.toast').forEach(e=>e.remove());
  const d=document.createElement('div');
  d.className='toast toast-'+t;
  d.innerHTML=`<i class="fas fa-${t==='ok'?'check-circle':t==='er'?'times-circle':'info-circle'}"></i> ${msg}`;
  document.body.appendChild(d);
  setTimeout(()=>d.remove(),3000);
}

async function api(path,opts={}){
  const r=await fetch(path,{headers:{'Content-Type':'application/json',...opts.headers},...opts});
  if(!r.ok) throw new Error('Request failed');
  return r.json();
}

function timeAgo(d){
  if(!d) return '';
  const s=Math.floor((Date.now()-new Date(d+(d.includes('Z')?'':'Z')).getTime())/1000);
  if(s<60) return 'now';if(s<3600) return Math.floor(s/60)+'m';if(s<86400) return Math.floor(s/3600)+'h';return Math.floor(s/86400)+'d';
}

function nav(){
  const lnk=[
    {id:'home',ic:'fa-house',lb:'Home'},
    {id:'report',ic:'fa-circle-exclamation',lb:'Report'},
    {id:'map',ic:'fa-map-location-dot',lb:'Map'},
    {id:'dashboard',ic:'fa-chart-line',lb:'Dashboard'},
    {id:'command-center',ic:'fa-terminal',lb:'AI Center'},
    {id:'shelters',ic:'fa-hospital',lb:'Shelters'},
    {id:'resources',ic:'fa-cubes-stacked',lb:'Resources'},
    {id:'volunteers',ic:'fa-people-group',lb:'Volunteers'},
  ];
  return `<nav class="topbar"><div class="max-w-7xl mx-auto px-4 sm:px-6"><div class="flex items-center justify-between h-14">
    <div class="flex items-center gap-2.5 cursor-pointer select-none" onclick="go('home')">
      <div style="width:32px;height:32px;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:8px;display:flex;align-items:center;justify-content:center"><i class="fas fa-shield-halved text-white text-sm"></i></div>
      <span class="text-[15px] font-bold tracking-tight text-white">CrisisIQ</span>
    </div>
    <div class="dsk flex items-center gap-0.5 overflow-x-auto">${lnk.map(l=>`<a class="nl ${page===l.id?'on':''}" onclick="go('${l.id}')"><i class="fas ${l.ic}"></i><span class="hidden lg:inline">${l.lb}</span></a>`).join('')}</div>
    <div class="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full" style="background:rgba(25,135,84,.08);border:1px solid rgba(25,135,84,.18)"><div class="w-1.5 h-1.5 rounded-full bg-emerald-400" style="animation:pulse-ring 2s infinite"></div><span class="text-[10.5px] font-semibold text-emerald-400 tracking-wider">LIVE</span></div>
  </div></div></nav>
  <div class="mnav">${lnk.slice(0,5).map(l=>`<a class="mnl ${page===l.id?'on':''}" onclick="go('${l.id}')"><i class="fas ${l.ic}"></i>${l.lb}</a>`).join('')}</div>`;
}

async function home(){
  let s={};try{s=await api('/api/stats')}catch(e){}
  return `<section class="relative overflow-hidden"><div class="hero-glow"></div><div class="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center relative">
    <div class="ain">
      <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-s text-[12px] text-[#4f8ff7] mb-7 font-medium">
        <i class="fas fa-satellite-dish text-[10px]"></i> Delhi NCR Emergency Response Network
      </div>
      <h1 class="text-[clamp(2rem,5.5vw,4.2rem)] font-extrabold mb-5 leading-[1.1] tracking-tight">
        <span class="text-white">Disaster Intelligence</span><br><span style="background:linear-gradient(135deg,#4f8ff7,#a76fe0);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Command Platform</span>
      </h1>
      <p class="text-[15px] sm:text-[17px] text-[#6b7a90] max-w-xl mx-auto mb-9 leading-relaxed">
        Real-time incident coordination, AI-driven severity assessment, and resource allocation across Delhi NCR's emergency infrastructure.
      </p>
      <div class="flex flex-wrap justify-center gap-3 mb-14">
        <button onclick="go('report')" class="btn btn-p text-[14px] px-7 py-2.5"><i class="fas fa-circle-exclamation"></i> Report Emergency</button>
        <button onclick="go('dashboard')" class="btn btn-g text-[14px] px-7 py-2.5"><i class="fas fa-chart-line"></i> Open Dashboard</button>
      </div>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
      ${[{l:'Active Incidents',v:s.activeIncidents||0,ic:'fa-bolt',c:'#f06562'},{l:'Critical',v:s.criticalIncidents||0,ic:'fa-triangle-exclamation',c:'#e6a23c'},{l:'Shelter Load',v:(s.shelterOccupancy||0)+'%',ic:'fa-hospital',c:'#4f8ff7'},{l:'Responders',v:s.totalVolunteers||0,ic:'fa-user-shield',c:'#27ae60'}].map((x,i)=>`
        <div class="glass p-4 ain d${i+1} card-lift text-center">
          <div style="color:${x.c}" class="text-xl mb-1.5"><i class="fas ${x.ic}"></i></div>
          <div class="sv text-white">${x.v}</div>
          <div class="text-[10.5px] text-[#4a5568] mt-1 font-medium tracking-wide uppercase">${x.l}</div>
        </div>`).join('')}
    </div>
  </div></section>
  <section class="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${[{t:'Incident Reporting',d:'Submit field reports with photographic evidence. The AI engine assesses severity, classifies the disaster type, and queues it for dispatch.',ic:'fa-camera-retro',c:'#4f8ff7',p:'report'},
        {t:'Situation Map',d:'All active incidents plotted on a live map of Delhi NCR with colour-coded severity markers and a toggleable heatmap layer.',ic:'fa-earth-asia',c:'#27ae60',p:'map'},
        {t:'AI Command Center',d:'Automated situational briefings, AI-ranked priority queue, and actionable recommendations generated from live operational data.',ic:'fa-terminal',c:'#a76fe0',p:'command-center'},
        {t:'Operations Dashboard',d:'Aggregated statistics, category and severity breakdowns, and a dispatch-ready incident management console.',ic:'fa-gauge-high',c:'#06b6d4',p:'dashboard'},
        {t:'Shelter Network',d:'Real-time occupancy, resource levels, and status of every hospital, relief camp, and rescue centre in the network.',ic:'fa-hospital',c:'#e6a23c',p:'shelters'},
        {t:'Volunteer Ops',d:'Registered responders, skill matching, mission assignment tracking, and availability status across all field personnel.',ic:'fa-handshake-angle',c:'#ec4899',p:'volunteers'},
      ].map((f,i)=>`
        <div class="glass p-5 card-lift cursor-pointer ain d${(i%5)+1}" onclick="go('${f.p}')">
          <div class="w-10 h-10 rounded-[10px] flex items-center justify-center mb-3" style="background:${f.c}12;border:1px solid ${f.c}22"><i class="fas ${f.ic}" style="color:${f.c}"></i></div>
          <h3 class="text-[14.5px] font-semibold text-white mb-1.5">${f.t}</h3>
          <p class="text-[12.5px] text-[#6b7a90] leading-relaxed">${f.d}</p>
        </div>`).join('')}
    </div>
  </section>`;
}

function reportPage(){
  return `<div class="max-w-3xl mx-auto px-4 sm:px-6 py-7">
    <div class="mb-6 ain"><h1 class="text-2xl font-bold text-white mb-1">Report an Emergency</h1><p class="text-[13px] text-[#6b7a90]">Provide as much detail as possible. The AI engine will assess severity automatically.</p></div>
    <form id="rf" class="space-y-5 ain d1" onsubmit="submitReport(event)">
      <div class="grid sm:grid-cols-2 gap-5">
        <div><label class="fl">Incident Type *</label><select id="rc" class="fi" required><option value="">Select...</option><option value="Flood">Flood</option><option value="Fire">Fire</option><option value="Earthquake">Earthquake</option><option value="Landslide">Landslide</option><option value="Cyclone">Cyclone</option><option value="Building Collapse">Building Collapse</option><option value="Medical Emergency">Medical Emergency</option><option value="Road Blockage">Road Blockage</option></select></div>
        <div><label class="fl">Your Name</label><input type="text" id="rn" class="fi" placeholder="Full name"></div>
      </div>
      <div><label class="fl">Description *</label><textarea id="rd" class="fi" placeholder="What is happening? How many people are affected? What dangers are present? Be specific." required></textarea></div>
      <div class="grid sm:grid-cols-2 gap-5">
        <div><label class="fl">Location / Landmark</label><input type="text" id="rl" class="fi" placeholder="e.g. Near ITO Flyover, Yamuna Bank"></div>
        <div><label class="fl">Phone</label><input type="tel" id="rp" class="fi" placeholder="+91-XXXXX-XXXXX"></div>
      </div>
      <div class="grid sm:grid-cols-2 gap-5">
        <div><label class="fl">Latitude *</label><input type="number" id="rla" class="fi" step="any" placeholder="28.6139" required></div>
        <div><label class="fl">Longitude *</label><input type="number" id="rlo" class="fi" step="any" placeholder="77.2090" required></div>
      </div>
      <button type="button" class="btn btn-g btn-xs" onclick="detectLoc()"><i class="fas fa-location-crosshairs"></i> Use My Location</button>
      <div><label class="fl">Upload Evidence Photo</label>
        <div id="uz" class="upz" onclick="document.getElementById('ri').click()">
          <input type="file" id="ri" accept="image/*" class="hidden" onchange="handleImg(event)">
          <div id="upv" class="hidden"></div>
          <div id="upl"><i class="fas fa-cloud-arrow-up text-3xl text-[#2a3347] mb-2"></i><p class="text-[#4a5568] text-[12.5px]">Click to upload or drag an image here</p><p class="text-[#2a3347] text-[10.5px] mt-1">PNG, JPG, WebP — max 5 MB</p></div>
        </div>
      </div>
      <div id="aib" class="hidden"></div>
      <div class="flex gap-3 pt-2">
        <button type="button" class="btn btn-w flex-1" onclick="runAI()"><i class="fas fa-microchip"></i> Analyze with AI</button>
        <button type="submit" class="btn btn-p flex-1"><i class="fas fa-paper-plane"></i> Submit Report</button>
      </div>
    </form></div>`;
}

function detectLoc(){
  if('geolocation' in navigator){
    navigator.geolocation.getCurrentPosition(p=>{document.getElementById('rla').value=p.coords.latitude.toFixed(6);document.getElementById('rlo').value=p.coords.longitude.toFixed(6);toast('Location acquired','ok')},()=>{
      document.getElementById('rla').value=(28.58+Math.random()*.1).toFixed(6);document.getElementById('rlo').value=(77.17+Math.random()*.1).toFixed(6);toast('Approximate location set','in');
    });
  } else {document.getElementById('rla').value='28.6139';document.getElementById('rlo').value='77.2090'}
}

function handleImg(e){
  const f=e.target.files[0];if(!f)return;
  if(f.size>5*1024*1024){toast('File exceeds 5 MB limit','er');return}
  const r=new FileReader();
  r.onload=ev=>{imgData=ev.target.result;document.getElementById('upv').innerHTML=`<img src="${ev.target.result}" class="max-h-44 mx-auto rounded-lg mb-2"><p class="text-[12px] text-emerald-400"><i class="fas fa-check"></i> ${f.name}</p>`;document.getElementById('upv').classList.remove('hidden');document.getElementById('upl').classList.add('hidden')};
  r.readAsDataURL(f);
}

async function runAI(){
  const cat=document.getElementById('rc').value,desc=document.getElementById('rd').value;
  if(!cat&&!desc){toast('Add a description or select the incident type first','er');return}
  const box=document.getElementById('aib');box.classList.remove('hidden');
  box.innerHTML=`<div class="ai-card flex items-center gap-4"><div class="spinner"></div><div><p class="text-[#4f8ff7] font-semibold text-[13.5px]">Running analysis...</p><p class="text-[12px] text-[#4a5568]">Evaluating description, category signals, and image data</p></div></div>`;
  try{
    const r=await api('/api/ai/analyze',{method:'POST',body:JSON.stringify({category:cat,description:desc,image_data:imgData?'present':null})});
    aiRes=r;
    const cc=r.confidence>85?'#27ae60':r.confidence>70?'#e6a23c':'#f06562';
    const sc=r.severity==='Critical'?'#f06562':r.severity==='High'?'#e6a23c':r.severity==='Moderate'?'#c4a730':'#27ae60';
    box.innerHTML=`<div class="ai-card ain">
      <div class="flex items-center gap-2.5 mb-4">
        <div class="w-9 h-9 rounded-[9px] flex items-center justify-center" style="background:rgba(79,143,247,.1)"><i class="fas fa-microchip text-[#4f8ff7] text-sm"></i></div>
        <div><h3 class="font-semibold text-white text-[13.5px]">Analysis Complete</h3><p class="text-[10.5px] text-[#4a5568]">${r.factors_detected} classification signals · ${r.critical_indicators} critical indicators</p></div>
        ${r.image_analyzed?'<span class="tag tag-verified ml-auto"><i class="fas fa-image"></i> Image</span>':''}
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div class="text-center p-2.5 rounded-lg" style="background:rgba(255,255,255,.03)"><div class="text-[10px] text-[#4a5568] mb-0.5">Type</div><div class="font-bold text-white text-[13px]">${r.category}</div></div>
        <div class="text-center p-2.5 rounded-lg" style="background:rgba(255,255,255,.03)"><div class="text-[10px] text-[#4a5568] mb-0.5">Confidence</div><div class="font-bold text-[13px]" style="color:${cc}">${r.confidence}%</div></div>
        <div class="text-center p-2.5 rounded-lg" style="background:rgba(255,255,255,.03)"><div class="text-[10px] text-[#4a5568] mb-0.5">Severity</div><div class="font-bold text-[13px]" style="color:${sc}">${r.severity}</div></div>
        <div class="text-center p-2.5 rounded-lg" style="background:rgba(255,255,255,.03)"><div class="text-[10px] text-[#4a5568] mb-0.5">Urgency</div><div class="font-bold text-[13px]" style="color:${sc}">${r.urgency}</div></div>
      </div>
      <p class="text-[12.5px] text-[#8a95a5] leading-relaxed">${r.explanation}</p>
    </div>`;
    toast('Analysis complete','ok');
  }catch(e){box.innerHTML=`<div class="ai-card"><p class="text-[#f06562] text-[13px]"><i class="fas fa-xmark"></i> Analysis unavailable. You can still submit the report manually.</p></div>`}
}

async function submitReport(e){
  e.preventDefault();const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;btn.innerHTML='<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Submitting...';
  const ar=aiRes||{};
  try{
    const r=await api('/api/incidents',{method:'POST',body:JSON.stringify({category:document.getElementById('rc').value,description:document.getElementById('rd').value,latitude:parseFloat(document.getElementById('rla').value),longitude:parseFloat(document.getElementById('rlo').value),location_name:document.getElementById('rl').value,reporter_name:document.getElementById('rn').value,reporter_phone:document.getElementById('rp').value,severity:ar.severity||'Moderate',urgency:ar.urgency||'Medium',ai_confidence:ar.confidence||0,ai_explanation:ar.explanation||'',image_data:imgData?'uploaded':null})});
    toast('Incident reported — '+r.report_id,'ok');aiRes=null;imgData=null;setTimeout(()=>go('map'),1200);
  }catch(ex){toast('Submission failed','er');btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Submit Report'}
}

async function mapPage(){
  const[inc,sh]=await Promise.all([api('/api/incidents').catch(()=>[]),api('/api/shelters').catch(()=>[])]);
  setTimeout(()=>initMap(inc,sh),80);
  return `<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4 ain">
      <div><h1 class="text-xl font-bold text-white">Live Situation Map</h1><p class="text-[12px] text-[#4a5568]">${inc.length} incidents · ${sh.length} facilities · Delhi NCR</p></div>
      <div class="flex gap-2"><button class="btn btn-xs btn-g" onclick="toggleHeat()"><i class="fas fa-fire"></i> Heatmap</button><button class="btn btn-xs btn-g" onclick="map&&map.setView([28.62,77.22],11)"><i class="fas fa-expand"></i> Reset</button></div>
    </div>
    <div class="mcon ain d1" style="height:calc(100vh - 170px);min-height:460px"><div id="m" style="height:100%;width:100%"></div></div>
    <div class="flex flex-wrap gap-4 mt-3 ain d2">${[{l:'Critical',c:'#f06562'},{l:'High',c:'#e6a23c'},{l:'Moderate',c:'#c4a730'},{l:'Low / Shelter',c:'#27ae60'}].map(x=>`<div class="flex items-center gap-1.5 text-[11px] text-[#4a5568]"><span style="width:10px;height:10px;border-radius:50%;background:${x.c};display:inline-block"></span>${x.l}</div>`).join('')}</div>
  </div>`;
}

function initMap(inc,sh){
  if(map){map.remove();map=null;heat=null;heatOn=false}
  const el=document.getElementById('m');if(!el)return;
  map=L.map('m',{zoomControl:true}).setView([28.62,77.22],11);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; OSM & CartoDB',maxZoom:19}).addTo(map);
  const sc={Critical:'#f06562',High:'#e6a23c',Moderate:'#c4a730',Low:'#27ae60'};
  const ci={Flood:'\u{1F30A}',Fire:'\u{1F525}',Earthquake:'\u{1F3DA}',Landslide:'\u26F0\uFE0F',Cyclone:'\u{1F32A}','Building Collapse':'\u{1F3D7}','Medical Emergency':'\u{1F691}','Road Blockage':'\u{1F6A7}'};
  const hd=[];
  inc.forEach(i=>{
    const col=sc[i.severity]||'#c4a730';
    const int=i.severity==='Critical'?1:i.severity==='High'?.7:i.severity==='Moderate'?.4:.2;
    hd.push([i.latitude,i.longitude,int]);
    L.circleMarker([i.latitude,i.longitude],{radius:i.severity==='Critical'?11:i.severity==='High'?9:7,fillColor:col,color:col,weight:2,opacity:.85,fillOpacity:.35}).addTo(map)
      .bindPopup(`<div style="min-width:190px"><div style="font-size:15px;margin-bottom:3px">${ci[i.category]||'\u26A0\uFE0F'} <strong>${i.category}</strong></div><div style="font-size:10px;color:#4a5568;margin-bottom:6px">${i.report_id} · ${i.location_name||''}</div><div style="margin-bottom:5px"><span class="tag tag-${i.severity.toLowerCase()}">${i.severity}</span> <span class="tag tag-${i.status}">${i.status.replace('_',' ')}</span></div><p style="font-size:11.5px;color:#8a95a5;line-height:1.5;margin-bottom:5px">${(i.description||'').slice(0,110)}${i.description?.length>110?'...':''}</p>${i.assigned_team?`<div style="font-size:10.5px;color:#a76fe0"><i class="fas fa-users"></i> ${i.assigned_team}</div>`:''}</div>`);
  });
  const si={shelter:'\u{1F3E0}',hospital:'\u{1F3E5}',rescue_center:'\u{1F692}'};
  sh.forEach(s=>{
    const pct=s.capacity>0?Math.round(s.occupancy/s.capacity*100):0;
    const col=pct>90?'#f06562':pct>70?'#e6a23c':'#27ae60';
    L.marker([s.latitude,s.longitude],{icon:L.divIcon({html:`<div style="font-size:20px;text-align:center;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))">${si[s.type]||'\u{1F3E0}'}</div>`,iconSize:[28,28],className:''})}).addTo(map)
      .bindPopup(`<div style="min-width:190px"><strong>${s.name}</strong><div style="font-size:10px;color:#4a5568;margin:3px 0">${s.type.replace('_',' ').toUpperCase()} · ${s.address||''}</div><div style="margin:6px 0"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px"><span>Occupancy</span><span style="color:${col};font-weight:700">${s.occupancy}/${s.capacity} (${pct}%)</span></div><div class="pbar"><div class="pfill" style="width:${pct}%;background:${col}"></div></div></div>${s.contact_phone?`<div style="font-size:10px;color:#4a5568"><i class="fas fa-phone"></i> ${s.contact_phone}</div>`:''}</div>`);
  });
  if(hd.length) heat=L.heatLayer(hd,{radius:30,blur:22,maxZoom:15,max:1,gradient:{.2:'#27ae60',.4:'#c4a730',.6:'#e6a23c',.8:'#f06562',1:'#b91c1c'}});
  setTimeout(()=>map&&map.invalidateSize(),150);
}
function toggleHeat(){if(!map||!heat)return;heatOn?(map.removeLayer(heat),heatOn=false,toast('Heatmap off','in')):(heat.addTo(map),heatOn=true,toast('Heatmap on','in'))}

async function dashboard(){
  const[st,inc,cats,sev]=await Promise.all([api('/api/stats').catch(()=>({})),api('/api/incidents?limit=12').catch(()=>[]),api('/api/stats/categories').catch(()=>[]),api('/api/stats/severity').catch(()=>[])]);
  setTimeout(()=>initCharts(cats,sev),150);
  return `<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5 ain"><div><h1 class="text-xl font-bold text-white">Operations Dashboard</h1><p class="text-[12px] text-[#4a5568]">Aggregated view of all active operations</p></div><button class="btn btn-xs btn-g" onclick="render()"><i class="fas fa-rotate"></i> Refresh</button></div>
    <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">${[{l:'Total',v:st.totalIncidents||0,ic:'fa-layer-group',c:'#4f8ff7'},{l:'Active',v:st.activeIncidents||0,ic:'fa-bolt',c:'#e6a23c'},{l:'Critical',v:st.criticalIncidents||0,ic:'fa-skull-crossbones',c:'#f06562'},{l:'Shelter Load',v:(st.shelterOccupancy||0)+'%',ic:'fa-hospital',c:'#a76fe0'},{l:'Responders',v:`${st.availableVolunteers||0}/${st.totalVolunteers||0}`,ic:'fa-user-shield',c:'#27ae60'}].map((x,i)=>`<div class="glass p-4 ain d${i+1} card-lift"><div class="flex items-center justify-between mb-2.5"><div class="w-10 h-10 rounded-[10px] flex items-center justify-center" style="background:${x.c}0f"><i class="fas ${x.ic}" style="color:${x.c}"></i></div></div><div class="sv text-white">${x.v}</div><div class="text-[10px] text-[#4a5568] mt-0.5 font-medium tracking-wide uppercase">${x.l}</div></div>`).join('')}</div>
    <div class="grid lg:grid-cols-2 gap-4 mb-6">
      <div class="glass p-5 ain d2"><h3 class="font-semibold text-white text-[13.5px] mb-3"><i class="fas fa-chart-pie text-[#4f8ff7] mr-1.5"></i>By Category</h3><div style="height:260px"><canvas id="cc"></canvas></div></div>
      <div class="glass p-5 ain d3"><h3 class="font-semibold text-white text-[13.5px] mb-3"><i class="fas fa-chart-bar text-[#a76fe0] mr-1.5"></i>By Severity</h3><div style="height:260px"><canvas id="cs"></canvas></div></div>
    </div>
    <div class="glass p-5 ain d4">
      <div class="flex items-center justify-between mb-3"><h3 class="font-semibold text-white text-[13.5px]"><i class="fas fa-list-check text-cyan-400 mr-1.5"></i>Incident Console</h3>
        <select id="fs" class="fi py-1 text-[11px]" style="width:auto" onchange="filterInc()"><option value="all">All</option><option value="reported">Reported</option><option value="verified">Verified</option><option value="dispatched">Dispatched</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option></select>
      </div>
      <div class="overflow-x-auto"><table class="dtbl"><thead><tr><th>ID</th><th>Type</th><th>Location</th><th>Severity</th><th>Status</th><th>Team</th><th>Time</th><th>Actions</th></tr></thead><tbody id="itb">${inc.map(i=>incRow(i)).join('')}</tbody></table></div>
    </div></div>`;
}

function incRow(i){
  const ic={Flood:'\u{1F30A}',Fire:'\u{1F525}',Earthquake:'\u{1F3DA}',Landslide:'\u26F0\uFE0F',Cyclone:'\u{1F32A}','Building Collapse':'\u{1F3D7}','Medical Emergency':'\u{1F691}','Road Blockage':'\u{1F6A7}'};
  return `<tr><td class="font-mono text-[11px] text-[#4a5568]">${i.report_id}</td><td class="text-[12.5px]">${ic[i.category]||''} ${i.category}</td><td class="text-[12px] text-[#8a95a5]">${(i.location_name||'').slice(0,28)}</td><td><span class="tag tag-${i.severity.toLowerCase()}">${i.severity}</span></td><td><span class="tag tag-${i.status}">${i.status.replace('_',' ')}</span></td><td class="text-[12px]">${i.assigned_team||'<span class="text-[#2a3347]">—</span>'}</td><td class="text-[11px] text-[#4a5568]">${timeAgo(i.created_at)}</td><td><div class="flex gap-1">${i.status==='reported'?`<button class="btn btn-xs btn-p" onclick="updInc(${i.id},'verified')"><i class="fas fa-check"></i></button>`:''} ${i.status==='verified'?`<button class="btn btn-xs btn-w" onclick="dispInc(${i.id})"><i class="fas fa-truck-fast"></i></button>`:''} ${['dispatched','in_progress'].includes(i.status)?`<button class="btn btn-xs btn-s" onclick="updInc(${i.id},'resolved')"><i class="fas fa-flag-checkered"></i></button>`:''}</div></td></tr>`;
}

async function filterInc(){try{const inc=await api('/api/incidents?status='+document.getElementById('fs').value+'&limit=15');document.getElementById('itb').innerHTML=inc.map(i=>incRow(i)).join('')}catch(e){}}
async function updInc(id,s){try{await api('/api/incidents/'+id,{method:'PATCH',body:JSON.stringify({status:s})});toast('Updated','ok');render()}catch(e){toast('Failed','er')}}
async function dispInc(id){
  const teams=['NDRF 2nd Bn Alpha','Delhi Fire Service Unit 3','SDRF Delta','Civil Defence Rapid Response','CATS Ambulance Team'];
  try{await api('/api/incidents/'+id,{method:'PATCH',body:JSON.stringify({status:'dispatched',assigned_team:teams[Math.floor(Math.random()*teams.length)]})});toast('Team dispatched','ok');render()}catch(e){toast('Failed','er')}
}

function initCharts(cats,sev){
  Object.values(charts).forEach(c=>c.destroy());charts={};
  const ce=document.getElementById('cc');
  if(ce){charts.c=new Chart(ce,{type:'doughnut',data:{labels:cats.map(c=>c.category),datasets:[{data:cats.map(c=>c.count),backgroundColor:['#4f8ff7','#f06562','#e6a23c','#c4a730','#27ae60','#a76fe0','#06b6d4','#ec4899'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#6b7a90',padding:10,usePointStyle:true,pointStyleWidth:8,font:{size:11}}}},cutout:'62%'}})}
  const se=document.getElementById('cs');
  if(se){const sm={Critical:'#f06562',High:'#e6a23c',Moderate:'#c4a730',Low:'#27ae60'};charts.s=new Chart(se,{type:'bar',data:{labels:sev.map(s=>s.severity),datasets:[{data:sev.map(s=>s.count),backgroundColor:sev.map(s=>sm[s.severity]||'#4a5568'),borderRadius:6,barThickness:36}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#4a5568',font:{size:11}}},y:{grid:{color:'rgba(148,163,184,.05)'},ticks:{color:'#4a5568',stepSize:1}}}}})}
}

async function cmdCenter(){
  let sum=null,q=[];
  try{[sum,q]=await Promise.all([api('/api/ai/summary'),api('/api/incidents/priority/queue')])}catch(e){}
  return `<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5 ain"><div><h1 class="text-xl font-bold text-white"><i class="fas fa-terminal text-[#a76fe0] mr-2"></i>AI Command Center</h1><p class="text-[12px] text-[#4a5568]">Automated intelligence from live operational data</p></div><div class="text-[10px] text-[#2a3347]">${sum?.generated_at?new Date(sum.generated_at).toLocaleTimeString():''}</div></div>
    <div class="glass p-5 mb-5 ain d1" style="border-left:3px solid #a76fe0">
      <div class="flex items-center gap-2.5 mb-3"><div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(167,111,224,.1)"><i class="fas fa-robot text-[#a76fe0] text-sm"></i></div><div><h2 class="font-bold text-white text-[14px]">Situation Brief</h2><p class="text-[10px] text-[#4a5568]">Auto-generated from current incident, shelter, and resource data</p></div></div>
      <div class="ai-text text-[13px] text-[#8a95a5] leading-relaxed">${(sum?.summary||'No data available.').split('\n\n').map(p=>'<p>'+p.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')+'</p>').join('')}</div>
    </div>
    ${sum?.metrics?`<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 ain d2">${[{l:'Active',v:sum.metrics.activeIncidents,c:'#4f8ff7'},{l:'Critical',v:sum.metrics.criticalIncidents,c:'#f06562'},{l:'High',v:sum.metrics.highPriorityIncidents,c:'#e6a23c'},{l:'Shelter',v:sum.metrics.shelterOccupancy+'%',c:'#a76fe0'},{l:'Available',v:sum.metrics.availableVolunteers,c:'#27ae60'},{l:'Total Resp.',v:sum.metrics.totalVolunteers,c:'#06b6d4'}].map(m=>`<div class="glass-s p-3 text-center"><div class="text-xl font-bold" style="color:${m.c}">${m.v}</div><div class="text-[9.5px] text-[#4a5568] mt-0.5 uppercase tracking-wider font-medium">${m.l}</div></div>`).join('')}</div>`:''}
    <div class="grid lg:grid-cols-2 gap-4 mb-5">
      <div class="glass p-5 ain d3"><h3 class="font-semibold text-white text-[13.5px] mb-3"><i class="fas fa-lightbulb text-amber-400 mr-1.5"></i>Recommendations</h3><div class="space-y-2">${(sum?.recommendations||[]).map((r,i)=>`<div class="flex gap-2.5 p-2.5 rounded-lg" style="background:rgba(255,255,255,.02)"><div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style="background:rgba(196,167,48,.1)"><span class="text-[10px] font-bold text-amber-400">${i+1}</span></div><p class="text-[12.5px] text-[#8a95a5]">${r}</p></div>`).join('')}</div></div>
      <div class="glass p-5 ain d4"><h3 class="font-semibold text-white text-[13.5px] mb-3"><i class="fas fa-book-medical text-emerald-400 mr-1.5"></i>Emergency Guidance</h3>
        <select id="gs" class="fi mb-3" onchange="loadGuide()"><option value="">Select disaster type...</option><option value="Flood">Flood</option><option value="Fire">Fire</option><option value="Earthquake">Earthquake</option><option value="Landslide">Landslide</option><option value="Cyclone">Cyclone</option><option value="Building Collapse">Building Collapse</option><option value="Medical Emergency">Medical Emergency</option><option value="Road Blockage">Road Blockage</option></select>
        <div id="gc" class="text-[12.5px] text-[#4a5568]">Select a type above to see protocols.</div>
      </div>
    </div>
    <div class="glass p-5 ain d5"><h3 class="font-semibold text-white text-[13.5px] mb-3"><i class="fas fa-ranking-star text-[#e6a23c] mr-1.5"></i>Priority Queue</h3><p class="text-[10px] text-[#2a3347] mb-3">Ranked by weighted severity, urgency, population density, and recency</p>
      <div class="overflow-x-auto"><table class="dtbl"><thead><tr><th>#</th><th>Score</th><th>ID</th><th>Type</th><th>Severity</th><th>Status</th><th>Location</th></tr></thead><tbody>${q.map((i,x)=>`<tr><td class="font-bold ${x<3?'text-[#f06562]':x<6?'text-[#e6a23c]':'text-[#4a5568]'}">${x+1}</td><td class="font-mono text-[12px] font-bold ${i.priority_score>90?'text-[#f06562]':i.priority_score>70?'text-[#e6a23c]':'text-[#c4a730]'}">${i.priority_score.toFixed(1)}</td><td class="font-mono text-[10.5px] text-[#4a5568]">${i.report_id}</td><td class="text-[12.5px]">${i.category}</td><td><span class="tag tag-${i.severity.toLowerCase()}">${i.severity}</span></td><td><span class="tag tag-${i.status}">${i.status.replace('_',' ')}</span></td><td class="text-[12px] text-[#8a95a5]">${(i.location_name||'').slice(0,30)}</td></tr>`).join('')}</tbody></table></div>
    </div></div>`;
}

async function loadGuide(){
  const c=document.getElementById('gs').value,b=document.getElementById('gc');
  if(!c){b.innerHTML='Select a type above.';return}
  b.innerHTML='<div class="flex items-center gap-2"><div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Loading...</div>';
  try{
    const d=await api('/api/ai/guidance',{method:'POST',body:JSON.stringify({category:c})});
    b.innerHTML=`<div class="space-y-3">
      <div><h4 class="text-[12px] font-semibold text-emerald-400 mb-1.5"><i class="fas fa-shield-halved mr-1"></i>Safety Steps</h4><ul class="space-y-0.5">${d.steps.map(s=>`<li class="flex gap-1.5 text-[#8a95a5] text-[12px] leading-relaxed"><span class="text-emerald-400 mt-0.5 shrink-0">›</span>${s}</li>`).join('')}</ul></div>
      <div><h4 class="text-[12px] font-semibold text-[#4f8ff7] mb-1.5"><i class="fas fa-route mr-1"></i>Evacuation</h4><ul class="space-y-0.5">${d.evacuation.map(s=>`<li class="flex gap-1.5 text-[#8a95a5] text-[12px] leading-relaxed"><span class="text-[#4f8ff7] mt-0.5 shrink-0">›</span>${s}</li>`).join('')}</ul></div>
      <div><h4 class="text-[12px] font-semibold text-amber-400 mb-1.5"><i class="fas fa-hand-point-right mr-1"></i>Actions</h4><ul class="space-y-0.5">${d.actions.map(s=>`<li class="flex gap-1.5 text-[#8a95a5] text-[12px] leading-relaxed"><span class="text-amber-400 mt-0.5 shrink-0">›</span>${s}</li>`).join('')}</ul></div>
    </div>`;
  }catch(e){b.innerHTML='<p class="text-[#f06562]">Failed to load.</p>'}
}

async function sheltersPage(){
  const sh=await api('/api/shelters').catch(()=>[]);
  return `<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5 ain"><div><h1 class="text-xl font-bold text-white">Shelter & Hospital Network</h1><p class="text-[12px] text-[#4a5568]">${sh.length} facilities across Delhi NCR</p></div>
      <select id="ft" class="fi py-1 text-[11px]" style="width:auto" onchange="filterSh()"><option value="all">All</option><option value="shelter">Relief Camps</option><option value="hospital">Hospitals</option><option value="rescue_center">Rescue Centres</option></select>
    </div>
    <div id="sg" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">${sh.map((s,i)=>shCard(s,i)).join('')}</div></div>`;
}

function shCard(s,i){
  const pct=s.capacity>0?Math.round(s.occupancy/s.capacity*100):0;
  const col=pct>90?'#f06562':pct>70?'#e6a23c':pct>50?'#c4a730':'#27ae60';
  const sc={open:'#27ae60',full:'#f06562',closed:'#4a5568',emergency:'#e6a23c'};
  const ti={shelter:'fa-campground',hospital:'fa-hospital',rescue_center:'fa-truck-medical'};
  return `<div class="glass p-4 card-lift ain d${(i%5)+1}">
    <div class="flex items-center justify-between mb-2.5">
      <div class="flex items-center gap-2.5"><div class="w-9 h-9 rounded-[9px] flex items-center justify-center" style="background:${sc[s.status]||'#4f8ff7'}0f"><i class="fas ${ti[s.type]||'fa-building'}" style="color:${sc[s.status]||'#4f8ff7'}"></i></div><div><h3 class="font-semibold text-white text-[13px] leading-tight">${s.name}</h3><p class="text-[10px] text-[#4a5568]">${s.type.replace('_',' ').toUpperCase()}</p></div></div>
      <span class="tag tag-${s.status==='open'?'low':s.status==='emergency'?'high':s.status==='full'?'critical':'reported'}">${s.status}</span>
    </div>
    <div class="mb-2.5"><div class="flex justify-between text-[10.5px] mb-1"><span class="text-[#4a5568]">Occupancy</span><span class="font-semibold" style="color:${col}">${s.occupancy} / ${s.capacity} (${pct}%)</span></div><div class="pbar"><div class="pfill" style="width:${pct}%;background:${col}"></div></div></div>
    <div class="grid grid-cols-5 gap-0.5 text-center mb-2">${[{l:'H\u2082O',v:s.water,m:1000},{l:'Food',v:s.food,m:800},{l:'Med',v:s.medicine,m:900},{l:'Blkt',v:s.blankets,m:700},{l:'Equip',v:s.rescue_equipment,m:200}].map(r=>{const p=r.m>0?(r.v||0)/r.m:0;const c=p<.15?'#f06562':p<.4?'#c4a730':'#27ae60';return `<div><div class="text-[11px] font-bold" style="color:${c}">${r.v||0}</div><div class="text-[8.5px] text-[#2a3347]">${r.l}</div></div>`}).join('')}</div>
    ${s.address?`<p class="text-[10px] text-[#2a3347]"><i class="fas fa-location-dot mr-0.5"></i>${s.address}</p>`:''}
    ${s.contact_phone?`<p class="text-[10px] text-[#2a3347] mt-0.5"><i class="fas fa-phone mr-0.5"></i>${s.contact_phone}</p>`:''}
  </div>`;
}

async function filterSh(){const sh=await api('/api/shelters?type='+document.getElementById('ft').value).catch(()=>[]);document.getElementById('sg').innerHTML=sh.map((s,i)=>shCard(s,i)).join('')}

async function resourcesPage(){
  const[res,tot]=await Promise.all([api('/api/resources').catch(()=>[]),api('/api/stats/resources').catch(()=>({}))]);
  const rt=[{k:'water',l:'Drinking Water',ic:'fa-droplet',c:'#4f8ff7',u:'litres',m:1000,cr:300},{k:'food',l:'Food Packs',ic:'fa-utensils',c:'#27ae60',u:'packs',m:800,cr:200},{k:'medicine',l:'Medical Supplies',ic:'fa-pills',c:'#a76fe0',u:'units',m:900,cr:150},{k:'blankets',l:'Blankets',ic:'fa-bed',c:'#e6a23c',u:'pieces',m:700,cr:150},{k:'rescue_equipment',l:'Rescue Equipment',ic:'fa-life-ring',c:'#f06562',u:'sets',m:200,cr:40}];
  return `<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">
    <div class="mb-5 ain"><h1 class="text-xl font-bold text-white">Resource Tracking</h1><p class="text-[12px] text-[#4a5568]">Supply levels across all networked facilities</p></div>
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">${rt.map((r,i)=>{const v=tot[r.k]||0;const low=v<r.cr*3;return `<div class="glass p-3.5 ain d${i+1} ${low?'pulse-ring':''}"><div class="flex items-center gap-1.5 mb-1.5"><i class="fas ${r.ic}" style="color:${r.c}"></i><span class="text-[10px] text-[#4a5568]">${r.l}</span></div><div class="text-lg font-bold ${low?'text-[#f06562]':'text-white'}">${v.toLocaleString()}</div><div class="text-[9px] text-[#2a3347]">${r.u}${low?' — LOW STOCK':''}</div></div>`}).join('')}</div>
    <div class="glass p-5 ain d3"><h3 class="font-semibold text-white text-[13.5px] mb-3"><i class="fas fa-warehouse text-cyan-400 mr-1.5"></i>Per-Facility Breakdown</h3>
      <div class="overflow-x-auto"><table class="dtbl"><thead><tr><th>Facility</th><th>Type</th>${rt.map(r=>`<th><i class="fas ${r.ic}" style="color:${r.c}"></i> ${r.l}</th>`).join('')}</tr></thead><tbody>${res.map(r=>`<tr><td class="font-semibold text-white text-[12px]">${r.shelter_name}</td><td class="text-[10.5px] text-[#4a5568]">${(r.shelter_type||'').replace('_',' ')}</td>${rt.map(t=>{const v=r[t.k]||0;const p=Math.min(v/t.m,1);const c=v<t.cr?'#f06562':p<.4?'#c4a730':'#27ae60';return `<td><div class="flex items-center gap-1.5"><div class="rbar flex-1" style="min-width:55px"><div class="rfill" style="width:${p*100}%;background:${c}">${p>.12?v:''}</div></div>${p<=.12?`<span class="text-[10px]" style="color:${c}">${v}</span>`:''}</div></td>`}).join('')}</tr>`).join('')}</tbody></table></div>
    </div></div>`;
}

async function volunteersPage(){
  const vol=await api('/api/volunteers').catch(()=>[]);
  const av=vol.filter(v=>v.availability==='available').length,om=vol.filter(v=>v.availability==='on_mission').length,un=vol.filter(v=>v.availability==='unavailable').length;
  return `<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5 ain"><div><h1 class="text-xl font-bold text-white">Volunteer Operations</h1><p class="text-[12px] text-[#4a5568]">${vol.length} registered responders</p></div><button class="btn btn-p btn-xs" onclick="document.getElementById('vf').classList.toggle('hidden')"><i class="fas fa-user-plus"></i> Register</button></div>
    <div class="grid grid-cols-3 gap-3 mb-5 ain d1">${[{l:'Available',v:av,c:'#27ae60'},{l:'On Mission',v:om,c:'#e6a23c'},{l:'Off Duty',v:un,c:'#4a5568'}].map(x=>`<div class="glass p-3 text-center"><div class="text-xl font-bold" style="color:${x.c}">${x.v}</div><div class="text-[10px] text-[#4a5568] uppercase tracking-wider">${x.l}</div></div>`).join('')}</div>
    <div id="vf" class="hidden glass p-5 mb-5 ain">
      <h3 class="font-semibold text-white text-[13.5px] mb-3">Register New Responder</h3>
      <form onsubmit="regVol(event)" class="grid sm:grid-cols-2 gap-3">
        <div><label class="fl">Full Name *</label><input type="text" id="vn" class="fi" required placeholder="Full name"></div>
        <div><label class="fl">Email *</label><input type="email" id="ve" class="fi" required placeholder="email@example.com"></div>
        <div><label class="fl">Phone</label><input type="tel" id="vp" class="fi" placeholder="+91-XXXXX-XXXXX"></div>
        <div><label class="fl">Skills</label><input type="text" id="vs" class="fi" placeholder="First Aid, Driving, Medical..."></div>
        <div class="sm:col-span-2 flex gap-2"><button type="submit" class="btn btn-p btn-xs"><i class="fas fa-user-plus"></i> Register</button><button type="button" class="btn btn-g btn-xs" onclick="document.getElementById('vf').classList.add('hidden')">Cancel</button></div>
      </form>
    </div>
    <div class="glass p-5 ain d2"><div class="overflow-x-auto"><table class="dtbl"><thead><tr><th>Name</th><th>Skills</th><th>Status</th><th>Assignment</th><th>Contact</th></tr></thead><tbody>${vol.map(v=>{const sc={available:'#27ae60',on_mission:'#e6a23c',unavailable:'#4a5568'};return `<tr><td><div class="flex items-center gap-2"><div class="w-7 h-7 rounded-full flex items-center justify-center" style="background:${sc[v.availability]}15"><i class="fas fa-user text-[10px]" style="color:${sc[v.availability]}"></i></div><span class="font-semibold text-white text-[12.5px]">${v.name}</span></div></td><td class="text-[11px] text-[#8a95a5]">${(v.skills||'').split(',').map(s=>`<span class="inline-block rounded px-1.5 py-0.5 mr-0.5 mb-0.5" style="background:rgba(255,255,255,.03);font-size:10px">${s.trim()}</span>`).join('')}</td><td><span class="tag tag-${v.availability==='available'?'low':v.availability==='on_mission'?'high':'reported'}">${v.availability.replace('_',' ')}</span></td><td class="text-[12px]">${v.assigned_report_id?`<span class="text-[#a76fe0]">${v.assigned_report_id}</span>`:''}</td><td class="text-[11px] text-[#4a5568]">${v.phone||v.email}</td></tr>`}).join('')}</tbody></table></div></div></div>`;
}

async function regVol(e){
  e.preventDefault();
  try{await api('/api/volunteers',{method:'POST',body:JSON.stringify({name:document.getElementById('vn').value,email:document.getElementById('ve').value,phone:document.getElementById('vp').value,skills:document.getElementById('vs').value})});toast('Registered','ok');render()}catch(ex){toast('Failed — email may already exist','er')}
}

async function render(){
  const p=location.pathname.replace(/^\//,'')||'home';page=p.split('/')[0]||'home';
  if(map&&page!=='map'){map.remove();map=null;heat=null;heatOn=false}
  Object.values(charts).forEach(c=>c.destroy());charts={};
  let c='';
  try{
    switch(page){
      case 'home':c=await home();break;
      case 'report':c=reportPage();break;
      case 'map':c=await mapPage();break;
      case 'dashboard':c=await dashboard();break;
      case 'command-center':c=await cmdCenter();break;
      case 'shelters':c=await sheltersPage();break;
      case 'resources':c=await resourcesPage();break;
      case 'volunteers':c=await volunteersPage();break;
      default:c=await home();
    }
  }catch(e){c=`<div class="max-w-md mx-auto px-4 py-20 text-center"><div class="glass p-7"><i class="fas fa-triangle-exclamation text-[#f06562] text-2xl mb-3"></i><h2 class="text-lg font-bold text-white mb-1">Something went wrong</h2><p class="text-[#4a5568] text-[13px] mb-3">${e.message}</p><button class="btn btn-p btn-xs" onclick="go('home')">Back to Home</button></div></div>`}
  document.getElementById('app').innerHTML=nav()+c;
  const uz=document.getElementById('uz');
  if(uz){uz.addEventListener('dragover',e=>{e.preventDefault();uz.classList.add('dg')});uz.addEventListener('dragleave',()=>uz.classList.remove('dg'));uz.addEventListener('drop',e=>{e.preventDefault();uz.classList.remove('dg');if(e.dataTransfer.files.length){document.getElementById('ri').files=e.dataTransfer.files;handleImg({target:{files:[e.dataTransfer.files[0]]}})}})}
}
render();
