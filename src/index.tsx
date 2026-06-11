import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = { DB: D1Database }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

let dbReady = false

async function bootstrap(db: D1Database) {
  if (dbReady) return
  try {
    const exists = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='incidents'").first()
    if (exists) { dbReady = true; return }

    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT, role TEXT NOT NULL DEFAULT 'citizen', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS incidents (id INTEGER PRIMARY KEY AUTOINCREMENT, report_id TEXT UNIQUE NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, image_data TEXT, latitude REAL NOT NULL, longitude REAL NOT NULL, location_name TEXT, severity TEXT NOT NULL DEFAULT 'Moderate', urgency TEXT NOT NULL DEFAULT 'Medium', status TEXT NOT NULL DEFAULT 'reported', ai_confidence REAL DEFAULT 0, ai_explanation TEXT, reporter_name TEXT, reporter_phone TEXT, assigned_team TEXT, population_density INTEGER DEFAULT 0, priority_score REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS shelters (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'shelter', address TEXT, latitude REAL NOT NULL, longitude REAL NOT NULL, capacity INTEGER NOT NULL DEFAULT 100, occupancy INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open', contact_phone TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS resources (id INTEGER PRIMARY KEY AUTOINCREMENT, shelter_id INTEGER NOT NULL, water INTEGER NOT NULL DEFAULT 0, food INTEGER NOT NULL DEFAULT 0, medicine INTEGER NOT NULL DEFAULT 0, blankets INTEGER NOT NULL DEFAULT 0, rescue_equipment INTEGER NOT NULL DEFAULT 0, last_updated DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (shelter_id) REFERENCES shelters(id) ON DELETE CASCADE)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS volunteers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT, skills TEXT, availability TEXT NOT NULL DEFAULT 'available', assigned_incident_id INTEGER, location_lat REAL, location_lng REAL, registered_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (assigned_incident_id) REFERENCES incidents(id) ON DELETE SET NULL)`),
    ])

    await db.batch([
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_inc_status ON incidents(status)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_inc_severity ON incidents(severity)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_inc_priority ON incidents(priority_score DESC)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_sh_status ON shelters(status)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_vol_avail ON volunteers(availability)`),
    ])

    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES ('AIIMS Trauma Centre','hospital','Sri Aurobindo Marg, Ansari Nagar, New Delhi',28.5672,77.2100,450,312,'open','+91-11-26588500')`),
      db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES ('Safdarjung Hospital','hospital','Ansari Nagar West, New Delhi 110029',28.5685,77.2065,600,478,'open','+91-11-26707437')`),
      db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES ('Lok Nayak Jai Prakash Hospital','hospital','Jawaharlal Nehru Marg, Delhi Gate, New Delhi',28.6382,77.2410,520,445,'emergency','+91-11-23232400')`),
      db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES ('GTB Hospital','hospital','Dilshad Garden, Shahdara, Delhi 110095',28.6839,77.3091,400,298,'open','+91-11-22586262')`),
      db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES ('Rajiv Gandhi Super Speciality Hospital','hospital','Tahirpur, Dilshad Garden, Delhi 110093',28.6912,77.3156,350,189,'open','+91-11-22890604')`),
      db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES ('Yamuna Sports Complex Relief Camp','shelter','Surajmal Vihar, Delhi 110092',28.6276,77.2971,2000,1456,'open','+91-11-22145000')`),
      db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES ('Thyagraj Stadium Shelter','shelter','Thyagraj Nagar, INA, New Delhi 110003',28.5830,77.2140,800,623,'open','+91-11-24617891')`),
      db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES ('Talkatora Indoor Stadium','shelter','President Estate, New Delhi 110004',28.6225,77.1992,1200,340,'open','+91-11-23011792')`),
      db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES ('NDRF 2nd Battalion HQ','rescue_center','Sector 29, Aravalli Hills, Faridabad, Haryana',28.4292,77.3103,200,48,'open','+91-129-2234400')`),
      db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES ('Delhi Fire Service HQ','rescue_center','Connaught Place, New Delhi 110001',28.6315,77.2167,150,62,'open','+91-11-23416666')`),
    ])

    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (1,320,280,950,180,65)`),
      db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (2,400,350,870,220,50)`),
      db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (3,180,120,760,90,40)`),
      db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (4,290,260,680,200,55)`),
      db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (5,350,300,720,240,70)`),
      db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (6,1800,1500,400,2200,120)`),
      db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (7,600,520,180,850,45)`),
      db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (8,900,780,220,1400,80)`),
      db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (9,450,380,560,300,340)`),
      db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (10,200,180,120,100,280)`),
    ])

    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,assigned_incident_id,location_lat,location_lng) VALUES ('Dr. Arun Kapoor','arun.kapoor@ndrf.gov.in','+91-98765-43210','Emergency Medicine, Triage, Trauma Surgery','available',NULL,28.6139,77.2090)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,assigned_incident_id,location_lat,location_lng) VALUES ('Priya Sharma','priya.sharma@redcross.in','+91-87654-32109','First Aid, CPR, Disaster Psychology','available',NULL,28.5672,77.2100)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,assigned_incident_id,location_lat,location_lng) VALUES ('Rahul Verma','rahul.verma@civildefence.in','+91-76543-21098','Search & Rescue, Structural Assessment, Rappelling','available',NULL,28.6350,77.2250)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,assigned_incident_id,location_lat,location_lng) VALUES ('Anjali Deshmukh','anjali.d@sphere.ngo','+91-65432-10987','Water Purification, Logistics, Camp Management','available',NULL,28.5830,77.2140)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,assigned_incident_id,location_lat,location_lng) VALUES ('Mohammed Irfan','m.irfan@delhifire.gov.in','+91-99887-76655','Firefighting, Hazmat Response, Rope Rescue','available',NULL,28.6315,77.2167)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,assigned_incident_id,location_lat,location_lng) VALUES ('Sunita Yadav','sunita.y@goonj.org','+91-88776-65544','Supply Distribution, Community Mobilization','available',NULL,28.6276,77.2971)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,assigned_incident_id,location_lat,location_lng) VALUES ('Vikram Singh Rathore','vikram.sr@army.mil.in','+91-77665-54433','Swift Water Rescue, Navigation, Heavy Equipment','available',NULL,28.6839,77.3091)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,assigned_incident_id,location_lat,location_lng) VALUES ('Deepika Nair','deepika.nair@msf.org','+91-66554-43322','Nursing, Epidemiology, Field Hospital Setup','available',NULL,28.6912,77.3156)`),
    ])

    dbReady = true
  } catch (e: any) {
    dbReady = true
  }
}

app.use('/api/*', async (c, next) => {
  await bootstrap(c.env.DB)
  await next()
})

app.get('/api/stats', async (c) => {
  const db = c.env.DB
  try {
    const [total, active, critical, shelterStats, volStats] = await Promise.all([
      db.prepare('SELECT COUNT(*) as c FROM incidents').first(),
      db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status NOT IN ('resolved','closed')").first(),
      db.prepare("SELECT COUNT(*) as c FROM incidents WHERE severity='Critical'").first(),
      db.prepare('SELECT SUM(capacity) as cap, SUM(occupancy) as occ FROM shelters').first(),
      db.prepare("SELECT COUNT(*) as t, SUM(CASE WHEN availability='available' THEN 1 ELSE 0 END) as a FROM volunteers").first(),
    ])
    return c.json({
      totalIncidents: (total as any)?.c || 0,
      activeIncidents: (active as any)?.c || 0,
      criticalIncidents: (critical as any)?.c || 0,
      shelterOccupancy: Math.round(((shelterStats as any)?.occ || 0) / ((shelterStats as any)?.cap || 1) * 100),
      totalVolunteers: (volStats as any)?.t || 0,
      availableVolunteers: (volStats as any)?.a || 0,
    })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/stats/resources', async (c) => {
  try {
    const r = await c.env.DB.prepare('SELECT SUM(water) as water, SUM(food) as food, SUM(medicine) as medicine, SUM(blankets) as blankets, SUM(rescue_equipment) as rescue_equipment FROM resources').first()
    return c.json(r || {})
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/stats/categories', async (c) => {
  try {
    const r = await c.env.DB.prepare('SELECT category, COUNT(*) as count FROM incidents GROUP BY category ORDER BY count DESC').all()
    return c.json(r.results || [])
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/stats/severity', async (c) => {
  try {
    const r = await c.env.DB.prepare('SELECT severity, COUNT(*) as count FROM incidents GROUP BY severity').all()
    return c.json(r.results || [])
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/incidents', async (c) => {
  const db = c.env.DB
  const status = c.req.query('status')
  const severity = c.req.query('severity')
  const category = c.req.query('category')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')
  let q = 'SELECT * FROM incidents WHERE 1=1'
  const p: any[] = []
  if (status && status !== 'all') { q += ' AND status=?'; p.push(status) }
  if (severity && severity !== 'all') { q += ' AND severity=?'; p.push(severity) }
  if (category && category !== 'all') { q += ' AND category=?'; p.push(category) }
  q += ' ORDER BY priority_score DESC, created_at DESC LIMIT ? OFFSET ?'
  p.push(limit, offset)
  try {
    const r = await db.prepare(q).bind(...p).all()
    return c.json(r.results || [])
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/incidents/:id', async (c) => {
  try {
    const r = await c.env.DB.prepare('SELECT * FROM incidents WHERE id=?').bind(c.req.param('id')).first()
    return r ? c.json(r) : c.json({ error: 'Not found' }, 404)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/incidents', async (c) => {
  try {
    const b = await c.req.json()
    const rid = `CIQ-${Date.now().toString(36).toUpperCase()}`
    const sevW: Record<string, number> = { Critical: 40, High: 30, Moderate: 20, Low: 10 }
    const urgW: Record<string, number> = { Immediate: 40, High: 30, Medium: 20, Low: 10 }
    const pd = b.population_density || Math.floor(Math.random() * 8000) + 2000
    const ps = (sevW[b.severity || 'Moderate'] || 20) + (urgW[b.urgency || 'Medium'] || 20) + Math.min(pd / 500, 20)
    const r = await c.env.DB.prepare(
      `INSERT INTO incidents (report_id,category,description,image_data,latitude,longitude,location_name,severity,urgency,status,ai_confidence,ai_explanation,reporter_name,reporter_phone,population_density,priority_score) VALUES (?,?,?,?,?,?,?,?,?,'reported',?,?,?,?,?,?)`
    ).bind(rid, b.category, b.description, b.image_data||null, b.latitude, b.longitude, b.location_name||'', b.severity||'Moderate', b.urgency||'Medium', b.ai_confidence||0, b.ai_explanation||'', b.reporter_name||'Anonymous', b.reporter_phone||'', pd, ps).run()
    return c.json({ id: r.meta.last_row_id, report_id: rid, priority_score: ps }, 201)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.patch('/api/incidents/:id', async (c) => {
  try {
    const b = await c.req.json()
    const u: string[] = []
    const p: any[] = []
    for (const k of ['status','severity','urgency','assigned_team','priority_score']) {
      if (b[k] !== undefined) { u.push(`${k}=?`); p.push(b[k]) }
    }
    if (!u.length) return c.json({ error: 'No fields' }, 400)
    u.push("updated_at=datetime('now')")
    p.push(c.req.param('id'))
    await c.env.DB.prepare(`UPDATE incidents SET ${u.join(',')} WHERE id=?`).bind(...p).run()
    const row = await c.env.DB.prepare('SELECT * FROM incidents WHERE id=?').bind(c.req.param('id')).first()
    return c.json(row)
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/ai/analyze', async (c) => {
  try {
    const b = await c.req.json()
    const desc = (b.description || '').toLowerCase()
    const userCat = b.category || ''

    const signals: Record<string, { words: string[], weight: number }> = {
      Flood: { words: ['flood','water','submerge','drown','waterlog','inundat','overflow','river','rain','yamuna','drain','marooned','waist-deep','knee-deep','chest-deep','deluge','monsoon','embankment','breach','rising water'], weight: 0 },
      Fire: { words: ['fire','burn','blaze','smoke','flame','inferno','chemical','explosion','engulf','charred','gutted','cylinder','short circuit','arson','warehouse fire','factory fire','slum fire'], weight: 0 },
      Earthquake: { words: ['earthquake','tremor','seismic','crack','shake','quake','richter','aftershock','fissure','tectonic','building sway','ground split'], weight: 0 },
      Landslide: { words: ['landslide','mudslide','debris','slope','hillside','mud','erosion','rockfall','soil','cave-in','sinkhole','subsidence'], weight: 0 },
      Cyclone: { words: ['cyclone','hurricane','typhoon','wind','storm','tornado','gust','uprooted','gale','squall','roof blown','sheet metal'], weight: 0 },
      'Building Collapse': { words: ['collapse','building','structure','rubble','demolish','cave','pancake','slab','pillar','beam','under construction','illegal construction','old building'], weight: 0 },
      'Medical Emergency': { words: ['medical','injury','hospital','patient','ambulance','poison','sick','health','cardiac','stroke','choking','bleeding','fracture','unconscious','epidemic','outbreak','heatstroke','snakebite'], weight: 0 },
      'Road Blockage': { words: ['road','block','tree','fallen','traffic','obstruct','power line','pothole','crater','barricade','waterlogged road','flyover','underpass'], weight: 0 },
    }

    for (const [cat, sig] of Object.entries(signals)) {
      sig.weight = sig.words.reduce((acc, w) => acc + (desc.includes(w) ? 1 : 0), 0)
      if (cat === userCat) sig.weight += 3
    }

    const sorted = Object.entries(signals).sort((a, b) => b[1].weight - a[1].weight)
    const detected = sorted[0][1].weight > 0 ? sorted[0][0] : (userCat || 'Other')
    const matchStrength = sorted[0][1].weight

    let confidence = 45 + Math.min(matchStrength * 6.5, 48)
    if (b.image_data) confidence = Math.min(confidence + 4.2, 97.8)
    if (desc.length > 100) confidence = Math.min(confidence + 2.1, 97.8)
    confidence = Math.round(confidence * 10) / 10

    const critWords = ['trapped','stranded','casualt','death','dying','critical','life-threatening','ventilator','collapsed','buried','drowning','unconscious','bleeding heavily','amputation','crush']
    const highWords = ['danger','rising','spread','multiple','toxic','severe','worsening','evacuate','approaching','structural damage','unstable','gas leak']
    const crit = critWords.filter(w => desc.includes(w)).length
    const high = highWords.filter(w => desc.includes(w)).length

    let severity: string, urgency: string
    if (crit >= 2) { severity = 'Critical'; urgency = 'Immediate' }
    else if (crit >= 1 || high >= 3) { severity = 'Critical'; urgency = 'Immediate' }
    else if (high >= 2) { severity = 'High'; urgency = 'High' }
    else if (high >= 1 || matchStrength >= 4) { severity = 'High'; urgency = 'Medium' }
    else if (matchStrength >= 2) { severity = 'Moderate'; urgency = 'Medium' }
    else { severity = 'Low'; urgency = 'Low' }

    const templates: Record<string, Record<string, string>> = {
      Flood: {
        Critical: `Severe flooding detected in the reported area. Analysis indicates significant water accumulation with potential for structural damage and risk to human life. Immediate deployment of water rescue units and evacuation teams is strongly recommended.`,
        High: `Substantial flooding identified. Water levels appear to be rising and may threaten low-lying structures. Preemptive evacuation of vulnerable populations and sandbagging operations are advised.`,
        Moderate: `Flooding activity confirmed in the area. Current conditions suggest manageable water levels, but continued monitoring is essential as the situation could escalate during sustained rainfall.`,
        Low: `Minor waterlogging reported. No immediate threat to life or critical infrastructure detected. Routine drainage response recommended.`,
      },
      Fire: {
        Critical: `Active fire with rapid spread potential detected. The presence of toxic fumes or accelerant materials heightens the danger. Immediate fire suppression, evacuation of adjacent structures, and hazmat standby are required.`,
        High: `Significant fire activity identified. The fire appears to be affecting structural elements and could spread to neighboring properties. Rapid fire response and perimeter control are recommended.`,
        Moderate: `Contained fire incident confirmed. Current fire appears manageable with standard suppression equipment. Continue monitoring for flare-ups and ensure ventilation safety.`,
        Low: `Minor fire or smoke report. No significant structural involvement detected. Standard investigation and monitoring recommended.`,
      },
    }

    const defaultTemplates: Record<string, string> = {
      Critical: `Critical ${detected.toLowerCase()} emergency detected. Multiple indicators suggest an immediate threat to life and property. Full-scale emergency response activation is recommended with priority resource deployment.`,
      High: `Significant ${detected.toLowerCase()} incident identified. Conditions indicate elevated risk requiring prompt intervention. Recommend deploying specialized response teams within the hour.`,
      Moderate: `${detected} incident confirmed at the reported location. Current threat level is manageable but warrants active monitoring and standby response resources.`,
      Low: `Minor ${detected.toLowerCase()} event reported. No immediate threat to life detected. Standard assessment and documentation protocols are sufficient.`,
    }

    const explanation = templates[detected]?.[severity] || defaultTemplates[severity] || defaultTemplates['Moderate']

    return c.json({
      category: detected,
      confidence,
      severity,
      urgency,
      explanation,
      factors_detected: matchStrength,
      critical_indicators: crit,
      risk_indicators: high,
      image_analyzed: !!b.image_data,
      timestamp: new Date().toISOString(),
    })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/ai/summary', async (c) => {
  const db = c.env.DB
  try {
    const [incData, shData, resData, volData] = await Promise.all([
      db.prepare("SELECT * FROM incidents WHERE status NOT IN ('resolved','closed') ORDER BY priority_score DESC LIMIT 20").all(),
      db.prepare('SELECT * FROM shelters').all(),
      db.prepare('SELECT SUM(water) as water, SUM(food) as food, SUM(medicine) as medicine, SUM(blankets) as blankets FROM resources').first(),
      db.prepare("SELECT COUNT(*) as t, SUM(CASE WHEN availability='available' THEN 1 ELSE 0 END) as a FROM volunteers").first(),
    ])

    const inc = incData.results || []
    const sh = shData.results || []
    const res = resData as any || {}
    const vol = volData as any || {}

    const critN = inc.filter((i: any) => i.severity === 'Critical').length
    const highN = inc.filter((i: any) => i.severity === 'High').length
    const tOcc = sh.reduce((s: number, x: any) => s + (x.occupancy || 0), 0)
    const tCap = sh.reduce((s: number, x: any) => s + (x.capacity || 0), 0)
    const occR = tCap > 0 ? Math.round((tOcc / tCap) * 100) : 0

    const cats: Record<string, number> = {}
    inc.forEach((i: any) => { cats[i.category] = (cats[i.category] || 0) + 1 })
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]

    const parts: string[] = []

    if (inc.length === 0) {
      parts.push(`**SITUATION NORMAL** — No active incidents reported across the Delhi NCR monitoring zone. All response teams are on standby. Shelter network and resource reserves are at operational levels.`)
    } else {
      parts.push(`**SITUATION OVERVIEW** — ${inc.length} active incident${inc.length > 1 ? 's' : ''} across Delhi NCR. ${critN} classified as critical, ${highN} as high priority. Response coordination is active across ${sh.filter((s: any) => s.status !== 'closed').length} operational facilities.`)
      if (topCat) {
        parts.push(`**PRIMARY CONCERN** — ${topCat[0]} events represent the leading threat category with ${topCat[1]} active report${topCat[1] > 1 ? 's' : ''}. Situational monitoring is elevated for the affected sectors.`)
      }
    }

    parts.push(`**SHELTER NETWORK** — Overall occupancy at ${occR}% across ${sh.length} registered facilities (${tOcc.toLocaleString()} of ${tCap.toLocaleString()} capacity). ${sh.filter((s: any) => s.status === 'emergency').length} facility/facilities operating under emergency protocols.${occR > 85 ? ' Overflow planning should be initiated immediately.' : ''}`)

    const lowRes: string[] = []
    if ((res.water || 0) < 600) lowRes.push('drinking water')
    if ((res.food || 0) < 500) lowRes.push('food supplies')
    if ((res.medicine || 0) < 300) lowRes.push('medical supplies')
    if ((res.blankets || 0) < 400) lowRes.push('blankets')

    if (lowRes.length > 0) {
      parts.push(`**SUPPLY ALERT** — Stock levels for ${lowRes.join(', ')} are below recommended thresholds. Coordinate with NDRF and district administration for immediate resupply to prevent shortfalls.`)
    } else {
      parts.push(`**SUPPLY STATUS** — All tracked resource categories are above minimum operational thresholds. Standard distribution cycles can continue.`)
    }

    parts.push(`**PERSONNEL** — ${vol.a || 0} of ${vol.t || 0} registered responders available for immediate deployment. ${(vol.t || 0) - (vol.a || 0)} currently assigned to active operations.`)

    const recs: string[] = []
    if (critN > 0) recs.push('Prioritize all available rescue assets toward critical incidents — assign team leads for each critical site')
    if (occR > 80) recs.push('Activate overflow arrangements with Delhi Cantonment and university campus halls')
    if (lowRes.length > 0) recs.push(`Expedite resupply of ${lowRes.join(', ')} through SDRF emergency procurement channels`)
    if ((vol.a || 0) < 3) recs.push('Issue mobilization alert to off-duty NDRF volunteers and Civil Defence personnel')
    if (inc.length > 0) recs.push('Maintain 15-minute situation reporting cadence for all active incidents')
    recs.push('Ensure communication redundancy — verify VHF radio backup for all field teams')
    if (inc.length === 0) recs.push('Conduct routine readiness drills and equipment checks during the low-activity window')

    return c.json({
      summary: parts.join('\n\n'),
      metrics: { activeIncidents: inc.length, criticalIncidents: critN, highPriorityIncidents: highN, shelterOccupancy: occR, availableVolunteers: vol.a || 0, totalVolunteers: vol.t || 0 },
      recommendations: recs,
      topIncidents: inc.slice(0, 5),
      generated_at: new Date().toISOString(),
    })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/ai/guidance', async (c) => {
  try {
    const { category } = await c.req.json()
    const g: Record<string, any> = {
      Flood: {
        steps: ['Move to the highest floor or rooftop immediately — avoid basements and ground floors entirely', 'Do not attempt to walk or drive through moving water — even 15 cm of flowing water can knock an adult down', 'Turn off electricity at the main breaker if water is entering the building and you can reach it safely', 'Store clean drinking water in sealed containers — floodwater contaminates taps within hours', 'Keep identity documents, medications, and phone charger in a waterproof bag at all times', 'If you smell gas or see sparking wires, evacuate the area immediately without using electrical switches'],
        evacuation: ['Follow routes announced by Delhi Police or NDRF — avoid shortcuts through unfamiliar flooded areas', 'If using boats, ensure they are operated by trained personnel — do not overload', 'Prioritize evacuating children, elderly, pregnant women, and those with medical conditions', 'Signal rescuers from rooftops using bright fabric, mirrors, or flashlight at night'],
        actions: ['Call Delhi Disaster Management Authority helpline 1077 or NDRF at 011-24363260', 'Send your GPS coordinates via SMS if voice networks are congested', 'Avoid contact with floodwater — it typically carries sewage, chemicals, and debris', 'After water recedes, do not enter structures until they are cleared by structural engineers'],
      },
      Fire: {
        steps: ['Evacuate immediately — do not waste time collecting belongings', 'Stay low and crawl if smoke is dense — breathable air is closest to the floor', 'Feel doors with the back of your hand before opening — if hot, the fire is on the other side', 'Never use elevators during a fire — use stairwells and keep doors closed behind you', 'If your clothing catches fire: stop, drop to the ground, and roll repeatedly', 'Cover your nose and mouth with a damp cloth to filter out smoke particles'],
        evacuation: ['Use the nearest fire exit and proceed to the designated assembly point', 'If trapped above the fire floor, go to the roof and signal for help — do not jump', 'Close every door behind you as you leave — this slows fire spread significantly', 'Once outside, move at least 100 meters from the structure and do not re-enter'],
        actions: ['Call Delhi Fire Service at 101 or +91-11-23416666 immediately', 'If safe to do so, alert neighbors by banging on doors and shouting "fire"', 'If trapped in a room, seal gaps under the door with wet cloth and signal from the window', 'Do not attempt to fight anything larger than a small wastebasket fire with an extinguisher'],
      },
      Earthquake: {
        steps: ['DROP to your hands and knees immediately — this prevents being knocked over', 'Take COVER under a sturdy desk, table, or bed — protect your head and neck', 'HOLD ON to your shelter and be prepared to move with it until shaking stops', 'If no shelter is available, crouch against an interior wall and protect your head with your arms', 'Stay away from windows, exterior walls, heavy furniture, and anything that could fall', 'If outdoors, move to a clear area away from buildings, trees, power lines, and bridges'],
        evacuation: ['Wait for shaking to stop completely before attempting to exit any structure', 'Use stairs only — check for structural damage on each landing before proceeding', 'Watch for falling debris, broken glass, and exposed wiring as you exit', 'Move to designated open spaces — in Delhi, large parks and maidan areas are safest'],
        actions: ['Check yourself and others for injuries — administer first aid where possible', 'Do not use open flames — there may be gas leaks from ruptured pipelines', 'Expect aftershocks and be prepared to drop, cover, and hold on again', 'Report structural damage to your District Magistrate office or call 112'],
      },
      Landslide: {
        steps: ['If you hear rumbling sounds or see ground cracking, evacuate uphill immediately — perpendicular to the slide direction', 'Do not attempt to cross a landslide path, even if it appears to have stopped — secondary slides are common', 'Watch for muddy water in streams — this often indicates an upstream slide that may send a surge downstream', 'Stay alert during and after heavy rainfall — most landslides in the NCR region occur during monsoon saturation', 'Avoid valleys, drainage channels, and the bases of steep slopes during alerts', 'If indoors, move to the upper floor on the side of the building away from the slope'],
        evacuation: ['Leave immediately if local authorities issue a landslide warning for your area', 'Do not cross bridges over swollen streams or rivers — debris flows can destroy them without warning', 'Evacuate on foot if roads are blocked — do not wait for vehicle access', 'Move to high ground on stable terrain — avoid ridgelines that may themselves be unstable'],
        actions: ['Report road blockages and visible ground movement to the local SDM office or call 112', 'Do not attempt to dig through slide debris without proper equipment and training', 'Keep well away from the edges of slide areas — ground stability is unknown', 'Check on neighbors in vulnerable locations, especially elderly or disabled individuals living alone'],
      },
      Cyclone: {
        steps: ['Secure all loose objects outside — flying debris causes the majority of cyclone injuries', 'Board up or tape windows to prevent shattering', 'Move to the innermost room on the lowest floor — stay away from all windows and exterior doors', 'Fill clean containers and bathtubs with fresh water — supply may be disrupted for days', 'Charge all communication devices fully and keep a battery-powered radio ready', 'Stock at least 72 hours of food, water, and essential medications'],
        evacuation: ['Comply immediately with government evacuation orders — do not attempt to ride out the storm in an evacuation zone', 'Move to the nearest designated cyclone shelter if your home is not built to withstand high winds', 'Secure your home as much as possible before leaving — turn off gas and electricity at the mains', 'Take your emergency kit, identification documents, and essential medications'],
        actions: ['During the storm, stay indoors and away from windows — do not go outside during the eye', 'After the storm passes, avoid downed power lines, standing water, and damaged structures', 'Report damage and injuries to the State Emergency Operations Centre', 'Do not use tap water until authorities confirm it is safe — use stored or packaged water only'],
      },
      'Building Collapse': {
        steps: ['If trapped under rubble, cover your mouth with fabric to avoid inhaling dust', 'Tap on pipes or walls at regular intervals — rescue teams use acoustic sensors to locate survivors', 'Do not shout continuously — it wastes energy and you may inhale dangerous dust particles', 'If you can move, try to reach a void space near a large structural element like a beam or column', 'Conserve your phone battery — send a single SMS with your location rather than making repeated calls', 'If you have access to water, drink small sips regularly to stay hydrated'],
        evacuation: ['If you are outside the collapsed area, move away from the structure immediately — secondary collapses are common', 'Do not re-enter the structure for any reason — even if you hear voices, wait for trained rescuers', 'Clear the area around the collapse site to allow heavy equipment access', 'Watch for dust clouds — they indicate ongoing structural failure and you should move upwind'],
        actions: ['Call NDRF (011-24363260) and local police (100) with the exact location and estimated number of occupants', 'If you witnessed the collapse, stay to provide information to first responders about building layout and occupancy', 'Do not attempt rescue operations without proper training and equipment — you may cause further collapse', 'Photograph the scene from a safe distance — this helps structural engineers assess the situation'],
      },
      'Medical Emergency': {
        steps: ['Ensure the scene is safe for you before approaching any injured person', 'Call 108 (ambulance) or 112 (emergency) immediately — give your exact location and the nature of the emergency', 'Check for responsiveness — tap the shoulder firmly and ask "Can you hear me?"', 'If the person is unresponsive but breathing, place them in the recovery position on their side', 'Apply firm, direct pressure to any external bleeding using the cleanest cloth available', 'Do not move a person with suspected spinal or neck injuries unless they are in immediate danger'],
        evacuation: ['Clear a path for ambulance access — remove vehicles and obstacles from the approach route', 'Identify the nearest hospital and the fastest route — communicate this to the ambulance team', 'If multiple casualties, begin triage — prioritize those with life-threatening but survivable injuries', 'Designate someone to stand at the road entrance and guide the ambulance to the exact location'],
        actions: ['Begin CPR if the person is unresponsive and not breathing — push hard and fast in the center of the chest', 'If an AED is available, follow its voice prompts — they are designed for untrained users', 'Keep the patient warm with a blanket or jacket — shock causes body temperature to drop', 'Note the time of onset of symptoms and any medications the person takes — paramedics will need this information'],
      },
      'Road Blockage': {
        steps: ['Do not attempt to clear heavy debris, fallen trees, or downed power lines yourself', 'Turn on hazard lights and place reflective triangles or flares at least 50 meters behind the obstruction', 'If power lines are down near your vehicle, stay inside — the ground may be electrified', 'Report the exact blockage location with GPS coordinates and a description of what is blocking the road', 'Check your vehicle and surroundings for injured people before focusing on the road itself', 'Photograph the obstruction and any vehicle damage for insurance and emergency records'],
        evacuation: ['If the road is blocked ahead, carefully reverse to the last intersection using hazard lights', 'Follow Delhi Traffic Police diversions — check their Twitter (@dtaboreau) for real-time updates', 'If stranded, stay with your vehicle unless it is in a dangerous location like a floodable underpass', 'If on foot, walk facing oncoming traffic and stay on the shoulder or pavement'],
        actions: ['Call Delhi Traffic Police at 1095 or PWD helpline at 1800-111-77 with the road name and nearest landmark', 'Note whether vehicles are trapped in or under the obstruction', 'Yield immediately to approaching emergency vehicles — pull as far left as possible', 'If the blockage is caused by flooding in an underpass, alert others verbally and with hand signals — do not assume they can see the water depth'],
      },
    }
    return c.json({ category, ...(g[category] || g['Medical Emergency']) })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/incidents/priority/queue', async (c) => {
  try {
    const r = await c.env.DB.prepare("SELECT * FROM incidents WHERE status NOT IN ('resolved','closed') ORDER BY priority_score DESC, created_at ASC LIMIT 20").all()
    return c.json(r.results || [])
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/shelters', async (c) => {
  const t = c.req.query('type')
  let q = 'SELECT s.*, r.water, r.food, r.medicine, r.blankets, r.rescue_equipment FROM shelters s LEFT JOIN resources r ON s.id=r.shelter_id'
  const p: any[] = []
  if (t && t !== 'all') { q += ' WHERE s.type=?'; p.push(t) }
  q += ' ORDER BY s.name'
  try {
    const r = p.length ? await c.env.DB.prepare(q).bind(...p).all() : await c.env.DB.prepare(q).all()
    return c.json(r.results || [])
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.patch('/api/shelters/:id', async (c) => {
  try {
    const b = await c.req.json()
    const u: string[] = [], p: any[] = []
    for (const k of ['occupancy','status','capacity']) { if (b[k] !== undefined) { u.push(`${k}=?`); p.push(b[k]) } }
    if (!u.length) return c.json({ error: 'No fields' }, 400)
    p.push(c.req.param('id'))
    await c.env.DB.prepare(`UPDATE shelters SET ${u.join(',')} WHERE id=?`).bind(...p).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/resources', async (c) => {
  try {
    const r = await c.env.DB.prepare('SELECT r.*, s.name as shelter_name, s.type as shelter_type FROM resources r JOIN shelters s ON r.shelter_id=s.id ORDER BY s.name').all()
    return c.json(r.results || [])
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.patch('/api/resources/:id', async (c) => {
  try {
    const b = await c.req.json()
    const u: string[] = [], p: any[] = []
    for (const k of ['water','food','medicine','blankets','rescue_equipment']) { if (b[k] !== undefined) { u.push(`${k}=?`); p.push(b[k]) } }
    u.push("last_updated=datetime('now')")
    p.push(c.req.param('id'))
    await c.env.DB.prepare(`UPDATE resources SET ${u.join(',')} WHERE id=?`).bind(...p).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/volunteers', async (c) => {
  const a = c.req.query('availability')
  let q = 'SELECT v.*, i.report_id as assigned_report_id, i.category as assigned_category FROM volunteers v LEFT JOIN incidents i ON v.assigned_incident_id=i.id'
  const p: any[] = []
  if (a && a !== 'all') { q += ' WHERE v.availability=?'; p.push(a) }
  q += ' ORDER BY v.registered_at DESC'
  try {
    const r = p.length ? await c.env.DB.prepare(q).bind(...p).all() : await c.env.DB.prepare(q).all()
    return c.json(r.results || [])
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/volunteers', async (c) => {
  try {
    const b = await c.req.json()
    if (!b.name || !b.email) return c.json({ error: 'Name and email required' }, 400)
    const r = await c.env.DB.prepare('INSERT INTO volunteers (name,email,phone,skills,availability) VALUES (?,?,?,?,?)').bind(b.name, b.email, b.phone||'', b.skills||'', 'available').run()
    return c.json({ id: r.meta.last_row_id, name: b.name }, 201)
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return c.json({ error: 'Email already registered' }, 409)
    return c.json({ error: e.message }, 500)
  }
})

app.patch('/api/volunteers/:id', async (c) => {
  try {
    const b = await c.req.json()
    const u: string[] = [], p: any[] = []
    for (const k of ['availability','assigned_incident_id','skills']) { if (b[k] !== undefined) { u.push(`${k}=?`); p.push(b[k]) } }
    if (!u.length) return c.json({ error: 'No fields' }, 400)
    p.push(c.req.param('id'))
    await c.env.DB.prepare(`UPDATE volunteers SET ${u.join(',')} WHERE id=?`).bind(...p).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>CrisisIQ</title>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/leaflet.heat@0.2.0/dist/leaflet-heat.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script>tailwind.config={darkMode:'class',theme:{extend:{fontFamily:{sans:['Inter','system-ui','sans-serif']}}}}<\/script>
<link rel="stylesheet" href="/static/style.css">
</head><body class="bg-[#06080f] text-slate-200 min-h-screen font-sans"><div id="app"></div>
<script src="/static/app.js"><\/script></body></html>`

app.get('/', (c) => c.html(html))
app.get('/report', (c) => c.html(html))
app.get('/map', (c) => c.html(html))
app.get('/dashboard', (c) => c.html(html))
app.get('/shelters', (c) => c.html(html))
app.get('/resources', (c) => c.html(html))
app.get('/volunteers', (c) => c.html(html))
app.get('/command-center', (c) => c.html(html))

export default app
