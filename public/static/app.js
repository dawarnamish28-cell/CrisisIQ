var currentPage = '', leafletMap = null, heatLayer = null, chartInstances = {}, heatVisible = false, uploadedImage = null, uploadedImageInfo = null, analysisResult = null, session = null;

function getSession() {
  try { var s = localStorage.getItem('crisisiq_user'); if (s) { session = JSON.parse(s); return session; } } catch(e) {}
  return null;
}
function setSession(n, e) { session = {name:n,email:e}; localStorage.setItem('crisisiq_user', JSON.stringify(session)); }

function navigate(path) { currentPage = path; history.pushState({}, '', path === 'home' ? '/' : '/' + path); render(); }
window.addEventListener('popstate', function() { currentPage = location.pathname.replace('/', '') || 'home'; render(); });

function notify(msg, type) {
  document.querySelectorAll('.notification').forEach(function(el) { el.remove(); });
  var el = document.createElement('div'); el.className = 'notification notification-' + type;
  var ic = type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle';
  el.innerHTML = '<i class="fas fa-' + ic + '"></i> ' + msg; document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 3000);
}

async function request(url, opts) {
  var cfg = Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts || {});
  var r = await fetch(url, cfg); if (!r.ok) throw new Error('Request failed'); return r.json();
}

function elapsed(ts) {
  if (!ts) return '';
  var s = Math.floor((Date.now() - new Date(ts + (ts.includes('Z') ? '' : 'Z')).getTime()) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago';
}

function buildNav() {
  var links = [
    {id:'home',icon:'fa-house',text:'Home'},{id:'report',icon:'fa-circle-exclamation',text:'Report'},
    {id:'map',icon:'fa-map-location-dot',text:'Map'},{id:'dashboard',icon:'fa-chart-line',text:'Dashboard'},
    {id:'command-center',icon:'fa-terminal',text:'Command'},{id:'shelters',icon:'fa-hospital',text:'Shelters'},
    {id:'resources',icon:'fa-cubes-stacked',text:'Resources'},{id:'volunteers',icon:'fa-people-group',text:'Volunteers'}
  ];
  var dl = links.map(function(l) {
    return '<a class="bar-link ' + (currentPage === l.id ? 'active' : '') + '" onclick="navigate(\'' + l.id + '\')"><i class="fas ' + l.icon + '"></i><span class="hidden lg:inline">' + l.text + '</span></a>';
  }).join('');
  var ml = links.map(function(l) {
    return '<a class="mobile-tab ' + (currentPage === l.id ? 'active' : '') + '" onclick="navigate(\'' + l.id + '\')"><i class="fas ' + l.icon + '"></i>' + l.text + '</a>';
  }).join('');
  var userBit = session ? '<div class="hidden sm:flex items-center gap-2 text-[11px] text-slate-500"><i class="fas fa-user-circle text-blue-400"></i> ' + session.name.split(' ')[0] + '</div>' : '';
  return '<nav class="bar"><div class="max-w-7xl mx-auto px-4 sm:px-6"><div class="flex items-center justify-between h-14">' +
    '<div class="flex items-center gap-2.5 cursor-pointer select-none" onclick="navigate(\'home\')">' +
    '<div style="width:30px;height:30px;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:7px;display:flex;align-items:center;justify-content:center"><i class="fas fa-shield-halved text-white text-xs"></i></div>' +
    '<span class="text-sm font-bold tracking-tight text-white">CrisisIQ</span></div>' +
    '<div class="desktop-links flex items-center gap-0.5 overflow-x-auto">' + dl + '</div>' + userBit +
    '</div></div></nav><div class="mobile-nav">' + ml + '</div>';
}

async function warningBanner() {
  try {
    var alerts = await request('/api/alerts');
    if (!alerts || !alerts.length) return '';
    var items = alerts.map(function(a) {
      return '<span class="inline-flex items-center gap-1.5 mx-6"><i class="fas ' + (a.severity === 'Critical' ? 'fa-skull-crossbones' : 'fa-triangle-exclamation') + '"></i> <strong>' + a.category + '</strong> ' + (a.location_name || a.report_id) + ' -- ' + a.severity + '</span>';
    }).join('');
    return '<div class="warning-ticker"><div class="ticker-track">' + items + items + '</div></div>';
  } catch(e) { return ''; }
}

async function homePage() {
  var stats = {};
  try { stats = await request('/api/stats'); } catch(e) {}

  var loginPrompt = '';
  if (!session) {
    loginPrompt = '<div class="panel p-5 mb-8 fade-in stagger-2 max-w-lg mx-auto">' +
      '<h3 class="text-sm font-semibold text-white mb-3 text-center">Quick Sign In</h3>' +
      '<p class="text-[10px] text-slate-600 mb-3 text-center">Enter once, never again. Your info saves permanently for faster reporting.</p>' +
      '<form onsubmit="handleLogin(event)" class="flex flex-col sm:flex-row gap-2">' +
      '<input type="text" id="login-name" class="field flex-1" placeholder="Your name" required>' +
      '<input type="email" id="login-email" class="field flex-1" placeholder="Email" required>' +
      '<button type="submit" class="cta cta-blue cta-sm whitespace-nowrap"><i class="fas fa-check"></i> Save</button></form></div>';
  }

  var statCards = [
    {label:'Active Incidents',value:stats.activeIncidents||0,icon:'fa-bolt',color:'#ef4444'},
    {label:'Critical',value:stats.criticalIncidents||0,icon:'fa-triangle-exclamation',color:'#f59e0b'},
    {label:'Facilities',value:stats.totalFacilities||0,icon:'fa-hospital',color:'#3b82f6'},
    {label:'Responders',value:stats.totalVolunteers||0,icon:'fa-user-shield',color:'#22c55e'}
  ];

  return '<section class="relative overflow-hidden">' +
    '<div class="hero-section">' +
    '<div class="hero-overlay"></div>' +
    '<div class="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-12 text-center relative" style="z-index:2">' +
    '<div class="fade-in">' +
    '<div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full panel-sm text-xs text-blue-400 mb-5 font-medium"><i class="fas fa-satellite-dish text-[10px]"></i> India-Wide Emergency Response</div>' +
    '<h1 class="text-[clamp(1.6rem,4.5vw,3rem)] font-extrabold mb-4 leading-[1.12] tracking-tight text-white">AI-Powered Disaster<br>Response Platform</h1>' +
    '<p class="text-sm text-slate-400 max-w-md mx-auto mb-7 leading-relaxed">Real-time incident coordination, AI-driven severity assessment, and resource allocation across India\'s emergency infrastructure.</p>' +
    '<div class="flex flex-wrap justify-center gap-3 mb-10">' +
    '<button onclick="navigate(\'report\')" class="cta cta-blue px-6 py-2.5"><i class="fas fa-circle-exclamation"></i> Report Emergency</button>' +
    '<button onclick="navigate(\'map\')" class="cta cta-ghost px-6 py-2.5"><i class="fas fa-map-location-dot"></i> View Map</button></div></div>' +
    loginPrompt +
    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto fade-in stagger-3">' +
    statCards.map(function(c) {
      return '<div class="panel p-3.5 lift text-center"><div style="color:' + c.color + '" class="text-lg mb-1"><i class="fas ' + c.icon + '"></i></div>' +
        '<div class="stat-val text-white">' + c.value + '</div><div class="text-[9px] text-slate-600 mt-1 font-medium tracking-wide uppercase">' + c.label + '</div></div>';
    }).join('') + '</div></div></div></section>' +
    '<section class="max-w-6xl mx-auto px-4 sm:px-6 py-12">' +
    '<div class="text-center mb-8 fade-in"><h2 class="text-lg font-bold text-white mb-2">How It Works</h2><p class="text-xs text-slate-500 max-w-md mx-auto">CrisisIQ provides end-to-end disaster response coordination from citizen reporting through resource deployment.</p></div>' +
    '<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">' +
    [
      {title:'Report',desc:'Citizens report emergencies with photos and location. AI auto-classifies type and severity.',icon:'fa-camera-retro',color:'#3b82f6',page:'report'},
      {title:'Analyze',desc:'Our AI engine evaluates descriptions, image data, and 100+ signal patterns to determine threat level.',icon:'fa-microchip',color:'#8b5cf6',page:'command-center'},
      {title:'Coordinate',desc:'Command center generates situational briefings and prioritized response queues automatically.',icon:'fa-terminal',color:'#06b6d4',page:'command-center'},
      {title:'Deploy',desc:'Dispatch teams, track shelter capacity, and allocate supplies across ' + (stats.totalFacilities||80) + '+ facilities.',icon:'fa-truck-fast',color:'#f59e0b',page:'dashboard'},
      {title:'Monitor',desc:'Live map with all incidents and facilities across India. Heatmap overlay for hotspot detection.',icon:'fa-earth-asia',color:'#22c55e',page:'map'},
      {title:'Respond',desc:'Volunteer registry with skill matching. Resource tracking ensures supplies reach where needed.',icon:'fa-handshake-angle',color:'#ec4899',page:'volunteers'}
    ].map(function(f, idx) {
      return '<div class="panel p-5 lift cursor-pointer fade-in stagger-' + ((idx % 5) + 1) + '" onclick="navigate(\'' + f.page + '\')">' +
        '<div class="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style="background:' + f.color + '0d;border:1px solid ' + f.color + '1a"><i class="fas ' + f.icon + '" style="color:' + f.color + '"></i></div>' +
        '<h3 class="text-sm font-semibold text-white mb-1.5">' + f.title + '</h3>' +
        '<p class="text-xs text-slate-500 leading-relaxed">' + f.desc + '</p></div>';
    }).join('') + '</div></section>' +
    '<section class="max-w-4xl mx-auto px-4 sm:px-6 pb-14"><div class="grid sm:grid-cols-3 gap-4 fade-in">' +
    '<div class="rounded-xl overflow-hidden h-40 sm:h-48"><img src="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&h=400&fit=crop" alt="Volunteer aid" class="w-full h-full object-cover" loading="lazy"></div>' +
    '<div class="rounded-xl overflow-hidden h-40 sm:h-48"><img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&h=400&fit=crop" alt="Emergency response" class="w-full h-full object-cover" loading="lazy"></div>' +
    '<div class="rounded-xl overflow-hidden h-40 sm:h-48"><img src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600&h=400&fit=crop" alt="Community support" class="w-full h-full object-cover" loading="lazy"></div>' +
    '</div></section>';
}

async function handleLogin(e) {
  e.preventDefault();
  var n = document.getElementById('login-name').value.trim();
  var em = document.getElementById('login-email').value.trim();
  if (!n || !em) return;
  try { await request('/api/session', {method:'POST',body:JSON.stringify({name:n,email:em})}); } catch(ex) {}
  setSession(n, em);
  notify('Welcome, ' + n.split(' ')[0] + '! Your info is saved permanently.', 'success');
  render();
}

function reportPage() {
  var nameVal = session ? session.name : '';
  var emailVal = session ? session.email : '';
  return '<div class="max-w-3xl mx-auto px-4 sm:px-6 py-7">' +
    '<div class="mb-6 fade-in"><h1 class="text-2xl font-bold text-white mb-1">Report an Emergency</h1>' +
    '<p class="text-xs text-slate-500">Provide as much detail as possible. The AI engine will assess severity automatically.</p></div>' +
    '<form id="report-form" class="space-y-5 fade-in stagger-1" onsubmit="submitReport(event)">' +
    '<div class="grid sm:grid-cols-2 gap-5">' +
    '<div><label class="label">Incident Type *</label><select id="inp-category" class="field" required>' +
    '<option value="">Select type...</option><option>Flood</option><option>Fire</option><option>Earthquake</option><option>Landslide</option><option>Cyclone</option><option>Building Collapse</option><option>Medical Emergency</option><option>Road Blockage</option></select></div>' +
    '<div><label class="label">Your Name</label><input type="text" id="inp-name" class="field" placeholder="Full name" value="' + nameVal + '"></div></div>' +
    '<div class="grid sm:grid-cols-2 gap-5">' +
    '<div><label class="label">Email</label><input type="email" id="inp-email" class="field" placeholder="you@email.com" value="' + emailVal + '"></div>' +
    '<div><label class="label">Phone</label><input type="tel" id="inp-phone" class="field" placeholder="+91-XXXXX-XXXXX"></div></div>' +
    '<div><label class="label">Description *</label><textarea id="inp-desc" class="field" placeholder="What is happening? How many people affected? What dangers are present? Be as detailed as possible -- the AI uses every word." required></textarea></div>' +
    '<div><label class="label">Location / Landmark</label><input type="text" id="inp-location" class="field" placeholder="e.g. Near ITO Flyover, Mumbai Central"></div>' +
    '<div class="grid sm:grid-cols-2 gap-5">' +
    '<div><label class="label">Latitude *</label><input type="number" id="inp-lat" class="field" step="any" placeholder="28.6139" required></div>' +
    '<div><label class="label">Longitude *</label><input type="number" id="inp-lng" class="field" step="any" placeholder="77.2090" required></div></div>' +
    '<button type="button" class="cta cta-ghost cta-sm" onclick="detectLocation()"><i class="fas fa-location-crosshairs"></i> Use My Location</button>' +
    '<div><label class="label">Upload Evidence Photo</label>' +
    '<div id="upload-zone" class="dropzone" onclick="document.getElementById(\'file-input\').click()">' +
    '<input type="file" id="file-input" accept="image/*" class="hidden" onchange="handleUpload(event)">' +
    '<div id="upload-preview" class="hidden"></div>' +
    '<div id="upload-prompt"><i class="fas fa-cloud-arrow-up text-3xl text-slate-700 mb-2"></i>' +
    '<p class="text-slate-500 text-xs">Click to upload or drag an image</p>' +
    '<p class="text-slate-700 text-[10px] mt-1">PNG, JPG, WebP -- max 5 MB. AI will factor image metadata into analysis.</p></div></div></div>' +
    '<div id="analysis-output" class="hidden"></div>' +
    '<div class="flex gap-3 pt-2">' +
    '<button type="button" class="cta cta-ghost flex-1" onclick="runAnalysis()"><i class="fas fa-microchip"></i> Analyze with AI</button>' +
    '<button type="submit" class="cta cta-blue flex-1"><i class="fas fa-paper-plane"></i> Submit Report</button></div></form></div>';
}

function detectLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(function(p) {
      document.getElementById('inp-lat').value = p.coords.latitude.toFixed(6);
      document.getElementById('inp-lng').value = p.coords.longitude.toFixed(6);
      notify('Location acquired', 'success');
    }, function() {
      document.getElementById('inp-lat').value = (28.58 + Math.random() * 0.1).toFixed(6);
      document.getElementById('inp-lng').value = (77.17 + Math.random() * 0.1).toFixed(6);
      notify('Approximate location set', 'info');
    });
  }
}

function handleUpload(e) {
  var file = e.target.files[0]; if (!file) return;
  if (file.size > 5242880) { notify('File exceeds 5 MB', 'error'); return; }
  uploadedImageInfo = {filename:file.name,size:file.size,type:file.type};
  var reader = new FileReader();
  reader.onload = function(ev) {
    uploadedImage = ev.target.result;
    document.getElementById('upload-preview').innerHTML = '<img src="' + ev.target.result + '" class="max-h-44 mx-auto rounded-lg mb-2"><p class="text-xs text-green-400"><i class="fas fa-check"></i> ' + file.name + ' (' + (file.size/1024).toFixed(0) + ' KB)</p>';
    document.getElementById('upload-preview').classList.remove('hidden');
    document.getElementById('upload-prompt').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

async function runAnalysis() {
  var cat = document.getElementById('inp-category').value, desc = document.getElementById('inp-desc').value;
  if (!cat && !desc) { notify('Add a description or select type first', 'error'); return; }
  var out = document.getElementById('analysis-output'); out.classList.remove('hidden');
  out.innerHTML = '<div class="analysis-box flex items-center gap-4"><div class="loader"></div><div><p class="text-blue-400 font-semibold text-sm">Running deep analysis...</p><p class="text-xs text-slate-500">Evaluating patterns, signals' + (uploadedImage ? ', image metadata' : '') + '</p></div></div>';
  try {
    var result = await request('/api/ai/analyze', {method:'POST',body:JSON.stringify({category:cat,description:desc,image_data:uploadedImage?'present':null,image_info:uploadedImageInfo||{}})});
    analysisResult = result;
    var cc = result.confidence > 85 ? '#22c55e' : result.confidence > 70 ? '#f59e0b' : '#ef4444';
    var sc = result.severity === 'Critical' ? '#ef4444' : result.severity === 'High' ? '#f59e0b' : result.severity === 'Moderate' ? '#eab308' : '#22c55e';
    var acts = '';
    if (result.recommended_actions && result.recommended_actions.length) {
      acts = '<div class="mt-3 pt-3" style="border-top:1px solid rgba(148,163,184,.06)"><p class="text-[10px] font-semibold text-amber-400 mb-1.5"><i class="fas fa-lightbulb mr-1"></i>Recommended Actions</p><ul class="space-y-1">' +
        result.recommended_actions.map(function(a) { return '<li class="text-[11px] text-slate-500 flex gap-1.5"><span class="text-amber-400 shrink-0">></span>' + a + '</li>'; }).join('') + '</ul></div>';
    }
    out.innerHTML = '<div class="analysis-box fade-in"><div class="flex items-center gap-2.5 mb-4"><div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(59,130,246,.08)"><i class="fas fa-microchip text-blue-400 text-sm"></i></div><div><h3 class="font-semibold text-white text-sm">Analysis Complete</h3><p class="text-[10px] text-slate-500">' + result.factors_detected + ' signals / ' + result.critical_indicators + ' critical / ' + result.risk_indicators + ' risk</p></div>' +
      (result.image_analyzed ? '<span class="badge badge-verified ml-auto"><i class="fas fa-image"></i> Image</span>' : '') +
      (result.secondary_category ? '<span class="badge badge-reported ml-1">' + result.secondary_category + '?</span>' : '') + '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">' +
      [{l:'Type',v:result.category,c:'#e2e8f0'},{l:'Confidence',v:result.confidence+'%',c:cc},{l:'Severity',v:result.severity,c:sc},{l:'Urgency',v:result.urgency,c:sc}].map(function(m) {
        return '<div class="text-center p-2.5 rounded-lg" style="background:rgba(255,255,255,.025)"><div class="text-[10px] text-slate-500 mb-0.5">' + m.l + '</div><div class="font-bold text-xs" style="color:' + m.c + '">' + m.v + '</div></div>';
      }).join('') + '</div><p class="text-xs text-slate-400 leading-relaxed">' + result.explanation + '</p>' + acts + '</div>';
    notify('Analysis complete', 'success');
  } catch(e) { out.innerHTML = '<div class="analysis-box"><p class="text-red-400 text-sm"><i class="fas fa-xmark"></i> Analysis unavailable. Submit the report manually.</p></div>'; }
}

async function submitReport(e) {
  e.preventDefault(); var btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px"></div> Submitting...';
  var ai = analysisResult || {};
  try {
    var r = await request('/api/incidents', {method:'POST',body:JSON.stringify({
      category:document.getElementById('inp-category').value, description:document.getElementById('inp-desc').value,
      latitude:parseFloat(document.getElementById('inp-lat').value), longitude:parseFloat(document.getElementById('inp-lng').value),
      location_name:document.getElementById('inp-location').value, reporter_name:document.getElementById('inp-name').value,
      reporter_email:document.getElementById('inp-email').value, reporter_phone:document.getElementById('inp-phone').value,
      severity:ai.severity||'Moderate', urgency:ai.urgency||'Medium', ai_confidence:ai.confidence||0,
      ai_explanation:ai.explanation||'', image_data:uploadedImage?'uploaded':null
    })});
    notify('Incident reported -- ' + r.report_id, 'success');
    analysisResult = null; uploadedImage = null; uploadedImageInfo = null;
    setTimeout(function() { navigate('map'); }, 1200);
  } catch(ex) { notify('Submission failed', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Report'; }
}

async function mapPage() {
  var incidents = [], shelters = [];
  try { var d = await Promise.all([request('/api/incidents'),request('/api/shelters')]); incidents = d[0]; shelters = d[1]; } catch(e) {}
  setTimeout(function() { setupMap(incidents, shelters); }, 120);
  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">' +
    '<div class="flex flex-wrap items-center justify-between gap-3 mb-4 fade-in"><div><h1 class="text-xl font-bold text-white">Situation Map</h1>' +
    '<p class="text-xs text-slate-600">' + incidents.length + ' incidents / ' + shelters.length + ' facilities across India</p></div>' +
    '<div class="flex gap-2"><button class="cta cta-sm cta-ghost" onclick="toggleHeatmap()"><i class="fas fa-fire"></i> Heatmap</button>' +
    '<button class="cta cta-sm cta-ghost" onclick="leafletMap&&leafletMap.setView([22.5,82],5)"><i class="fas fa-expand"></i> India</button>' +
    '<button class="cta cta-sm cta-ghost" onclick="leafletMap&&leafletMap.setView([28.62,77.22],11)"><i class="fas fa-location-dot"></i> Delhi</button></div></div>' +
    '<div class="map-wrap fade-in stagger-1" style="height:calc(100vh - 170px);min-height:460px"><div id="map-container" style="height:100%;width:100%"></div></div>' +
    '<div class="flex flex-wrap gap-4 mt-3 fade-in stagger-2">' +
    [{l:'Critical',c:'#ef4444'},{l:'High',c:'#f59e0b'},{l:'Moderate',c:'#eab308'},{l:'Hospital',c:'#3b82f6'},{l:'Shelter',c:'#22c55e'},{l:'Rescue HQ',c:'#8b5cf6'}].map(function(x) {
      return '<div class="flex items-center gap-1.5 text-[11px] text-slate-500"><span style="width:9px;height:9px;border-radius:50%;background:' + x.c + ';display:inline-block"></span>' + x.l + '</div>';
    }).join('') + '</div></div>';
}

function setupMap(incidents, shelters) {
  if (leafletMap) { leafletMap.remove(); leafletMap = null; heatLayer = null; heatVisible = false; }
  var container = document.getElementById('map-container');
  if (!container) return;

  leafletMap = L.map('map-container', {zoomControl:true,preferCanvas:true}).setView([22.5,82], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {attribution:'OpenStreetMap & CartoDB',maxZoom:18}).addTo(leafletMap);

  fetch('https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson')
    .then(function(r){return r.json()})
    .then(function(geo){
      L.geoJSON(geo, {
        style: {color:'#334155',weight:1.5,fillColor:'rgba(30,41,59,0.15)',fillOpacity:0.15,dashArray:''},
        onEachFeature: function(feature, layer) {
          if (feature.properties && feature.properties.NAME_1) {
            layer.bindTooltip(feature.properties.NAME_1, {permanent:false,direction:'center',className:'state-tooltip'});
          }
        }
      }).addTo(leafletMap);
    }).catch(function(){});

  var sevColors = {Critical:'#ef4444',High:'#f59e0b',Moderate:'#eab308',Low:'#22c55e'};
  var catIcons = {Flood:'water',Fire:'fire',Earthquake:'house-crack',Landslide:'mountain',Cyclone:'wind','Building Collapse':'building',
    'Medical Emergency':'truck-medical','Road Blockage':'road-barrier'};
  var heatData = [];

  incidents.forEach(function(inc) {
    var col = sevColors[inc.severity] || '#eab308';
    var intensity = inc.severity === 'Critical' ? 1 : inc.severity === 'High' ? 0.7 : 0.4;
    heatData.push([inc.latitude, inc.longitude, intensity]);
    var rad = inc.severity === 'Critical' ? 10 : inc.severity === 'High' ? 8 : 6;
    L.circleMarker([inc.latitude, inc.longitude], {radius:rad,fillColor:col,color:col,weight:2,opacity:0.8,fillOpacity:0.35})
      .addTo(leafletMap).bindPopup(
        '<div style="min-width:180px"><div style="font-size:13px;margin-bottom:3px"><i class="fas fa-' + (catIcons[inc.category]||'triangle-exclamation') + '" style="color:' + col + '"></i> <strong>' + inc.category + '</strong></div>' +
        '<div style="font-size:10px;color:#64748b;margin-bottom:5px">' + inc.report_id + ' / ' + (inc.location_name||'') + '</div>' +
        '<div style="margin-bottom:4px"><span class="badge badge-' + inc.severity.toLowerCase() + '">' + inc.severity + '</span> <span class="badge badge-' + inc.status + '">' + inc.status.replace('_',' ') + '</span></div>' +
        '<p style="font-size:11px;color:#94a3b8;line-height:1.5">' + (inc.description||'').slice(0,100) + '</p>' +
        (inc.assigned_team ? '<div style="font-size:10px;color:#8b5cf6;margin-top:3px"><i class="fas fa-users"></i> ' + inc.assigned_team + '</div>' : '') + '</div>'
      );
  });

  var typeColors = {hospital:'#3b82f6',shelter:'#22c55e',rescue_center:'#8b5cf6'};
  var typeIcons = {hospital:'fa-hospital',shelter:'fa-campground',rescue_center:'fa-truck-medical'};

  shelters.forEach(function(s) {
    var pct = s.capacity > 0 ? Math.round(s.occupancy/s.capacity*100) : 0;
    var col = typeColors[s.type] || '#22c55e';
    var barCol = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
    L.circleMarker([s.latitude, s.longitude], {radius:5,fillColor:col,color:col,weight:1.5,opacity:0.7,fillOpacity:0.5})
      .addTo(leafletMap).bindPopup(
        '<div style="min-width:180px"><strong>' + s.name + '</strong>' +
        '<div style="font-size:10px;color:#64748b;margin:3px 0">' + s.type.replace('_',' ').toUpperCase() + ' / ' + (s.city||'') + '</div>' +
        '<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:2px"><span>Occupancy</span><span style="color:' + barCol + ';font-weight:700">' + s.occupancy + '/' + s.capacity + ' (' + pct + '%)</span></div>' +
        '<div class="progress"><span style="width:' + pct + '%;background:' + barCol + '"></span></div></div>' +
        (s.contact_phone ? '<div style="font-size:10px;color:#64748b"><i class="fas fa-phone"></i> ' + s.contact_phone + '</div>' : '') + '</div>'
      );
  });

  if (heatData.length) heatLayer = L.heatLayer(heatData, {radius:30,blur:22,maxZoom:15,max:1,gradient:{0.2:'#22c55e',0.4:'#eab308',0.6:'#f59e0b',0.8:'#ef4444',1:'#991b1b'}});
  setTimeout(function() { if (leafletMap) leafletMap.invalidateSize(); }, 200);
}

function toggleHeatmap() {
  if (!leafletMap || !heatLayer) return;
  if (heatVisible) { leafletMap.removeLayer(heatLayer); heatVisible = false; notify('Heatmap off','info'); }
  else { heatLayer.addTo(leafletMap); heatVisible = true; notify('Heatmap on','info'); }
}

async function dashboardPage() {
  var stats={},incidents=[],categories=[],severity=[];
  try { var d=await Promise.all([request('/api/stats'),request('/api/incidents?limit=12'),request('/api/stats/categories'),request('/api/stats/severity')]); stats=d[0];incidents=d[1];categories=d[2];severity=d[3]; } catch(e){}
  setTimeout(function(){setupCharts(categories,severity);},150);
  var sc=[{l:'Total',v:stats.totalIncidents||0,i:'fa-layer-group',c:'#3b82f6'},{l:'Active',v:stats.activeIncidents||0,i:'fa-bolt',c:'#f59e0b'},{l:'Critical',v:stats.criticalIncidents||0,i:'fa-skull-crossbones',c:'#ef4444'},{l:'Shelters',v:(stats.shelterOccupancy||0)+'%',i:'fa-hospital',c:'#8b5cf6'},{l:'Responders',v:(stats.availableVolunteers||0)+'/'+(stats.totalVolunteers||0),i:'fa-user-shield',c:'#22c55e'}];
  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5"><div class="flex flex-wrap items-center justify-between gap-3 mb-5 fade-in"><div><h1 class="text-xl font-bold text-white">Operations Dashboard</h1><p class="text-xs text-slate-600">Aggregated view of all active operations</p></div><button class="cta cta-sm cta-ghost" onclick="render()"><i class="fas fa-rotate"></i> Refresh</button></div>' +
    '<div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">' + sc.map(function(c,idx){return '<div class="panel p-4 fade-in stagger-'+(idx+1)+' lift"><div class="flex items-center justify-between mb-2.5"><div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background:'+c.c+'0d"><i class="fas '+c.i+'" style="color:'+c.c+'"></i></div></div><div class="stat-val text-white">'+c.v+'</div><div class="text-[10px] text-slate-600 mt-0.5 font-medium tracking-wide uppercase">'+c.l+'</div></div>';}).join('') + '</div>' +
    '<div class="grid lg:grid-cols-2 gap-4 mb-6"><div class="panel p-5 fade-in stagger-2"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-chart-pie text-blue-400 mr-1.5"></i>By Category</h3><div style="height:250px"><canvas id="chart-category"></canvas></div></div><div class="panel p-5 fade-in stagger-3"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-chart-bar text-purple-400 mr-1.5"></i>By Severity</h3><div style="height:250px"><canvas id="chart-severity"></canvas></div></div></div>' +
    '<div class="panel p-5 fade-in stagger-4"><div class="flex items-center justify-between mb-3"><h3 class="font-semibold text-white text-sm"><i class="fas fa-list-check text-cyan-400 mr-1.5"></i>Incident Console</h3><select id="filter-status" class="field py-1 text-[11px]" style="width:auto" onchange="applyIncidentFilter()"><option value="all">All</option><option value="reported">Reported</option><option value="verified">Verified</option><option value="dispatched">Dispatched</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option></select></div>' +
    '<div class="overflow-x-auto"><table class="data"><thead><tr><th>ID</th><th>Type</th><th>Location</th><th>Severity</th><th>Status</th><th>Team</th><th>Time</th><th>Actions</th></tr></thead><tbody id="incident-tbody">' + incidents.map(function(i){return incidentRow(i);}).join('') + '</tbody></table></div></div></div>';
}

function incidentRow(inc) {
  var a='';
  if(inc.status==='reported')a='<button class="cta cta-sm cta-blue" onclick="updateIncident('+inc.id+',\'verified\')"><i class="fas fa-check"></i></button>';
  if(inc.status==='verified')a='<button class="cta cta-sm cta-amber" onclick="dispatchTeam('+inc.id+')"><i class="fas fa-truck-fast"></i></button>';
  if(inc.status==='dispatched'||inc.status==='in_progress')a='<button class="cta cta-sm cta-green" onclick="updateIncident('+inc.id+',\'resolved\')"><i class="fas fa-flag-checkered"></i></button>';
  return '<tr><td class="font-mono text-[11px] text-slate-600">'+inc.report_id+'</td><td class="text-xs">'+inc.category+'</td><td class="text-xs text-slate-400">'+(inc.location_name||'').slice(0,26)+'</td><td><span class="badge badge-'+inc.severity.toLowerCase()+'">'+inc.severity+'</span></td><td><span class="badge badge-'+inc.status+'">'+inc.status.replace('_',' ')+'</span></td><td class="text-xs">'+(inc.assigned_team||'<span class="text-slate-700">--</span>')+'</td><td class="text-[11px] text-slate-600">'+elapsed(inc.created_at)+'</td><td><div class="flex gap-1">'+a+'</div></td></tr>';
}

async function applyIncidentFilter() { try { var r=await request('/api/incidents?status='+document.getElementById('filter-status').value+'&limit=15'); document.getElementById('incident-tbody').innerHTML=r.map(function(i){return incidentRow(i);}).join(''); } catch(e){} }
async function updateIncident(id,s) { try { await request('/api/incidents/'+id,{method:'PATCH',body:JSON.stringify({status:s})}); notify('Updated','success'); render(); } catch(e){notify('Failed','error');} }
async function dispatchTeam(id) { var t=['NDRF 2nd Bn Alpha','Delhi Fire Unit 3','SDRF Delta','Civil Defence RR','CATS Ambulance'][Math.floor(Math.random()*5)]; try { await request('/api/incidents/'+id,{method:'PATCH',body:JSON.stringify({status:'dispatched',assigned_team:t})}); notify('Dispatched: '+t,'success'); render(); } catch(e){notify('Failed','error');} }

function setupCharts(cats,sev) {
  Object.values(chartInstances).forEach(function(c){c.destroy();}); chartInstances={};
  var cc=document.getElementById('chart-category');
  if(cc) chartInstances.category=new Chart(cc,{type:'doughnut',data:{labels:cats.map(function(c){return c.category;}),datasets:[{data:cats.map(function(c){return c.count;}),backgroundColor:['#3b82f6','#ef4444','#f59e0b','#eab308','#22c55e','#8b5cf6','#06b6d4','#ec4899'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#64748b',padding:10,usePointStyle:true,pointStyleWidth:8,font:{size:11}}}},cutout:'60%'}});
  var sc=document.getElementById('chart-severity');
  if(sc){var cm={Critical:'#ef4444',High:'#f59e0b',Moderate:'#eab308',Low:'#22c55e'};chartInstances.severity=new Chart(sc,{type:'bar',data:{labels:sev.map(function(s){return s.severity;}),datasets:[{data:sev.map(function(s){return s.count;}),backgroundColor:sev.map(function(s){return cm[s.severity]||'#475569';}),borderRadius:5,barThickness:34}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#475569',font:{size:11}}},y:{grid:{color:'rgba(148,163,184,.04)'},ticks:{color:'#475569',stepSize:1}}}}});}
}

async function commandCenterPage() {
  var summary=null,queue=[];
  try{var d=await Promise.all([request('/api/ai/summary'),request('/api/incidents/priority/queue')]);summary=d[0];queue=d[1];}catch(e){}
  var mh='';
  if(summary&&summary.metrics){var m=summary.metrics;mh='<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 fade-in stagger-2">'+[{l:'Active',v:m.activeIncidents,c:'#3b82f6'},{l:'Critical',v:m.criticalIncidents,c:'#ef4444'},{l:'High',v:m.highPriorityIncidents,c:'#f59e0b'},{l:'Shelter',v:m.shelterOccupancy+'%',c:'#8b5cf6'},{l:'Available',v:m.availableVolunteers,c:'#22c55e'},{l:'Total',v:m.totalVolunteers,c:'#06b6d4'}].map(function(i){return '<div class="panel-sm p-3 text-center"><div class="text-lg font-bold" style="color:'+i.c+'">'+i.v+'</div><div class="text-[9px] text-slate-600 mt-0.5 uppercase tracking-wider font-medium">'+i.l+'</div></div>';}).join('')+'</div>';}
  var bp=(summary&&summary.summary?summary.summary:'No data available.').split('\n\n').map(function(p){return '<p>'+p.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')+'</p>';}).join('');
  var recs=(summary&&summary.recommendations?summary.recommendations:[]).map(function(r,i){return '<div class="flex gap-2.5 p-2.5 rounded-lg" style="background:rgba(255,255,255,.015)"><div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style="background:rgba(245,158,11,.08)"><span class="text-[10px] font-bold text-amber-400">'+(i+1)+'</span></div><p class="text-xs text-slate-400">'+r+'</p></div>';}).join('');
  var qr=queue.map(function(inc,i){var rc=i<3?'#ef4444':i<6?'#f59e0b':'#475569';var sc=inc.priority_score>90?'#ef4444':inc.priority_score>70?'#f59e0b':'#eab308';return '<tr><td class="font-bold" style="color:'+rc+'">'+(i+1)+'</td><td class="font-mono text-xs font-bold" style="color:'+sc+'">'+inc.priority_score.toFixed(1)+'</td><td class="font-mono text-[10px] text-slate-600">'+inc.report_id+'</td><td class="text-xs">'+inc.category+'</td><td><span class="badge badge-'+inc.severity.toLowerCase()+'">'+inc.severity+'</span></td><td><span class="badge badge-'+inc.status+'">'+inc.status.replace('_',' ')+'</span></td><td class="text-xs text-slate-400">'+(inc.location_name||'').slice(0,28)+'</td></tr>';}).join('');
  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5"><div class="flex flex-wrap items-center justify-between gap-3 mb-5 fade-in"><div><h1 class="text-xl font-bold text-white"><i class="fas fa-terminal text-purple-400 mr-2"></i>AI Command Center</h1><p class="text-xs text-slate-600">Automated intelligence from live data</p></div><div class="text-[10px] text-slate-700">'+(summary&&summary.generated_at?new Date(summary.generated_at).toLocaleTimeString():'')+'</div></div>'+
    '<div class="panel p-5 mb-5 fade-in stagger-1" style="border-left:3px solid #8b5cf6"><div class="flex items-center gap-2.5 mb-3"><div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(139,92,246,.08)"><i class="fas fa-robot text-purple-400 text-sm"></i></div><div><h2 class="font-bold text-white text-sm">Situation Brief</h2><p class="text-[10px] text-slate-600">Auto-generated from current data</p></div></div><div class="brief-text text-xs text-slate-400 leading-relaxed">'+bp+'</div></div>'+mh+
    '<div class="grid lg:grid-cols-2 gap-4 mb-5"><div class="panel p-5 fade-in stagger-3"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-lightbulb text-amber-400 mr-1.5"></i>Recommendations</h3><div class="space-y-2">'+recs+'</div></div>'+
    '<div class="panel p-5 fade-in stagger-4"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-book-medical text-green-400 mr-1.5"></i>Emergency Guidance</h3><select id="guidance-select" class="field mb-3" onchange="loadGuidance()"><option value="">Select disaster type...</option><option>Flood</option><option>Fire</option><option>Earthquake</option><option>Landslide</option><option>Cyclone</option><option>Building Collapse</option><option>Medical Emergency</option><option>Road Blockage</option></select><div id="guidance-content" class="text-xs text-slate-600">Select a type above.</div></div></div>'+
    '<div class="panel p-5 fade-in stagger-5"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-ranking-star text-amber-400 mr-1.5"></i>Priority Queue</h3><div class="overflow-x-auto"><table class="data"><thead><tr><th>#</th><th>Score</th><th>ID</th><th>Type</th><th>Severity</th><th>Status</th><th>Location</th></tr></thead><tbody>'+qr+'</tbody></table></div></div></div>';
}

async function loadGuidance() {
  var cat=document.getElementById('guidance-select').value,el=document.getElementById('guidance-content');
  if(!cat){el.innerHTML='Select a type above.';return;}
  el.innerHTML='<div class="flex items-center gap-2"><div class="loader" style="width:16px;height:16px;border-width:2px"></div> Loading...</div>';
  try{var d=await request('/api/ai/guidance',{method:'POST',body:JSON.stringify({category:cat})});
    el.innerHTML='<div class="space-y-3">'+['steps','evacuation','actions'].map(function(k){var titles={steps:'Safety Steps',evacuation:'Evacuation',actions:'Actions'};var cols={steps:'#22c55e',evacuation:'#3b82f6',actions:'#f59e0b'};var icons={steps:'fa-shield-halved',evacuation:'fa-route',actions:'fa-hand-point-right'};return '<div><h4 class="text-[11px] font-semibold mb-1.5" style="color:'+cols[k]+'"><i class="fas '+icons[k]+' mr-1"></i>'+titles[k]+'</h4><ul class="space-y-0.5">'+d[k].map(function(s){return '<li class="flex gap-1.5 text-slate-400 text-xs leading-relaxed"><span style="color:'+cols[k]+'" class="shrink-0 mt-0.5">></span>'+s+'</li>';}).join('')+'</ul></div>';}).join('')+'</div>';
  }catch(e){el.innerHTML='<p class="text-red-400">Failed to load.</p>';}
}

async function sheltersPage() {
  var shelters=[];try{shelters=await request('/api/shelters');}catch(e){}
  var cities={};shelters.forEach(function(s){if(s.city)cities[s.city]=true;});
  var co=Object.keys(cities).sort().map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5"><div class="flex flex-wrap items-center justify-between gap-3 mb-5 fade-in"><div><h1 class="text-xl font-bold text-white">Shelter & Hospital Network</h1><p class="text-xs text-slate-600">'+shelters.length+' facilities across India</p></div><div class="flex gap-2"><select id="filter-type" class="field py-1 text-[11px]" style="width:auto" onchange="applyShelterFilter()"><option value="all">All Types</option><option value="shelter">Shelters</option><option value="hospital">Hospitals</option><option value="rescue_center">Rescue HQ</option></select><select id="filter-city" class="field py-1 text-[11px]" style="width:auto" onchange="applyShelterFilter()"><option value="all">All Cities</option>'+co+'</select></div></div><div id="shelter-grid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">'+shelters.map(function(s,i){return shelterCard(s,i);}).join('')+'</div></div>';
}

function shelterCard(s,idx) {
  var pct=s.capacity>0?Math.round(s.occupancy/s.capacity*100):0;
  var bc=pct>90?'#ef4444':pct>70?'#f59e0b':pct>50?'#eab308':'#22c55e';
  var sc={open:'#22c55e',full:'#ef4444',closed:'#475569',emergency:'#f59e0b'}[s.status]||'#3b82f6';
  var ti={shelter:'fa-campground',hospital:'fa-hospital',rescue_center:'fa-truck-medical'}[s.type]||'fa-building';
  var rs=[{l:'Water',v:s.water,m:1000},{l:'Food',v:s.food,m:800},{l:'Med',v:s.medicine,m:900},{l:'Blkt',v:s.blankets,m:700},{l:'Gear',v:s.rescue_equipment,m:200}];
  return '<div class="panel p-4 lift fade-in stagger-'+((idx%5)+1)+'"><div class="flex items-center justify-between mb-2.5"><div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:'+sc+'0d"><i class="fas '+ti+'" style="color:'+sc+'"></i></div><div><h3 class="font-semibold text-white text-xs leading-tight">'+s.name+'</h3><p class="text-[10px] text-slate-600">'+s.type.replace('_',' ').toUpperCase()+(s.city?' / '+s.city:'')+'</p></div></div><span class="badge badge-'+(s.status==='open'?'low':s.status==='emergency'?'high':s.status==='full'?'critical':'reported')+'">'+s.status+'</span></div>'+
    '<div class="mb-2.5"><div class="flex justify-between text-[10px] mb-1"><span class="text-slate-600">Occupancy</span><span class="font-semibold" style="color:'+bc+'">'+s.occupancy+' / '+s.capacity+' ('+pct+'%)</span></div><div class="progress"><span style="width:'+pct+'%;background:'+bc+'"></span></div></div>'+
    '<div class="grid grid-cols-5 gap-0.5 text-center mb-2">'+rs.map(function(r){var ratio=r.m>0?(r.v||0)/r.m:0;var c=ratio<0.15?'#ef4444':ratio<0.4?'#eab308':'#22c55e';return '<div><div class="text-[11px] font-bold" style="color:'+c+'">'+(r.v||0)+'</div><div class="text-[8px] text-slate-700">'+r.l+'</div></div>';}).join('')+'</div>'+
    (s.address?'<p class="text-[10px] text-slate-700"><i class="fas fa-location-dot mr-0.5"></i>'+s.address+'</p>':'')+(s.contact_phone?'<p class="text-[10px] text-slate-700 mt-0.5"><i class="fas fa-phone mr-0.5"></i>'+s.contact_phone+'</p>':'')+'</div>';
}

async function applyShelterFilter() {
  var t=document.getElementById('filter-type').value,c=document.getElementById('filter-city')?document.getElementById('filter-city').value:'all';
  var url='/api/shelters?type='+t;if(c!=='all')url+='&city='+encodeURIComponent(c);
  try{var s=await request(url);document.getElementById('shelter-grid').innerHTML=s.map(function(x,i){return shelterCard(x,i);}).join('');}catch(e){}
}

async function resourcesPage() {
  var resources=[],totals={};
  try{var d=await Promise.all([request('/api/resources'),request('/api/stats/resources')]);resources=d[0];totals=d[1];}catch(e){}
  var types=[{key:'water',label:'Water',icon:'fa-droplet',color:'#3b82f6',unit:'litres',max:1000,crit:300},{key:'food',label:'Food',icon:'fa-utensils',color:'#22c55e',unit:'packs',max:800,crit:200},{key:'medicine',label:'Medical',icon:'fa-pills',color:'#8b5cf6',unit:'units',max:900,crit:250},{key:'blankets',label:'Blankets',icon:'fa-bed',color:'#f59e0b',unit:'pcs',max:700,crit:150},{key:'rescue_equipment',label:'Rescue',icon:'fa-life-ring',color:'#ef4444',unit:'sets',max:200,crit:50}];
  var cards=types.map(function(t,i){var v=totals[t.key]||0;var lo=v<t.crit*3;return '<div class="panel p-3 text-center fade-in stagger-'+(i+1)+'"><div class="mb-1"><i class="fas '+t.icon+'" style="color:'+t.color+'"></i></div><div class="text-lg font-bold '+(lo?'text-red-400':'text-white')+'">'+v.toLocaleString()+'</div><div class="text-[9px] text-slate-700">'+t.unit+(lo?' -- LOW':'')+'</div></div>';}).join('');
  var rows=resources.map(function(r){return '<tr><td class="font-semibold text-white text-xs">'+r.shelter_name+'</td><td class="text-[10px] text-slate-600">'+(r.shelter_type||'').replace('_',' ')+'</td><td class="text-[10px] text-slate-600">'+(r.city||'')+'</td>'+types.map(function(t){var v=r[t.key]||0;var ratio=Math.min(v/t.max,1);var c=v<t.crit?'#ef4444':ratio<0.4?'#eab308':'#22c55e';return '<td><div class="flex items-center gap-1.5"><div class="resource-bar flex-1" style="min-width:50px"><span style="width:'+(ratio*100)+'%;background:'+c+'">'+(ratio>0.12?v:'')+'</span></div>'+(ratio<=0.12?'<span class="text-[10px]" style="color:'+c+'">'+v+'</span>':'')+'</div></td>';}).join('')+'</tr>';}).join('');
  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5"><div class="mb-5 fade-in"><h1 class="text-xl font-bold text-white">Resource Tracking</h1><p class="text-xs text-slate-600">Supply levels across all facilities</p></div><div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">'+cards+'</div><div class="panel p-5 fade-in stagger-3"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-warehouse text-cyan-400 mr-1.5"></i>Per-Facility Breakdown</h3><div class="overflow-x-auto"><table class="data"><thead><tr><th>Facility</th><th>Type</th><th>City</th>'+types.map(function(t){return '<th><i class="fas '+t.icon+'" style="color:'+t.color+'"></i> '+t.label+'</th>';}).join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
}

async function volunteersPage() {
  var vols=[];try{vols=await request('/api/volunteers');}catch(e){}
  var av=vols.filter(function(v){return v.availability==='available';}).length;
  var om=vols.filter(function(v){return v.availability==='on_mission';}).length;
  var od=vols.filter(function(v){return v.availability==='unavailable';}).length;
  var rows=vols.map(function(v){
    var c={available:'#22c55e',on_mission:'#f59e0b',unavailable:'#475569'}[v.availability]||'#475569';
    var skills=(v.skills||'').split(',').map(function(s){return '<span class="inline-block rounded px-1.5 py-0.5 mr-0.5 mb-0.5" style="background:rgba(255,255,255,.025);font-size:10px">'+s.trim()+'</span>';}).join('');
    return '<tr><td><div class="flex items-center gap-2"><div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:'+c+'12"><i class="fas fa-user text-[9px]" style="color:'+c+'"></i></div><span class="font-semibold text-white text-xs">'+v.name+'</span></div></td><td class="text-[11px] text-slate-400">'+skills+'</td><td><span class="badge badge-'+(v.availability==='available'?'low':v.availability==='on_mission'?'high':'reported')+'">'+v.availability.replace('_',' ')+'</span></td><td class="text-xs">'+(v.assigned_report_id?'<span class="text-purple-400">'+v.assigned_report_id+'</span>':'')+'</td><td class="text-[11px] text-slate-600">'+(v.phone||v.email)+'</td><td><button class="cta cta-sm cta-ghost" onclick="removeVolunteer('+v.id+',\''+v.name.replace(/'/g,"\\'")+'\')" title="Remove"><i class="fas fa-xmark text-red-400"></i></button></td></tr>';
  }).join('');
  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5"><div class="flex flex-wrap items-center justify-between gap-3 mb-5 fade-in"><div><h1 class="text-xl font-bold text-white">Volunteer Operations</h1><p class="text-xs text-slate-600">'+vols.length+' registered responders</p></div><button class="cta cta-blue cta-sm" onclick="document.getElementById(\'volunteer-form\').classList.toggle(\'hidden\')"><i class="fas fa-user-plus"></i> Register</button></div>'+
    '<div class="grid grid-cols-3 gap-3 mb-5 fade-in stagger-1">'+[{l:'Available',v:av,c:'#22c55e'},{l:'On Mission',v:om,c:'#f59e0b'},{l:'Off Duty',v:od,c:'#475569'}].map(function(s){return '<div class="panel p-3 text-center"><div class="text-xl font-bold" style="color:'+s.c+'">'+s.v+'</div><div class="text-[10px] text-slate-600 uppercase tracking-wider">'+s.l+'</div></div>';}).join('')+'</div>'+
    '<div id="volunteer-form" class="hidden panel p-5 mb-5 fade-in"><h3 class="font-semibold text-white text-sm mb-3">Register New Responder</h3><form onsubmit="registerVolunteer(event)" class="grid sm:grid-cols-2 gap-3"><div><label class="label">Full Name *</label><input type="text" id="vol-name" class="field" required placeholder="Full name"></div><div><label class="label">Email *</label><input type="email" id="vol-email" class="field" required placeholder="email@example.com"></div><div><label class="label">Phone</label><input type="tel" id="vol-phone" class="field" placeholder="+91-XXXXX-XXXXX"></div><div><label class="label">Skills</label><input type="text" id="vol-skills" class="field" placeholder="First Aid, Driving..."></div><div class="sm:col-span-2 flex gap-2"><button type="submit" class="cta cta-blue cta-sm"><i class="fas fa-user-plus"></i> Register</button><button type="button" class="cta cta-ghost cta-sm" onclick="document.getElementById(\'volunteer-form\').classList.add(\'hidden\')">Cancel</button></div></form></div>'+
    '<div class="panel p-5 fade-in stagger-2"><div class="overflow-x-auto"><table class="data"><thead><tr><th>Name</th><th>Skills</th><th>Status</th><th>Assignment</th><th>Contact</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'+
    '<div class="mt-4 p-3 rounded-lg text-center fade-in stagger-3" style="background:rgba(100,116,139,.06);border:1px solid rgba(100,116,139,.08)"><p class="text-[10px] text-slate-600"><i class="fas fa-info-circle mr-1"></i>Disclaimer: All volunteer profiles shown are fictional/simulated for demonstration purposes. They do not represent real individuals.</p></div></div>';
}

async function registerVolunteer(e) {
  e.preventDefault();
  try { await request('/api/volunteers',{method:'POST',body:JSON.stringify({name:document.getElementById('vol-name').value,email:document.getElementById('vol-email').value,phone:document.getElementById('vol-phone').value,skills:document.getElementById('vol-skills').value})}); notify('Registered','success'); render(); }
  catch(ex) { notify('Registration failed -- email may exist','error'); }
}

async function removeVolunteer(id, name) {
  if (!confirm('Remove ' + name + ' from the volunteer registry?')) return;
  try { await request('/api/volunteers/' + id, {method:'DELETE'}); notify(name + ' removed', 'success'); render(); }
  catch(e) { notify('Failed to remove', 'error'); }
}

async function render() {
  var path = location.pathname.replace(/^\//, '') || 'home';
  currentPage = path.split('/')[0] || 'home';
  if (leafletMap && currentPage !== 'map') { leafletMap.remove(); leafletMap = null; heatLayer = null; heatVisible = false; }
  Object.values(chartInstances).forEach(function(c){c.destroy();}); chartInstances = {};
  getSession();
  var banner = await warningBanner();
  var content = '';
  try {
    switch(currentPage) {
      case 'home': content = await homePage(); break;
      case 'report': content = reportPage(); break;
      case 'map': content = await mapPage(); break;
      case 'dashboard': content = await dashboardPage(); break;
      case 'command-center': content = await commandCenterPage(); break;
      case 'shelters': content = await sheltersPage(); break;
      case 'resources': content = await resourcesPage(); break;
      case 'volunteers': content = await volunteersPage(); break;
      default: content = await homePage();
    }
  } catch(e) {
    content = '<div class="max-w-md mx-auto px-4 py-20 text-center"><div class="panel p-7"><i class="fas fa-triangle-exclamation text-red-400 text-2xl mb-3"></i><h2 class="text-lg font-bold text-white mb-1">Something went wrong</h2><p class="text-slate-500 text-xs mb-3">' + e.message + '</p><button class="cta cta-blue cta-sm" onclick="navigate(\'home\')">Back to Home</button></div></div>';
  }
  document.getElementById('app').innerHTML = buildNav() + banner + content;
  var zone = document.getElementById('upload-zone');
  if (zone) {
    zone.addEventListener('dragover', function(ev) { ev.preventDefault(); zone.classList.add('dragging'); });
    zone.addEventListener('dragleave', function() { zone.classList.remove('dragging'); });
    zone.addEventListener('drop', function(ev) { ev.preventDefault(); zone.classList.remove('dragging'); if (ev.dataTransfer.files.length) { document.getElementById('file-input').files = ev.dataTransfer.files; handleUpload({target:{files:[ev.dataTransfer.files[0]]}}); } });
  }
}
render();
