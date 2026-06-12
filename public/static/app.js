var currentPage = '', leafletMap = null, heatLayer = null, chartInstances = {}, heatVisible = false, uploadedImage = null, uploadedImageInfo = null, analysisResult = null, session = null;

function getSession() {
  try {
    var stored = localStorage.getItem('crisisiq_session');
    if (stored) { session = JSON.parse(stored); return session; }
  } catch(e) {}
  return null;
}

function setSession(name, email) {
  session = { name: name, email: email };
  localStorage.setItem('crisisiq_session', JSON.stringify(session));
}

function clearSession() {
  session = null;
  localStorage.removeItem('crisisiq_session');
}

function navigate(path) {
  currentPage = path;
  history.pushState({}, '', path === 'home' ? '/' : '/' + path);
  render();
}

window.addEventListener('popstate', function() {
  currentPage = location.pathname.replace('/', '') || 'home';
  render();
});

function notify(message, type) {
  document.querySelectorAll('.notification').forEach(function(el) { el.remove(); });
  var el = document.createElement('div');
  el.className = 'notification notification-' + type;
  var icon = type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle';
  el.innerHTML = '<i class="fas fa-' + icon + '"></i> ' + message;
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 3000);
}

async function request(url, options) {
  var config = Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {});
  var response = await fetch(url, config);
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}

function elapsed(timestamp) {
  if (!timestamp) return '';
  var seconds = Math.floor((Date.now() - new Date(timestamp + (timestamp.includes('Z') ? '' : 'Z')).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

function buildNav() {
  var links = [
    { id: 'home', icon: 'fa-house', text: 'Home' },
    { id: 'report', icon: 'fa-circle-exclamation', text: 'Report' },
    { id: 'map', icon: 'fa-map-location-dot', text: 'Map' },
    { id: 'dashboard', icon: 'fa-chart-line', text: 'Dashboard' },
    { id: 'command-center', icon: 'fa-terminal', text: 'Command' },
    { id: 'shelters', icon: 'fa-hospital', text: 'Shelters' },
    { id: 'resources', icon: 'fa-cubes-stacked', text: 'Resources' },
    { id: 'volunteers', icon: 'fa-people-group', text: 'Volunteers' }
  ];

  var desktopLinks = links.map(function(l) {
    return '<a class="bar-link ' + (currentPage === l.id ? 'active' : '') + '" onclick="navigate(\'' + l.id + '\')"><i class="fas ' + l.icon + '"></i><span class="hidden lg:inline">' + l.text + '</span></a>';
  }).join('');

  var mobileLinks = links.map(function(l) {
    return '<a class="mobile-tab ' + (currentPage === l.id ? 'active' : '') + '" onclick="navigate(\'' + l.id + '\')"><i class="fas ' + l.icon + '"></i>' + l.text + '</a>';
  }).join('');

  var userBit = '';
  if (session) {
    userBit = '<div class="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer" onclick="if(confirm(\'Sign out?\')){ clearSession(); navigate(\'login\'); }">' +
      '<i class="fas fa-user-circle text-blue-400"></i> ' + session.name.split(' ')[0] + '</div>';
  }

  return '<nav class="bar"><div class="max-w-7xl mx-auto px-4 sm:px-6"><div class="flex items-center justify-between h-14">' +
    '<div class="flex items-center gap-2.5 cursor-pointer select-none" onclick="navigate(\'home\')">' +
    '<div style="width:30px;height:30px;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:7px;display:flex;align-items:center;justify-content:center"><i class="fas fa-shield-halved text-white text-xs"></i></div>' +
    '<span class="text-sm font-bold tracking-tight text-white">CrisisIQ</span></div>' +
    '<div class="desktop-links flex items-center gap-0.5 overflow-x-auto">' + desktopLinks + '</div>' +
    userBit +
    '</div></div></nav>' +
    '<div class="mobile-nav">' + mobileLinks + '</div>';
}

async function warningBanner() {
  try {
    var alerts = await request('/api/alerts');
    if (!alerts || alerts.length === 0) return '';
    var items = alerts.map(function(a) {
      var icon = a.severity === 'Critical' ? 'fa-skull-crossbones' : 'fa-triangle-exclamation';
      return '<span class="inline-flex items-center gap-1.5 mx-6"><i class="fas ' + icon + '"></i> <strong>' + a.category + '</strong> ' + (a.location_name || a.report_id) + ' — ' + a.severity + '</span>';
    }).join('');
    var doubled = items + items;
    return '<div class="warning-ticker"><div class="ticker-track">' + doubled + '</div></div>';
  } catch(e) { return ''; }
}

function loginPage() {
  return '<div class="min-h-screen flex items-center justify-center px-4" style="margin-top:-56px;padding-top:56px">' +
    '<div class="w-full max-w-sm">' +
    '<div class="text-center mb-8 fade-in">' +
    '<div style="width:56px;height:56px;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 16px"><i class="fas fa-shield-halved text-white text-xl"></i></div>' +
    '<h1 class="text-2xl font-bold text-white mb-1">CrisisIQ</h1>' +
    '<p class="text-sm text-slate-500">Sign in to access the platform</p></div>' +
    '<div class="panel p-6 fade-in stagger-1">' +
    '<form onsubmit="handleLogin(event)" class="space-y-4">' +
    '<div><label class="label">Full Name</label><input type="text" id="login-name" class="field" placeholder="Your name" required></div>' +
    '<div><label class="label">Email Address</label><input type="email" id="login-email" class="field" placeholder="you@example.com" required></div>' +
    '<p class="text-[10px] text-slate-700 leading-relaxed">Your info is stored locally so you don\'t have to re-enter it. We\'ll also use your email for incident alerts in your area.</p>' +
    '<button type="submit" class="cta cta-blue w-full justify-center py-2.5"><i class="fas fa-arrow-right-to-bracket"></i> Continue</button>' +
    '</form></div>' +
    '<p class="text-center text-[10px] text-slate-800 mt-4">National Emergency Coordination Platform</p>' +
    '</div></div>';
}

async function handleLogin(e) {
  e.preventDefault();
  var name = document.getElementById('login-name').value.trim();
  var email = document.getElementById('login-email').value.trim();
  if (!name || !email) return;
  try {
    await request('/api/session', { method: 'POST', body: JSON.stringify({ name: name, email: email }) });
  } catch(ex) {}
  setSession(name, email);
  notify('Welcome, ' + name.split(' ')[0], 'success');
  navigate('home');
}

async function homePage() {
  var stats = {};
  try { stats = await request('/api/stats'); } catch(e) {}

  var cards = [
    { label: 'Active Incidents', value: stats.activeIncidents || 0, icon: 'fa-bolt', color: '#ef4444' },
    { label: 'Critical', value: stats.criticalIncidents || 0, icon: 'fa-triangle-exclamation', color: '#f59e0b' },
    { label: 'Shelter Load', value: (stats.shelterOccupancy || 0) + '%', icon: 'fa-hospital', color: '#3b82f6' },
    { label: 'Responders', value: stats.totalVolunteers || 0, icon: 'fa-user-shield', color: '#22c55e' }
  ];

  var features = [
    { title: 'Incident Reporting', desc: 'Submit field reports with photographic evidence. AI classifies disaster type and severity in real-time.', icon: 'fa-camera-retro', color: '#3b82f6', page: 'report' },
    { title: 'Situation Map', desc: 'Active incidents plotted on a live India-wide map with severity markers and toggleable heatmap.', icon: 'fa-earth-asia', color: '#22c55e', page: 'map' },
    { title: 'AI Command Center', desc: 'Situational briefings, AI-ranked priority queue, and actionable recommendations from live data.', icon: 'fa-terminal', color: '#8b5cf6', page: 'command-center' },
    { title: 'Operations Dashboard', desc: 'Aggregated statistics, category breakdowns, and dispatch-ready incident management console.', icon: 'fa-gauge-high', color: '#06b6d4', page: 'dashboard' },
    { title: 'Shelter Network', desc: 'Real-time occupancy, resource levels, and status of hospitals and relief camps across India.', icon: 'fa-hospital', color: '#f59e0b', page: 'shelters' },
    { title: 'Volunteer Ops', desc: 'Responder registry, skill matching, mission tracking, and deployment status across all field personnel.', icon: 'fa-handshake-angle', color: '#ec4899', page: 'volunteers' }
  ];

  return '<section class="relative overflow-hidden"><div class="hero-gradient"></div>' +
    '<div class="max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-10 text-center relative">' +
    '<div class="fade-in">' +
    '<div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full panel-sm text-xs text-blue-400 mb-6 font-medium"><i class="fas fa-satellite-dish text-[10px]"></i> India-Wide Emergency Response Network</div>' +
    '<h1 class="text-[clamp(1.8rem,5vw,3.5rem)] font-extrabold mb-4 leading-[1.1] tracking-tight">' +
    '<span class="text-white">Disaster Intelligence</span><br>' +
    '<span style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Command Platform</span></h1>' +
    '<p class="text-sm sm:text-[15px] text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">Real-time incident coordination, AI severity assessment, and resource allocation across India\'s emergency infrastructure.</p>' +
    '<div class="flex flex-wrap justify-center gap-3 mb-12">' +
    '<button onclick="navigate(\'report\')" class="cta cta-blue px-6 py-2.5"><i class="fas fa-circle-exclamation"></i> Report Emergency</button>' +
    '<button onclick="navigate(\'dashboard\')" class="cta cta-ghost px-6 py-2.5"><i class="fas fa-chart-line"></i> Open Dashboard</button></div></div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">' +
    cards.map(function(c, idx) {
      return '<div class="panel p-3.5 fade-in stagger-' + (idx + 1) + ' lift text-center">' +
        '<div style="color:' + c.color + '" class="text-lg mb-1"><i class="fas ' + c.icon + '"></i></div>' +
        '<div class="stat-val text-white">' + c.value + '</div>' +
        '<div class="text-[9px] text-slate-600 mt-1 font-medium tracking-wide uppercase">' + c.label + '</div></div>';
    }).join('') +
    '</div></div></section>' +
    '<section class="max-w-6xl mx-auto px-4 sm:px-6 pb-14"><div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">' +
    features.map(function(f, idx) {
      return '<div class="panel p-5 lift cursor-pointer fade-in stagger-' + ((idx % 5) + 1) + '" onclick="navigate(\'' + f.page + '\')">' +
        '<div class="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style="background:' + f.color + '0d;border:1px solid ' + f.color + '1a"><i class="fas ' + f.icon + '" style="color:' + f.color + '"></i></div>' +
        '<h3 class="text-sm font-semibold text-white mb-1.5">' + f.title + '</h3>' +
        '<p class="text-xs text-slate-500 leading-relaxed">' + f.desc + '</p></div>';
    }).join('') +
    '</div></section>';
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
    '<option value="">Select type...</option><option value="Flood">Flood</option><option value="Fire">Fire</option>' +
    '<option value="Earthquake">Earthquake</option><option value="Landslide">Landslide</option>' +
    '<option value="Cyclone">Cyclone</option><option value="Building Collapse">Building Collapse</option>' +
    '<option value="Medical Emergency">Medical Emergency</option><option value="Road Blockage">Road Blockage</option></select></div>' +
    '<div><label class="label">Your Name</label><input type="text" id="inp-name" class="field" placeholder="Full name" value="' + nameVal + '"></div></div>' +
    '<div class="grid sm:grid-cols-2 gap-5">' +
    '<div><label class="label">Email</label><input type="email" id="inp-email" class="field" placeholder="you@email.com" value="' + emailVal + '"></div>' +
    '<div><label class="label">Phone</label><input type="tel" id="inp-phone" class="field" placeholder="+91-XXXXX-XXXXX"></div></div>' +
    '<div><label class="label">Description *</label><textarea id="inp-desc" class="field" placeholder="What is happening? How many people are affected? What dangers are present? Be as detailed as you can — the AI will use every bit of this to assess severity." required></textarea></div>' +
    '<div><label class="label">Location / Landmark</label><input type="text" id="inp-location" class="field" placeholder="e.g. Near ITO Flyover, Yamuna Bank, Mumbai"></div>' +
    '<div class="grid sm:grid-cols-2 gap-5">' +
    '<div><label class="label">Latitude *</label><input type="number" id="inp-lat" class="field" step="any" placeholder="28.6139" required></div>' +
    '<div><label class="label">Longitude *</label><input type="number" id="inp-lng" class="field" step="any" placeholder="77.2090" required></div></div>' +
    '<button type="button" class="cta cta-ghost cta-sm" onclick="detectLocation()"><i class="fas fa-location-crosshairs"></i> Use My Location</button>' +
    '<div><label class="label">Upload Evidence Photo</label>' +
    '<div id="upload-zone" class="dropzone" onclick="document.getElementById(\'file-input\').click()">' +
    '<input type="file" id="file-input" accept="image/*" class="hidden" onchange="handleUpload(event)">' +
    '<div id="upload-preview" class="hidden"></div>' +
    '<div id="upload-prompt"><i class="fas fa-cloud-arrow-up text-3xl text-slate-700 mb-2"></i>' +
    '<p class="text-slate-500 text-xs">Click to upload or drag an image here</p>' +
    '<p class="text-slate-700 text-[10px] mt-1">PNG, JPG, WebP — max 5 MB. The AI will factor this into its analysis.</p></div></div></div>' +
    '<div id="analysis-output" class="hidden"></div>' +
    '<div class="flex gap-3 pt-2">' +
    '<button type="button" class="cta cta-ghost flex-1" onclick="runAnalysis()"><i class="fas fa-microchip"></i> Analyze with AI</button>' +
    '<button type="submit" class="cta cta-blue flex-1"><i class="fas fa-paper-plane"></i> Submit Report</button></div></form></div>';
}

function detectLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      document.getElementById('inp-lat').value = pos.coords.latitude.toFixed(6);
      document.getElementById('inp-lng').value = pos.coords.longitude.toFixed(6);
      notify('Location acquired', 'success');
    }, function() {
      document.getElementById('inp-lat').value = (28.58 + Math.random() * 0.1).toFixed(6);
      document.getElementById('inp-lng').value = (77.17 + Math.random() * 0.1).toFixed(6);
      notify('Approximate location set', 'info');
    });
  } else {
    document.getElementById('inp-lat').value = '28.6139';
    document.getElementById('inp-lng').value = '77.2090';
  }
}

function handleUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { notify('File exceeds 5 MB limit', 'error'); return; }
  uploadedImageInfo = { filename: file.name, size: file.size, type: file.type, lastModified: file.lastModified };
  var reader = new FileReader();
  reader.onload = function(ev) {
    uploadedImage = ev.target.result;
    document.getElementById('upload-preview').innerHTML = '<img src="' + ev.target.result + '" class="max-h-44 mx-auto rounded-lg mb-2">' +
      '<p class="text-xs text-green-400"><i class="fas fa-check"></i> ' + file.name + ' (' + (file.size / 1024).toFixed(0) + ' KB)</p>';
    document.getElementById('upload-preview').classList.remove('hidden');
    document.getElementById('upload-prompt').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

async function runAnalysis() {
  var category = document.getElementById('inp-category').value;
  var description = document.getElementById('inp-desc').value;
  if (!category && !description) { notify('Add a description or select the incident type first', 'error'); return; }

  var output = document.getElementById('analysis-output');
  output.classList.remove('hidden');
  output.innerHTML = '<div class="analysis-box flex items-center gap-4"><div class="loader"></div><div><p class="text-blue-400 font-semibold text-sm">Running deep analysis...</p><p class="text-xs text-slate-500">Evaluating description patterns, category signals' + (uploadedImage ? ', and uploaded image metadata' : '') + '</p></div></div>';

  try {
    var payload = {
      category: category,
      description: description,
      image_data: uploadedImage ? 'present' : null,
      image_info: uploadedImageInfo || {}
    };

    var result = await request('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    analysisResult = result;

    var confColor = result.confidence > 85 ? '#22c55e' : result.confidence > 70 ? '#f59e0b' : result.confidence > 55 ? '#eab308' : '#ef4444';
    var sevColor = result.severity === 'Critical' ? '#ef4444' : result.severity === 'High' ? '#f59e0b' : result.severity === 'Moderate' ? '#eab308' : '#22c55e';

    var actionsHtml = '';
    if (result.recommended_actions && result.recommended_actions.length) {
      actionsHtml = '<div class="mt-3 pt-3" style="border-top:1px solid rgba(148,163,184,.06)"><p class="text-[10px] font-semibold text-amber-400 mb-1.5"><i class="fas fa-lightbulb mr-1"></i>Recommended Actions</p>' +
        '<ul class="space-y-1">' + result.recommended_actions.map(function(a) {
          return '<li class="text-[11px] text-slate-500 flex gap-1.5"><span class="text-amber-400 shrink-0">\u203a</span>' + a + '</li>';
        }).join('') + '</ul></div>';
    }

    output.innerHTML = '<div class="analysis-box fade-in">' +
      '<div class="flex items-center gap-2.5 mb-4">' +
      '<div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(59,130,246,.08)"><i class="fas fa-microchip text-blue-400 text-sm"></i></div>' +
      '<div><h3 class="font-semibold text-white text-sm">Analysis Complete</h3>' +
      '<p class="text-[10px] text-slate-500">' + result.factors_detected + ' signals \u00b7 ' + result.critical_indicators + ' critical \u00b7 ' + result.risk_indicators + ' risk indicators</p></div>' +
      (result.image_analyzed ? '<span class="badge badge-verified ml-auto"><i class="fas fa-image"></i> Image Analyzed</span>' : '') +
      (result.secondary_category ? '<span class="badge badge-reported ml-1">' + result.secondary_category + '?</span>' : '') + '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">' +
      [
        { label: 'Type', value: result.category, color: '#e2e8f0' },
        { label: 'Confidence', value: result.confidence + '%', color: confColor },
        { label: 'Severity', value: result.severity, color: sevColor },
        { label: 'Urgency', value: result.urgency, color: sevColor }
      ].map(function(m) {
        return '<div class="text-center p-2.5 rounded-lg" style="background:rgba(255,255,255,.025)"><div class="text-[10px] text-slate-500 mb-0.5">' + m.label + '</div><div class="font-bold text-xs" style="color:' + m.color + '">' + m.value + '</div></div>';
      }).join('') + '</div>' +
      '<p class="text-xs text-slate-400 leading-relaxed">' + result.explanation + '</p>' +
      actionsHtml + '</div>';

    notify('Analysis complete', 'success');
  } catch(e) {
    output.innerHTML = '<div class="analysis-box"><p class="text-red-400 text-sm"><i class="fas fa-xmark"></i> Analysis unavailable. You can still submit the report manually.</p></div>';
  }
}

async function submitReport(e) {
  e.preventDefault();
  var btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.innerHTML = '<div class="loader" style="width:16px;height:16px;border-width:2px"></div> Submitting...';

  var ai = analysisResult || {};
  try {
    var result = await request('/api/incidents', {
      method: 'POST',
      body: JSON.stringify({
        category: document.getElementById('inp-category').value,
        description: document.getElementById('inp-desc').value,
        latitude: parseFloat(document.getElementById('inp-lat').value),
        longitude: parseFloat(document.getElementById('inp-lng').value),
        location_name: document.getElementById('inp-location').value,
        reporter_name: document.getElementById('inp-name').value,
        reporter_email: document.getElementById('inp-email').value,
        reporter_phone: document.getElementById('inp-phone').value,
        severity: ai.severity || 'Moderate',
        urgency: ai.urgency || 'Medium',
        ai_confidence: ai.confidence || 0,
        ai_explanation: ai.explanation || '',
        image_data: uploadedImage ? 'uploaded' : null
      })
    });
    notify('Incident reported \u2014 ' + result.report_id, 'success');
    analysisResult = null;
    uploadedImage = null;
    uploadedImageInfo = null;
    setTimeout(function() { navigate('map'); }, 1200);
  } catch(ex) {
    notify('Submission failed', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Report';
  }
}

async function mapPage() {
  var incidents = [];
  var shelters = [];
  try {
    var data = await Promise.all([request('/api/incidents'), request('/api/shelters')]);
    incidents = data[0];
    shelters = data[1];
  } catch(e) {}

  setTimeout(function() { setupMap(incidents, shelters); }, 80);

  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">' +
    '<div class="flex flex-wrap items-center justify-between gap-3 mb-4 fade-in">' +
    '<div><h1 class="text-xl font-bold text-white">Situation Map</h1>' +
    '<p class="text-xs text-slate-600">' + incidents.length + ' incidents \u00b7 ' + shelters.length + ' facilities across India</p></div>' +
    '<div class="flex gap-2">' +
    '<button class="cta cta-sm cta-ghost" onclick="toggleHeatmap()"><i class="fas fa-fire"></i> Heatmap</button>' +
    '<button class="cta cta-sm cta-ghost" onclick="leafletMap&&leafletMap.setView([22.5,82],5)"><i class="fas fa-expand"></i> India</button>' +
    '<button class="cta cta-sm cta-ghost" onclick="leafletMap&&leafletMap.setView([28.62,77.22],11)"><i class="fas fa-location-dot"></i> Delhi</button></div></div>' +
    '<div class="map-wrap fade-in stagger-1" style="height:calc(100vh - 170px);min-height:460px"><div id="map-container" style="height:100%;width:100%"></div></div>' +
    '<div class="flex flex-wrap gap-4 mt-3 fade-in stagger-2">' +
    [{ label: 'Critical', color: '#ef4444' }, { label: 'High', color: '#f59e0b' }, { label: 'Moderate', color: '#eab308' }, { label: 'Low / Facility', color: '#22c55e' }].map(function(x) {
      return '<div class="flex items-center gap-1.5 text-[11px] text-slate-500"><span style="width:9px;height:9px;border-radius:50%;background:' + x.color + ';display:inline-block"></span>' + x.label + '</div>';
    }).join('') + '</div></div>';
}

function setupMap(incidents, shelters) {
  if (leafletMap) { leafletMap.remove(); leafletMap = null; heatLayer = null; heatVisible = false; }
  var container = document.getElementById('map-container');
  if (!container) return;

  var hasIncidents = incidents.length > 0;
  var startLat = hasIncidents ? incidents[0].latitude : 22.5;
  var startLng = hasIncidents ? incidents[0].longitude : 82;
  var startZoom = hasIncidents ? 10 : 5;

  leafletMap = L.map('map-container', { zoomControl: true }).setView([startLat, startLng], startZoom);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '\u00a9 OSM & CartoDB', maxZoom: 19
  }).addTo(leafletMap);

  var severityColors = { Critical: '#ef4444', High: '#f59e0b', Moderate: '#eab308', Low: '#22c55e' };
  var categoryIcons = {
    Flood: '\u{1F30A}', Fire: '\u{1F525}', Earthquake: '\u{1F3DA}', Landslide: '\u26F0\uFE0F',
    Cyclone: '\u{1F32A}', 'Building Collapse': '\u{1F3D7}', 'Medical Emergency': '\u{1F691}', 'Road Blockage': '\u{1F6A7}'
  };

  var heatData = [];

  incidents.forEach(function(inc) {
    var col = severityColors[inc.severity] || '#eab308';
    var intensity = inc.severity === 'Critical' ? 1 : inc.severity === 'High' ? 0.7 : inc.severity === 'Moderate' ? 0.4 : 0.2;
    heatData.push([inc.latitude, inc.longitude, intensity]);

    var radius = inc.severity === 'Critical' ? 11 : inc.severity === 'High' ? 9 : 7;
    L.circleMarker([inc.latitude, inc.longitude], {
      radius: radius, fillColor: col, color: col, weight: 2, opacity: 0.8, fillOpacity: 0.3
    }).addTo(leafletMap).bindPopup(
      '<div style="min-width:180px">' +
      '<div style="font-size:14px;margin-bottom:3px">' + (categoryIcons[inc.category] || '\u26A0\uFE0F') + ' <strong>' + inc.category + '</strong></div>' +
      '<div style="font-size:10px;color:#64748b;margin-bottom:5px">' + inc.report_id + ' \u00b7 ' + (inc.location_name || '') + '</div>' +
      '<div style="margin-bottom:4px"><span class="badge badge-' + inc.severity.toLowerCase() + '">' + inc.severity + '</span> <span class="badge badge-' + inc.status + '">' + inc.status.replace('_', ' ') + '</span></div>' +
      '<p style="font-size:11px;color:#94a3b8;line-height:1.5;margin-bottom:4px">' + (inc.description || '').slice(0, 100) + (inc.description && inc.description.length > 100 ? '...' : '') + '</p>' +
      (inc.assigned_team ? '<div style="font-size:10px;color:#8b5cf6"><i class="fas fa-users"></i> ' + inc.assigned_team + '</div>' : '') + '</div>'
    );
  });

  var facilityIcons = { shelter: '\u{1F3E0}', hospital: '\u{1F3E5}', rescue_center: '\u{1F692}' };

  shelters.forEach(function(s) {
    var pct = s.capacity > 0 ? Math.round(s.occupancy / s.capacity * 100) : 0;
    var col = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';

    L.marker([s.latitude, s.longitude], {
      icon: L.divIcon({
        html: '<div style="font-size:19px;text-align:center;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))">' + (facilityIcons[s.type] || '\u{1F3E0}') + '</div>',
        iconSize: [26, 26], className: ''
      })
    }).addTo(leafletMap).bindPopup(
      '<div style="min-width:180px"><strong>' + s.name + '</strong>' +
      '<div style="font-size:10px;color:#64748b;margin:3px 0">' + s.type.replace('_', ' ').toUpperCase() + ' \u00b7 ' + (s.city || '') + ' \u00b7 ' + (s.address || '') + '</div>' +
      '<div style="margin:5px 0"><div style="display:flex;justify-content:space-between;font-size:10.5px;margin-bottom:2px"><span>Occupancy</span><span style="color:' + col + ';font-weight:700">' + s.occupancy + '/' + s.capacity + ' (' + pct + '%)</span></div>' +
      '<div class="progress"><span style="width:' + pct + '%;background:' + col + '"></span></div></div>' +
      (s.contact_phone ? '<div style="font-size:10px;color:#64748b"><i class="fas fa-phone"></i> ' + s.contact_phone + '</div>' : '') + '</div>'
    );
  });

  if (heatData.length) {
    heatLayer = L.heatLayer(heatData, {
      radius: 30, blur: 22, maxZoom: 15, max: 1,
      gradient: { 0.2: '#22c55e', 0.4: '#eab308', 0.6: '#f59e0b', 0.8: '#ef4444', 1: '#991b1b' }
    });
  }

  setTimeout(function() { if (leafletMap) leafletMap.invalidateSize(); }, 150);
}

function toggleHeatmap() {
  if (!leafletMap || !heatLayer) return;
  if (heatVisible) {
    leafletMap.removeLayer(heatLayer);
    heatVisible = false;
    notify('Heatmap off', 'info');
  } else {
    heatLayer.addTo(leafletMap);
    heatVisible = true;
    notify('Heatmap on', 'info');
  }
}

async function dashboardPage() {
  var stats = {}, incidents = [], categories = [], severity = [];
  try {
    var data = await Promise.all([
      request('/api/stats'),
      request('/api/incidents?limit=12'),
      request('/api/stats/categories'),
      request('/api/stats/severity')
    ]);
    stats = data[0]; incidents = data[1]; categories = data[2]; severity = data[3];
  } catch(e) {}

  setTimeout(function() { setupCharts(categories, severity); }, 150);

  var statCards = [
    { label: 'Total', value: stats.totalIncidents || 0, icon: 'fa-layer-group', color: '#3b82f6' },
    { label: 'Active', value: stats.activeIncidents || 0, icon: 'fa-bolt', color: '#f59e0b' },
    { label: 'Critical', value: stats.criticalIncidents || 0, icon: 'fa-skull-crossbones', color: '#ef4444' },
    { label: 'Shelter Load', value: (stats.shelterOccupancy || 0) + '%', icon: 'fa-hospital', color: '#8b5cf6' },
    { label: 'Responders', value: (stats.availableVolunteers || 0) + '/' + (stats.totalVolunteers || 0), icon: 'fa-user-shield', color: '#22c55e' }
  ];

  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">' +
    '<div class="flex flex-wrap items-center justify-between gap-3 mb-5 fade-in"><div><h1 class="text-xl font-bold text-white">Operations Dashboard</h1><p class="text-xs text-slate-600">Aggregated view of all active operations</p></div>' +
    '<button class="cta cta-sm cta-ghost" onclick="render()"><i class="fas fa-rotate"></i> Refresh</button></div>' +
    '<div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">' +
    statCards.map(function(c, idx) {
      return '<div class="panel p-4 fade-in stagger-' + (idx + 1) + ' lift">' +
        '<div class="flex items-center justify-between mb-2.5"><div class="w-9 h-9 rounded-lg flex items-center justify-center" style="background:' + c.color + '0d"><i class="fas ' + c.icon + '" style="color:' + c.color + '"></i></div></div>' +
        '<div class="stat-val text-white">' + c.value + '</div>' +
        '<div class="text-[10px] text-slate-600 mt-0.5 font-medium tracking-wide uppercase">' + c.label + '</div></div>';
    }).join('') + '</div>' +
    '<div class="grid lg:grid-cols-2 gap-4 mb-6">' +
    '<div class="panel p-5 fade-in stagger-2"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-chart-pie text-blue-400 mr-1.5"></i>By Category</h3><div style="height:250px"><canvas id="chart-category"></canvas></div></div>' +
    '<div class="panel p-5 fade-in stagger-3"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-chart-bar text-purple-400 mr-1.5"></i>By Severity</h3><div style="height:250px"><canvas id="chart-severity"></canvas></div></div></div>' +
    '<div class="panel p-5 fade-in stagger-4">' +
    '<div class="flex items-center justify-between mb-3"><h3 class="font-semibold text-white text-sm"><i class="fas fa-list-check text-cyan-400 mr-1.5"></i>Incident Console</h3>' +
    '<select id="filter-status" class="field py-1 text-[11px]" style="width:auto" onchange="applyIncidentFilter()">' +
    '<option value="all">All</option><option value="reported">Reported</option><option value="verified">Verified</option><option value="dispatched">Dispatched</option><option value="in_progress">In Progress</option><option value="resolved">Resolved</option></select></div>' +
    '<div class="overflow-x-auto"><table class="data"><thead><tr><th>ID</th><th>Type</th><th>Location</th><th>Severity</th><th>Status</th><th>Team</th><th>Time</th><th>Actions</th></tr></thead>' +
    '<tbody id="incident-tbody">' + incidents.map(function(i) { return incidentRow(i); }).join('') + '</tbody></table></div></div></div>';
}

function incidentRow(inc) {
  var icons = {
    Flood: '\u{1F30A}', Fire: '\u{1F525}', Earthquake: '\u{1F3DA}', Landslide: '\u26F0\uFE0F',
    Cyclone: '\u{1F32A}', 'Building Collapse': '\u{1F3D7}', 'Medical Emergency': '\u{1F691}', 'Road Blockage': '\u{1F6A7}'
  };

  var actions = '';
  if (inc.status === 'reported') actions = '<button class="cta cta-sm cta-blue" onclick="updateIncident(' + inc.id + ',\'verified\')"><i class="fas fa-check"></i></button>';
  if (inc.status === 'verified') actions = '<button class="cta cta-sm cta-amber" onclick="dispatchTeam(' + inc.id + ')"><i class="fas fa-truck-fast"></i></button>';
  if (inc.status === 'dispatched' || inc.status === 'in_progress') actions = '<button class="cta cta-sm cta-green" onclick="updateIncident(' + inc.id + ',\'resolved\')"><i class="fas fa-flag-checkered"></i></button>';

  return '<tr>' +
    '<td class="font-mono text-[11px] text-slate-600">' + inc.report_id + '</td>' +
    '<td class="text-xs">' + (icons[inc.category] || '') + ' ' + inc.category + '</td>' +
    '<td class="text-xs text-slate-400">' + (inc.location_name || '').slice(0, 26) + '</td>' +
    '<td><span class="badge badge-' + inc.severity.toLowerCase() + '">' + inc.severity + '</span></td>' +
    '<td><span class="badge badge-' + inc.status + '">' + inc.status.replace('_', ' ') + '</span></td>' +
    '<td class="text-xs">' + (inc.assigned_team || '<span class="text-slate-700">\u2014</span>') + '</td>' +
    '<td class="text-[11px] text-slate-600">' + elapsed(inc.created_at) + '</td>' +
    '<td><div class="flex gap-1">' + actions + '</div></td></tr>';
}

async function applyIncidentFilter() {
  try {
    var incidents = await request('/api/incidents?status=' + document.getElementById('filter-status').value + '&limit=15');
    document.getElementById('incident-tbody').innerHTML = incidents.map(function(i) { return incidentRow(i); }).join('');
  } catch(e) {}
}

async function updateIncident(id, status) {
  try {
    await request('/api/incidents/' + id, { method: 'PATCH', body: JSON.stringify({ status: status }) });
    notify('Updated', 'success');
    render();
  } catch(e) { notify('Failed', 'error'); }
}

async function dispatchTeam(id) {
  var teams = ['NDRF 2nd Bn Alpha', 'Delhi Fire Service Unit 3', 'SDRF Delta', 'Civil Defence Rapid Response', 'CATS Ambulance Team'];
  var selected = teams[Math.floor(Math.random() * teams.length)];
  try {
    await request('/api/incidents/' + id, { method: 'PATCH', body: JSON.stringify({ status: 'dispatched', assigned_team: selected }) });
    notify('Team dispatched: ' + selected, 'success');
    render();
  } catch(e) { notify('Failed', 'error'); }
}

function setupCharts(categories, severity) {
  Object.values(chartInstances).forEach(function(c) { c.destroy(); });
  chartInstances = {};

  var catCanvas = document.getElementById('chart-category');
  if (catCanvas) {
    chartInstances.category = new Chart(catCanvas, {
      type: 'doughnut',
      data: {
        labels: categories.map(function(c) { return c.category; }),
        datasets: [{
          data: categories.map(function(c) { return c.count; }),
          backgroundColor: ['#3b82f6', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#8b5cf6', '#06b6d4', '#ec4899'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#64748b', padding: 10, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } } },
        cutout: '60%'
      }
    });
  }

  var sevCanvas = document.getElementById('chart-severity');
  if (sevCanvas) {
    var colorMap = { Critical: '#ef4444', High: '#f59e0b', Moderate: '#eab308', Low: '#22c55e' };
    chartInstances.severity = new Chart(sevCanvas, {
      type: 'bar',
      data: {
        labels: severity.map(function(s) { return s.severity; }),
        datasets: [{
          data: severity.map(function(s) { return s.count; }),
          backgroundColor: severity.map(function(s) { return colorMap[s.severity] || '#475569'; }),
          borderRadius: 5, barThickness: 34
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 11 } } },
          y: { grid: { color: 'rgba(148,163,184,.04)' }, ticks: { color: '#475569', stepSize: 1 } }
        }
      }
    });
  }
}

async function commandCenterPage() {
  var summary = null, queue = [];
  try {
    var data = await Promise.all([request('/api/ai/summary'), request('/api/incidents/priority/queue')]);
    summary = data[0]; queue = data[1];
  } catch(e) {}

  var metricsHtml = '';
  if (summary && summary.metrics) {
    var m = summary.metrics;
    var metricItems = [
      { label: 'Active', value: m.activeIncidents, color: '#3b82f6' },
      { label: 'Critical', value: m.criticalIncidents, color: '#ef4444' },
      { label: 'High', value: m.highPriorityIncidents, color: '#f59e0b' },
      { label: 'Shelter', value: m.shelterOccupancy + '%', color: '#8b5cf6' },
      { label: 'Available', value: m.availableVolunteers, color: '#22c55e' },
      { label: 'Total Resp.', value: m.totalVolunteers, color: '#06b6d4' }
    ];
    metricsHtml = '<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 fade-in stagger-2">' +
      metricItems.map(function(item) {
        return '<div class="panel-sm p-3 text-center"><div class="text-lg font-bold" style="color:' + item.color + '">' + item.value + '</div><div class="text-[9px] text-slate-600 mt-0.5 uppercase tracking-wider font-medium">' + item.label + '</div></div>';
      }).join('') + '</div>';
  }

  var briefParagraphs = (summary && summary.summary ? summary.summary : 'No data available.').split('\n\n').map(function(p) {
    return '<p>' + p.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') + '</p>';
  }).join('');

  var recommendations = (summary && summary.recommendations ? summary.recommendations : []).map(function(rec, idx) {
    return '<div class="flex gap-2.5 p-2.5 rounded-lg" style="background:rgba(255,255,255,.015)">' +
      '<div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style="background:rgba(245,158,11,.08)"><span class="text-[10px] font-bold text-amber-400">' + (idx + 1) + '</span></div>' +
      '<p class="text-xs text-slate-400">' + rec + '</p></div>';
  }).join('');

  var queueRows = queue.map(function(inc, idx) {
    var rankColor = idx < 3 ? '#ef4444' : idx < 6 ? '#f59e0b' : '#475569';
    var scoreColor = inc.priority_score > 90 ? '#ef4444' : inc.priority_score > 70 ? '#f59e0b' : '#eab308';
    return '<tr><td class="font-bold" style="color:' + rankColor + '">' + (idx + 1) + '</td>' +
      '<td class="font-mono text-xs font-bold" style="color:' + scoreColor + '">' + inc.priority_score.toFixed(1) + '</td>' +
      '<td class="font-mono text-[10px] text-slate-600">' + inc.report_id + '</td>' +
      '<td class="text-xs">' + inc.category + '</td>' +
      '<td><span class="badge badge-' + inc.severity.toLowerCase() + '">' + inc.severity + '</span></td>' +
      '<td><span class="badge badge-' + inc.status + '">' + inc.status.replace('_', ' ') + '</span></td>' +
      '<td class="text-xs text-slate-400">' + (inc.location_name || '').slice(0, 28) + '</td></tr>';
  }).join('');

  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">' +
    '<div class="flex flex-wrap items-center justify-between gap-3 mb-5 fade-in"><div><h1 class="text-xl font-bold text-white"><i class="fas fa-terminal text-purple-400 mr-2"></i>AI Command Center</h1><p class="text-xs text-slate-600">Automated intelligence from live operational data</p></div>' +
    '<div class="text-[10px] text-slate-700">' + (summary && summary.generated_at ? new Date(summary.generated_at).toLocaleTimeString() : '') + '</div></div>' +
    '<div class="panel p-5 mb-5 fade-in stagger-1" style="border-left:3px solid #8b5cf6">' +
    '<div class="flex items-center gap-2.5 mb-3"><div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:rgba(139,92,246,.08)"><i class="fas fa-robot text-purple-400 text-sm"></i></div><div><h2 class="font-bold text-white text-sm">Situation Brief</h2><p class="text-[10px] text-slate-600">Auto-generated from current incident, shelter, and resource data</p></div></div>' +
    '<div class="brief-text text-xs text-slate-400 leading-relaxed">' + briefParagraphs + '</div></div>' +
    metricsHtml +
    '<div class="grid lg:grid-cols-2 gap-4 mb-5">' +
    '<div class="panel p-5 fade-in stagger-3"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-lightbulb text-amber-400 mr-1.5"></i>Recommendations</h3><div class="space-y-2">' + recommendations + '</div></div>' +
    '<div class="panel p-5 fade-in stagger-4"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-book-medical text-green-400 mr-1.5"></i>Emergency Guidance</h3>' +
    '<select id="guidance-select" class="field mb-3" onchange="loadGuidance()">' +
    '<option value="">Select disaster type...</option><option value="Flood">Flood</option><option value="Fire">Fire</option><option value="Earthquake">Earthquake</option><option value="Landslide">Landslide</option><option value="Cyclone">Cyclone</option><option value="Building Collapse">Building Collapse</option><option value="Medical Emergency">Medical Emergency</option><option value="Road Blockage">Road Blockage</option></select>' +
    '<div id="guidance-content" class="text-xs text-slate-600">Select a type above to see protocols.</div></div></div>' +
    '<div class="panel p-5 fade-in stagger-5"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-ranking-star text-amber-400 mr-1.5"></i>Priority Queue</h3>' +
    '<p class="text-[10px] text-slate-700 mb-3">Ranked by weighted severity, urgency, population density, and recency</p>' +
    '<div class="overflow-x-auto"><table class="data"><thead><tr><th>#</th><th>Score</th><th>ID</th><th>Type</th><th>Severity</th><th>Status</th><th>Location</th></tr></thead>' +
    '<tbody>' + queueRows + '</tbody></table></div></div></div>';
}

async function loadGuidance() {
  var category = document.getElementById('guidance-select').value;
  var container = document.getElementById('guidance-content');
  if (!category) { container.innerHTML = 'Select a type above.'; return; }

  container.innerHTML = '<div class="flex items-center gap-2"><div class="loader" style="width:16px;height:16px;border-width:2px"></div> Loading...</div>';

  try {
    var data = await request('/api/ai/guidance', { method: 'POST', body: JSON.stringify({ category: category }) });
    container.innerHTML = '<div class="space-y-3">' +
      '<div><h4 class="text-[11px] font-semibold text-green-400 mb-1.5"><i class="fas fa-shield-halved mr-1"></i>Safety Steps</h4>' +
      '<ul class="space-y-0.5">' + data.steps.map(function(s) { return '<li class="flex gap-1.5 text-slate-400 text-xs leading-relaxed"><span class="text-green-400 mt-0.5 shrink-0">\u203a</span>' + s + '</li>'; }).join('') + '</ul></div>' +
      '<div><h4 class="text-[11px] font-semibold text-blue-400 mb-1.5"><i class="fas fa-route mr-1"></i>Evacuation</h4>' +
      '<ul class="space-y-0.5">' + data.evacuation.map(function(s) { return '<li class="flex gap-1.5 text-slate-400 text-xs leading-relaxed"><span class="text-blue-400 mt-0.5 shrink-0">\u203a</span>' + s + '</li>'; }).join('') + '</ul></div>' +
      '<div><h4 class="text-[11px] font-semibold text-amber-400 mb-1.5"><i class="fas fa-hand-point-right mr-1"></i>Actions</h4>' +
      '<ul class="space-y-0.5">' + data.actions.map(function(s) { return '<li class="flex gap-1.5 text-slate-400 text-xs leading-relaxed"><span class="text-amber-400 mt-0.5 shrink-0">\u203a</span>' + s + '</li>'; }).join('') + '</ul></div></div>';
  } catch(e) {
    container.innerHTML = '<p class="text-red-400">Failed to load.</p>';
  }
}

async function sheltersPage() {
  var shelters = [];
  try { shelters = await request('/api/shelters'); } catch(e) {}

  var cities = {};
  shelters.forEach(function(s) { if (s.city) cities[s.city] = true; });
  var cityOptions = Object.keys(cities).sort().map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');

  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">' +
    '<div class="flex flex-wrap items-center justify-between gap-3 mb-5 fade-in"><div><h1 class="text-xl font-bold text-white">Shelter & Hospital Network</h1><p class="text-xs text-slate-600">' + shelters.length + ' facilities across India</p></div>' +
    '<div class="flex gap-2">' +
    '<select id="filter-type" class="field py-1 text-[11px]" style="width:auto" onchange="applyShelterFilter()">' +
    '<option value="all">All Types</option><option value="shelter">Relief Camps</option><option value="hospital">Hospitals</option><option value="rescue_center">Rescue Centres</option></select>' +
    '<select id="filter-city" class="field py-1 text-[11px]" style="width:auto" onchange="applyShelterFilter()">' +
    '<option value="all">All Cities</option>' + cityOptions + '</select></div></div>' +
    '<div id="shelter-grid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">' + shelters.map(function(s, i) { return shelterCard(s, i); }).join('') + '</div></div>';
}

function shelterCard(shelter, idx) {
  var pct = shelter.capacity > 0 ? Math.round(shelter.occupancy / shelter.capacity * 100) : 0;
  var barColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : pct > 50 ? '#eab308' : '#22c55e';
  var statusColors = { open: '#22c55e', full: '#ef4444', closed: '#475569', emergency: '#f59e0b' };
  var typeIcons = { shelter: 'fa-campground', hospital: 'fa-hospital', rescue_center: 'fa-truck-medical' };
  var sc = statusColors[shelter.status] || '#3b82f6';

  var resources = [
    { label: 'H\u2082O', value: shelter.water, max: 1000 },
    { label: 'Food', value: shelter.food, max: 800 },
    { label: 'Med', value: shelter.medicine, max: 900 },
    { label: 'Blkt', value: shelter.blankets, max: 700 },
    { label: 'Equip', value: shelter.rescue_equipment, max: 200 }
  ];

  return '<div class="panel p-4 lift fade-in stagger-' + ((idx % 5) + 1) + '">' +
    '<div class="flex items-center justify-between mb-2.5">' +
    '<div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background:' + sc + '0d"><i class="fas ' + (typeIcons[shelter.type] || 'fa-building') + '" style="color:' + sc + '"></i></div>' +
    '<div><h3 class="font-semibold text-white text-xs leading-tight">' + shelter.name + '</h3><p class="text-[10px] text-slate-600">' + shelter.type.replace('_', ' ').toUpperCase() + (shelter.city ? ' \u00b7 ' + shelter.city : '') + '</p></div></div>' +
    '<span class="badge badge-' + (shelter.status === 'open' ? 'low' : shelter.status === 'emergency' ? 'high' : shelter.status === 'full' ? 'critical' : 'reported') + '">' + shelter.status + '</span></div>' +
    '<div class="mb-2.5"><div class="flex justify-between text-[10px] mb-1"><span class="text-slate-600">Occupancy</span><span class="font-semibold" style="color:' + barColor + '">' + shelter.occupancy + ' / ' + shelter.capacity + ' (' + pct + '%)</span></div>' +
    '<div class="progress"><span style="width:' + pct + '%;background:' + barColor + '"></span></div></div>' +
    '<div class="grid grid-cols-5 gap-0.5 text-center mb-2">' +
    resources.map(function(r) {
      var ratio = r.max > 0 ? (r.value || 0) / r.max : 0;
      var c = ratio < 0.15 ? '#ef4444' : ratio < 0.4 ? '#eab308' : '#22c55e';
      return '<div><div class="text-[11px] font-bold" style="color:' + c + '">' + (r.value || 0) + '</div><div class="text-[8px] text-slate-700">' + r.label + '</div></div>';
    }).join('') + '</div>' +
    (shelter.address ? '<p class="text-[10px] text-slate-700"><i class="fas fa-location-dot mr-0.5"></i>' + shelter.address + '</p>' : '') +
    (shelter.contact_phone ? '<p class="text-[10px] text-slate-700 mt-0.5"><i class="fas fa-phone mr-0.5"></i>' + shelter.contact_phone + '</p>' : '') + '</div>';
}

async function applyShelterFilter() {
  var typeVal = document.getElementById('filter-type').value;
  var cityVal = document.getElementById('filter-city') ? document.getElementById('filter-city').value : 'all';
  var url = '/api/shelters?type=' + typeVal;
  if (cityVal !== 'all') url += '&city=' + encodeURIComponent(cityVal);
  try {
    var shelters = await request(url);
    document.getElementById('shelter-grid').innerHTML = shelters.map(function(s, i) { return shelterCard(s, i); }).join('');
  } catch(e) {}
}

async function resourcesPage() {
  var resources = [], totals = {};
  try {
    var data = await Promise.all([request('/api/resources'), request('/api/stats/resources')]);
    resources = data[0]; totals = data[1];
  } catch(e) {}

  var types = [
    { key: 'water', label: 'Drinking Water', icon: 'fa-droplet', color: '#3b82f6', unit: 'litres', max: 1000, critical: 300 },
    { key: 'food', label: 'Food Packs', icon: 'fa-utensils', color: '#22c55e', unit: 'packs', max: 800, critical: 200 },
    { key: 'medicine', label: 'Medical Supplies', icon: 'fa-pills', color: '#8b5cf6', unit: 'units', max: 900, critical: 250 },
    { key: 'blankets', label: 'Blankets', icon: 'fa-bed', color: '#f59e0b', unit: 'pieces', max: 700, critical: 150 },
    { key: 'rescue_equipment', label: 'Rescue Gear', icon: 'fa-life-ring', color: '#ef4444', unit: 'sets', max: 200, critical: 50 }
  ];

  var summaryCards = types.map(function(t, idx) {
    var val = totals[t.key] || 0;
    var isLow = val < t.critical * 3;
    return '<div class="panel p-3 text-center fade-in stagger-' + (idx + 1) + '">' +
      '<div class="mb-1"><i class="fas ' + t.icon + '" style="color:' + t.color + '"></i></div>' +
      '<div class="text-lg font-bold ' + (isLow ? 'text-red-400' : 'text-white') + '">' + val.toLocaleString() + '</div>' +
      '<div class="text-[9px] text-slate-700">' + t.unit + (isLow ? ' \u2014 LOW STOCK' : '') + '</div></div>';
  }).join('');

  var tableRows = resources.map(function(r) {
    return '<tr><td class="font-semibold text-white text-xs">' + r.shelter_name + '</td>' +
      '<td class="text-[10px] text-slate-600">' + (r.shelter_type || '').replace('_', ' ') + '</td>' +
      '<td class="text-[10px] text-slate-600">' + (r.city || '') + '</td>' +
      types.map(function(t) {
        var val = r[t.key] || 0;
        var ratio = Math.min(val / t.max, 1);
        var c = val < t.critical ? '#ef4444' : ratio < 0.4 ? '#eab308' : '#22c55e';
        return '<td><div class="flex items-center gap-1.5"><div class="resource-bar flex-1" style="min-width:50px"><span style="width:' + (ratio * 100) + '%;background:' + c + '">' + (ratio > 0.12 ? val : '') + '</span></div>' +
          (ratio <= 0.12 ? '<span class="text-[10px]" style="color:' + c + '">' + val + '</span>' : '') + '</div></td>';
      }).join('') + '</tr>';
  }).join('');

  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">' +
    '<div class="mb-5 fade-in"><h1 class="text-xl font-bold text-white">Resource Tracking</h1><p class="text-xs text-slate-600">Supply levels across all networked facilities</p></div>' +
    '<div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">' + summaryCards + '</div>' +
    '<div class="panel p-5 fade-in stagger-3"><h3 class="font-semibold text-white text-sm mb-3"><i class="fas fa-warehouse text-cyan-400 mr-1.5"></i>Per-Facility Breakdown</h3>' +
    '<div class="overflow-x-auto"><table class="data"><thead><tr><th>Facility</th><th>Type</th><th>City</th>' +
    types.map(function(t) { return '<th><i class="fas ' + t.icon + '" style="color:' + t.color + '"></i> ' + t.label + '</th>'; }).join('') +
    '</tr></thead><tbody>' + tableRows + '</tbody></table></div></div></div>';
}

async function volunteersPage() {
  var volunteers = [];
  try { volunteers = await request('/api/volunteers'); } catch(e) {}

  var available = volunteers.filter(function(v) { return v.availability === 'available'; }).length;
  var onMission = volunteers.filter(function(v) { return v.availability === 'on_mission'; }).length;
  var offDuty = volunteers.filter(function(v) { return v.availability === 'unavailable'; }).length;

  var statusSummary = [
    { label: 'Available', value: available, color: '#22c55e' },
    { label: 'On Mission', value: onMission, color: '#f59e0b' },
    { label: 'Off Duty', value: offDuty, color: '#475569' }
  ];

  var volunteerRows = volunteers.map(function(v) {
    var statusColor = { available: '#22c55e', on_mission: '#f59e0b', unavailable: '#475569' };
    var c = statusColor[v.availability] || '#475569';
    var skills = (v.skills || '').split(',').map(function(s) {
      return '<span class="inline-block rounded px-1.5 py-0.5 mr-0.5 mb-0.5" style="background:rgba(255,255,255,.025);font-size:10px">' + s.trim() + '</span>';
    }).join('');

    return '<tr>' +
      '<td><div class="flex items-center gap-2"><div class="w-6 h-6 rounded-full flex items-center justify-center" style="background:' + c + '12"><i class="fas fa-user text-[9px]" style="color:' + c + '"></i></div><span class="font-semibold text-white text-xs">' + v.name + '</span></div></td>' +
      '<td class="text-[11px] text-slate-400">' + skills + '</td>' +
      '<td><span class="badge badge-' + (v.availability === 'available' ? 'low' : v.availability === 'on_mission' ? 'high' : 'reported') + '">' + v.availability.replace('_', ' ') + '</span></td>' +
      '<td class="text-xs">' + (v.assigned_report_id ? '<span class="text-purple-400">' + v.assigned_report_id + '</span>' : '') + '</td>' +
      '<td class="text-[11px] text-slate-600">' + (v.phone || v.email) + '</td></tr>';
  }).join('');

  return '<div class="max-w-7xl mx-auto px-4 sm:px-6 py-5">' +
    '<div class="flex flex-wrap items-center justify-between gap-3 mb-5 fade-in"><div><h1 class="text-xl font-bold text-white">Volunteer Operations</h1><p class="text-xs text-slate-600">' + volunteers.length + ' registered responders</p></div>' +
    '<button class="cta cta-blue cta-sm" onclick="document.getElementById(\'volunteer-form\').classList.toggle(\'hidden\')"><i class="fas fa-user-plus"></i> Register</button></div>' +
    '<div class="grid grid-cols-3 gap-3 mb-5 fade-in stagger-1">' +
    statusSummary.map(function(s) {
      return '<div class="panel p-3 text-center"><div class="text-xl font-bold" style="color:' + s.color + '">' + s.value + '</div><div class="text-[10px] text-slate-600 uppercase tracking-wider">' + s.label + '</div></div>';
    }).join('') + '</div>' +
    '<div id="volunteer-form" class="hidden panel p-5 mb-5 fade-in">' +
    '<h3 class="font-semibold text-white text-sm mb-3">Register New Responder</h3>' +
    '<p class="text-[10px] text-slate-600 mb-3">Once registered, your enrollment is locked and cannot be edited or removed.</p>' +
    '<form onsubmit="registerVolunteer(event)" class="grid sm:grid-cols-2 gap-3">' +
    '<div><label class="label">Full Name *</label><input type="text" id="vol-name" class="field" required placeholder="Full name"></div>' +
    '<div><label class="label">Email *</label><input type="email" id="vol-email" class="field" required placeholder="email@example.com"></div>' +
    '<div><label class="label">Phone</label><input type="tel" id="vol-phone" class="field" placeholder="+91-XXXXX-XXXXX"></div>' +
    '<div><label class="label">Skills</label><input type="text" id="vol-skills" class="field" placeholder="First Aid, Driving, Medical..."></div>' +
    '<div class="sm:col-span-2 flex gap-2">' +
    '<button type="submit" class="cta cta-blue cta-sm"><i class="fas fa-user-plus"></i> Register</button>' +
    '<button type="button" class="cta cta-ghost cta-sm" onclick="document.getElementById(\'volunteer-form\').classList.add(\'hidden\')">Cancel</button></div></form></div>' +
    '<div class="panel p-5 fade-in stagger-2"><div class="overflow-x-auto"><table class="data"><thead><tr><th>Name</th><th>Skills</th><th>Status</th><th>Assignment</th><th>Contact</th></tr></thead>' +
    '<tbody>' + volunteerRows + '</tbody></table></div></div></div>';
}

async function registerVolunteer(e) {
  e.preventDefault();
  try {
    await request('/api/volunteers', {
      method: 'POST',
      body: JSON.stringify({
        name: document.getElementById('vol-name').value,
        email: document.getElementById('vol-email').value,
        phone: document.getElementById('vol-phone').value,
        skills: document.getElementById('vol-skills').value
      })
    });
    notify('Registered successfully', 'success');
    render();
  } catch(ex) {
    notify('Registration failed \u2014 email may already exist', 'error');
  }
}

async function render() {
  var path = location.pathname.replace(/^\//, '') || 'home';
  currentPage = path.split('/')[0] || 'home';

  if (!getSession() && currentPage !== 'login') {
    currentPage = 'login';
    history.replaceState({}, '', '/login');
  }

  if (leafletMap && currentPage !== 'map') {
    leafletMap.remove();
    leafletMap = null;
    heatLayer = null;
    heatVisible = false;
  }

  Object.values(chartInstances).forEach(function(c) { c.destroy(); });
  chartInstances = {};

  if (currentPage === 'login') {
    document.getElementById('app').innerHTML = loginPage();
    return;
  }

  var banner = await warningBanner();
  var content = '';
  try {
    switch (currentPage) {
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
    content = '<div class="max-w-md mx-auto px-4 py-20 text-center"><div class="panel p-7">' +
      '<i class="fas fa-triangle-exclamation text-red-400 text-2xl mb-3"></i>' +
      '<h2 class="text-lg font-bold text-white mb-1">Something went wrong</h2>' +
      '<p class="text-slate-500 text-xs mb-3">' + e.message + '</p>' +
      '<button class="cta cta-blue cta-sm" onclick="navigate(\'home\')">Back to Home</button></div></div>';
  }

  document.getElementById('app').innerHTML = buildNav() + banner + content;

  var zone = document.getElementById('upload-zone');
  if (zone) {
    zone.addEventListener('dragover', function(ev) { ev.preventDefault(); zone.classList.add('dragging'); });
    zone.addEventListener('dragleave', function() { zone.classList.remove('dragging'); });
    zone.addEventListener('drop', function(ev) {
      ev.preventDefault();
      zone.classList.remove('dragging');
      if (ev.dataTransfer.files.length) {
        document.getElementById('file-input').files = ev.dataTransfer.files;
        handleUpload({ target: { files: [ev.dataTransfer.files[0]] } });
      }
    });
  }
}

render();
