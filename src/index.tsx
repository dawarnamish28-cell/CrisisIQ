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
      db.prepare(`CREATE TABLE IF NOT EXISTS incidents (id INTEGER PRIMARY KEY AUTOINCREMENT, report_id TEXT UNIQUE NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, image_data TEXT, latitude REAL NOT NULL, longitude REAL NOT NULL, location_name TEXT, severity TEXT NOT NULL DEFAULT 'Moderate', urgency TEXT NOT NULL DEFAULT 'Medium', status TEXT NOT NULL DEFAULT 'reported', ai_confidence REAL DEFAULT 0, ai_explanation TEXT, reporter_name TEXT, reporter_email TEXT, reporter_phone TEXT, assigned_team TEXT, population_density INTEGER DEFAULT 0, priority_score REAL DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS shelters (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'shelter', address TEXT, city TEXT DEFAULT 'Delhi', state TEXT DEFAULT 'Delhi', latitude REAL NOT NULL, longitude REAL NOT NULL, capacity INTEGER NOT NULL DEFAULT 100, occupancy INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open', contact_phone TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS resources (id INTEGER PRIMARY KEY AUTOINCREMENT, shelter_id INTEGER NOT NULL, water INTEGER NOT NULL DEFAULT 0, food INTEGER NOT NULL DEFAULT 0, medicine INTEGER NOT NULL DEFAULT 0, blankets INTEGER NOT NULL DEFAULT 0, rescue_equipment INTEGER NOT NULL DEFAULT 0, last_updated DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (shelter_id) REFERENCES shelters(id) ON DELETE CASCADE)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS volunteers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, phone TEXT, skills TEXT, availability TEXT NOT NULL DEFAULT 'available', assigned_incident_id INTEGER, location_lat REAL, location_lng REAL, registered_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (assigned_incident_id) REFERENCES incidents(id) ON DELETE SET NULL)`),
      db.prepare(`CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`),
    ])

    await db.batch([
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_inc_status ON incidents(status)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_inc_severity ON incidents(severity)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_inc_priority ON incidents(priority_score DESC)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_sh_status ON shelters(status)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_sh_city ON shelters(city)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_vol_avail ON volunteers(availability)`),
    ])

    const facilities = [
      ['AIIMS Trauma Centre','hospital','Sri Aurobindo Marg, Ansari Nagar','Delhi','Delhi',28.5672,77.2100,450,312,'open','+91-11-26588500'],
      ['Safdarjung Hospital','hospital','Ansari Nagar West','Delhi','Delhi',28.5685,77.2065,600,478,'open','+91-11-26707437'],
      ['Lok Nayak Jai Prakash Hospital','hospital','Jawaharlal Nehru Marg, Delhi Gate','Delhi','Delhi',28.6382,77.2410,520,445,'emergency','+91-11-23232400'],
      ['GTB Hospital','hospital','Dilshad Garden, Shahdara','Delhi','Delhi',28.6839,77.3091,400,298,'open','+91-11-22586262'],
      ['Rajiv Gandhi Super Speciality Hospital','hospital','Tahirpur, Dilshad Garden','Delhi','Delhi',28.6912,77.3156,350,189,'open','+91-11-22890604'],
      ['Yamuna Sports Complex Relief Camp','shelter','Surajmal Vihar','Delhi','Delhi',28.6276,77.2971,2000,1456,'open','+91-11-22145000'],
      ['Thyagraj Stadium Shelter','shelter','Thyagraj Nagar, INA','Delhi','Delhi',28.5830,77.2140,800,623,'open','+91-11-24617891'],
      ['Talkatora Indoor Stadium','shelter','President Estate','Delhi','Delhi',28.6225,77.1992,1200,340,'open','+91-11-23011792'],
      ['NDRF 2nd Battalion HQ','rescue_center','Sector 29, Aravalli Hills, Faridabad','Faridabad','Haryana',28.4292,77.3103,200,48,'open','+91-129-2234400'],
      ['Delhi Fire Service HQ','rescue_center','Connaught Place','Delhi','Delhi',28.6315,77.2167,150,62,'open','+91-11-23416666'],
      ['KEM Hospital','hospital','Acharya Donde Marg, Parel','Mumbai','Maharashtra',19.0035,72.8422,1800,1420,'open','+91-22-24136051'],
      ['Lilavati Hospital','hospital','Bandra Reclamation','Mumbai','Maharashtra',19.0509,72.8290,350,220,'open','+91-22-26751000'],
      ['JJ Hospital','hospital','Byculla East','Mumbai','Maharashtra',18.9670,72.8364,1350,1050,'open','+91-22-23735555'],
      ['Nair Hospital','hospital','Dr. A.L. Nair Road, Mumbai Central','Mumbai','Maharashtra',18.9730,72.8200,900,680,'open','+91-22-23027062'],
      ['SSKM Hospital','hospital','244 AJC Bose Road','Kolkata','West Bengal',22.5363,88.3441,1600,1280,'open','+91-33-22041101'],
      ['NRS Medical College & Hospital','hospital','138 AJC Bose Road','Kolkata','West Bengal',22.5430,88.3499,900,760,'open','+91-33-22861401'],
      ['Calcutta Medical College','hospital','88 College Street','Kolkata','West Bengal',22.5711,88.3638,1200,950,'open','+91-33-22413636'],
      ['Government General Hospital','hospital','Park Town','Chennai','Tamil Nadu',13.0780,80.2752,2500,1900,'open','+91-44-25305000'],
      ['Rajiv Gandhi Government General Hospital','hospital','EVR Periyar Salai','Chennai','Tamil Nadu',13.0780,80.2682,1800,1420,'open','+91-44-25305000'],
      ['Stanley Medical College Hospital','hospital','Old Jail Road, Royapuram','Chennai','Tamil Nadu',13.1141,80.2909,1100,820,'open','+91-44-25281665'],
      ['Victoria Hospital','hospital','Fort, KR Market Area','Bengaluru','Karnataka',12.9610,77.5770,1500,1100,'open','+91-80-26701150'],
      ['Bowring Hospital','hospital','Shivaji Nagar','Bengaluru','Karnataka',12.9815,77.6007,600,430,'open','+91-80-25591325'],
      ['Osmania General Hospital','hospital','Afzalgunj','Hyderabad','Telangana',17.3700,78.4731,1800,1350,'open','+91-40-24600146'],
      ['Gandhi Hospital','hospital','Musheerabad','Hyderabad','Telangana',17.4000,78.4800,1500,1120,'open','+91-40-27505566'],
      ['SMS Hospital','hospital','JLN Marg, Jaipur','Jaipur','Rajasthan',26.9196,75.8091,2000,1530,'open','+91-141-2560291'],
      ['Civil Hospital','hospital','Asarwa','Ahmedabad','Gujarat',23.0465,72.6006,2500,1820,'open','+91-79-22683721'],
      ['IGMC Shimla','hospital','The Ridge, Shimla','Shimla','Himachal Pradesh',31.1070,77.1730,500,380,'open','+91-177-2804251'],
      ['PGIMER','hospital','Sector 12','Chandigarh','Chandigarh',30.7628,76.7746,2000,1600,'open','+91-172-2747585'],
      ['King George Medical University','hospital','Shahmina Road','Lucknow','Uttar Pradesh',26.8574,80.9325,3000,2400,'open','+91-522-2258140'],
      ['NDRF 1st Battalion HQ','rescue_center','Guwahati, Assam','Guwahati','Assam',26.1864,91.7413,300,75,'open','+91-361-2340399'],
      ['NDRF 3rd Battalion HQ','rescue_center','Mundali, Cuttack','Cuttack','Odisha',20.5284,85.8790,250,60,'open','+91-671-2365100'],
      ['NDRF 5th Battalion HQ','rescue_center','Sudumbare, Pune','Pune','Maharashtra',18.6975,73.6520,300,82,'open','+91-20-22852021'],
      ['NDRF 8th Battalion HQ','rescue_center','Kamrup, Guwahati','Guwahati','Assam',26.1584,91.7699,200,55,'open','+91-361-2850234'],
      ['NDRF 10th Battalion HQ','rescue_center','Vijayawada','Vijayawada','Andhra Pradesh',16.5062,80.6480,250,70,'open','+91-866-2412100'],
      ['NDRF 12th Battalion HQ','rescue_center','Itanagar','Itanagar','Arunachal Pradesh',27.0844,93.6053,150,35,'open','+91-360-2244567'],
      ['Nehru Indoor Stadium Shelter','shelter','Periamet, Chennai','Chennai','Tamil Nadu',13.0726,80.2802,3000,1200,'open','+91-44-25390678'],
      ['Salt Lake Stadium Shelter','shelter','Salt Lake, Bidhannagar','Kolkata','West Bengal',22.5726,88.4092,4000,800,'open','+91-33-23587712'],
      ['Kanteerava Indoor Stadium','shelter','Kasturba Road','Bengaluru','Karnataka',12.9758,77.5952,2000,450,'open','+91-80-22110875'],
      ['Sardar Patel Stadium Shelter','shelter','Navrangpura','Ahmedabad','Gujarat',23.0396,72.5618,3500,600,'open','+91-79-26400221'],
      ['Gachibowli Indoor Stadium','shelter','Gachibowli','Hyderabad','Telangana',17.4268,78.3497,2000,380,'open','+91-40-23001122'],
      ['Jawaharlal Nehru Stadium','shelter','Lodhi Road','Delhi','Delhi',28.5812,77.2378,5000,1800,'open','+91-11-24364837'],
      ['Indira Gandhi Indoor Stadium','shelter','Ring Road, ITO','Delhi','Delhi',28.6339,77.2412,3500,950,'open','+91-11-23379750'],
    ]

    const batchSize = 8
    for (let i = 0; i < facilities.length; i += batchSize) {
      const chunk = facilities.slice(i, i + batchSize)
      await db.batch(chunk.map(f =>
        db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,city,state,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(f[0], f[1], f[2], f[3], f[4], f[5], f[6], f[7], f[8], f[9], f[10])
      ))
    }

    const shelterCount = await db.prepare('SELECT COUNT(*) as c FROM shelters').first() as any
    const total = shelterCount?.c || 0
    const resourceBatches: any[] = []
    for (let sid = 1; sid <= total; sid++) {
      const isHosp = sid <= 29
      resourceBatches.push(
        db.prepare(`INSERT OR IGNORE INTO resources (shelter_id,water,food,medicine,blankets,rescue_equipment) VALUES (?,?,?,?,?,?)`)
          .bind(sid,
            isHosp ? 200 + Math.floor(Math.random() * 500) : 500 + Math.floor(Math.random() * 1800),
            isHosp ? 150 + Math.floor(Math.random() * 400) : 400 + Math.floor(Math.random() * 1400),
            isHosp ? 400 + Math.floor(Math.random() * 700) : 100 + Math.floor(Math.random() * 300),
            isHosp ? 80 + Math.floor(Math.random() * 250) : 500 + Math.floor(Math.random() * 2500),
            isHosp ? 20 + Math.floor(Math.random() * 60) : 80 + Math.floor(Math.random() * 300),
          )
      )
    }
    for (let i = 0; i < resourceBatches.length; i += 8) {
      await db.batch(resourceBatches.slice(i, i + 8))
    }

    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Dr. Arun Kapoor','arun.kapoor@ndrf.gov.in','+91-98765-43210','Emergency Medicine, Triage, Trauma Surgery','available',28.6139,77.2090)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Priya Sharma','priya.sharma@redcross.in','+91-87654-32109','First Aid, CPR, Disaster Psychology','available',28.5672,77.2100)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Rahul Verma','rahul.verma@civildefence.in','+91-76543-21098','Search & Rescue, Structural Assessment, Rappelling','available',28.6350,77.2250)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Anjali Deshmukh','anjali.d@sphere.ngo','+91-65432-10987','Water Purification, Logistics, Camp Management','available',28.5830,77.2140)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Mohammed Irfan','m.irfan@delhifire.gov.in','+91-99887-76655','Firefighting, Hazmat Response, Rope Rescue','available',28.6315,77.2167)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Sunita Yadav','sunita.y@goonj.org','+91-88776-65544','Supply Distribution, Community Mobilization','available',28.6276,77.2971)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Vikram Singh Rathore','vikram.sr@army.mil.in','+91-77665-54433','Swift Water Rescue, Navigation, Heavy Equipment','available',28.6839,77.3091)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Deepika Nair','deepika.nair@msf.org','+91-66554-43322','Nursing, Epidemiology, Field Hospital Setup','available',28.6912,77.3156)`),
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

app.post('/api/session', async (c) => {
  try {
    const { name, email } = await c.req.json()
    if (!name || !email) return c.json({ error: 'Name and email required' }, 400)
    await c.env.DB.prepare('INSERT OR REPLACE INTO sessions (email,name) VALUES (?,?)').bind(email, name).run()
    return c.json({ name, email, ok: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.get('/api/alerts', async (c) => {
  try {
    const r = await c.env.DB.prepare("SELECT id,report_id,category,severity,location_name,description,created_at FROM incidents WHERE severity IN ('Critical','High') AND status NOT IN ('resolved','closed') ORDER BY priority_score DESC LIMIT 5").all()
    return c.json(r.results || [])
  } catch (e: any) { return c.json({ error: e.message }, 500) }
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
      `INSERT INTO incidents (report_id,category,description,image_data,latitude,longitude,location_name,severity,urgency,status,ai_confidence,ai_explanation,reporter_name,reporter_email,reporter_phone,population_density,priority_score) VALUES (?,?,?,?,?,?,?,?,?,'reported',?,?,?,?,?,?,?)`
    ).bind(rid, b.category, b.description, b.image_data||null, b.latitude, b.longitude, b.location_name||'', b.severity||'Moderate', b.urgency||'Medium', b.ai_confidence||0, b.ai_explanation||'', b.reporter_name||'Anonymous', b.reporter_email||'', b.reporter_phone||'', pd, ps).run()
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
    const hasImage = !!b.image_data
    const imageInfo = b.image_info || {}

    const signals: Record<string, { words: string[][], weight: number }> = {
      Flood: { words: [
        ['flood'],['water','level'],['submerge'],['drown'],['waterlog'],['inundat'],['overflow'],['river','swell'],['rain','heavy'],['yamuna'],['drain','block'],['maroon'],['waist','deep'],['knee','deep'],['chest','deep'],['deluge'],['monsoon'],['embankment','breach'],['rising','water'],['waterlogged'],['flash','flood'],['dam','overflow'],['canal','breach'],['stagnant','water'],['sewage','overflow']
      ], weight: 0 },
      Fire: { words: [
        ['fire'],['burn'],['blaze'],['smoke','thick'],['flame'],['inferno'],['chemical','fire'],['explosion'],['engulf'],['charred'],['gutted'],['cylinder','blast'],['short','circuit'],['arson'],['warehouse','fire'],['factory','fire'],['slum','fire'],['electric','fire'],['forest','fire'],['wildfire'],['gas','leak','fire'],['lpg'],['kerosene']
      ], weight: 0 },
      Earthquake: { words: [
        ['earthquake'],['tremor'],['seismic'],['crack','wall'],['shake','building'],['quake'],['richter'],['aftershock'],['fissure'],['tectonic'],['building','sway'],['ground','split'],['seismograph'],['fault','line']
      ], weight: 0 },
      Landslide: { words: [
        ['landslide'],['mudslide'],['debris','flow'],['slope','fail'],['hillside','collapse'],['mud','flow'],['erosion'],['rockfall'],['soil','slip'],['cave','in'],['sinkhole'],['subsidence'],['landslip'],['mountain','collapse']
      ], weight: 0 },
      Cyclone: { words: [
        ['cyclone'],['hurricane'],['typhoon'],['wind','speed'],['storm','surge'],['tornado'],['gust'],['uprooted','tree'],['gale'],['squall'],['roof','blown'],['sheet','metal','fly'],['storm','warning'],['low','pressure']
      ], weight: 0 },
      'Building Collapse': { words: [
        ['collapse','building'],['structure','fail'],['rubble'],['demolish'],['cave','in'],['pancake','collapse'],['slab','fall'],['pillar','crack'],['beam','break'],['under','construction','fall'],['illegal','construction'],['old','building','crack'],['wall','collapse'],['ceiling','fall'],['foundation','sink']
      ], weight: 0 },
      'Medical Emergency': { words: [
        ['medical','emergency'],['injury','severe'],['hospital','urgent'],['patient','critical'],['ambulance'],['poison'],['heatstroke'],['cardiac','arrest'],['stroke'],['choking'],['bleeding','heavy'],['fracture'],['unconscious'],['epidemic'],['outbreak'],['snakebite'],['burn','victim'],['accident','victim'],['mass','casualty'],['covid'],['dengue'],['malaria','severe']
      ], weight: 0 },
      'Road Blockage': { words: [
        ['road','block'],['tree','fallen'],['traffic','jam','severe'],['power','line','down'],['pothole','danger'],['crater','road'],['barricade'],['waterlogged','road'],['flyover','damage'],['underpass','flood'],['bridge','damage'],['highway','block'],['landslide','road']
      ], weight: 0 },
    }

    for (const [cat, sig] of Object.entries(signals)) {
      let matchCount = 0
      for (const phrase of sig.words) {
        if (phrase.length === 1) {
          if (desc.includes(phrase[0])) matchCount += 1.5
        } else {
          const allPresent = phrase.every(w => desc.includes(w))
          if (allPresent) matchCount += 2.5
          else if (phrase.some(w => desc.includes(w))) matchCount += 0.6
        }
      }
      if (cat.toLowerCase() === userCat.toLowerCase()) matchCount += 4
      sig.weight = matchCount
    }

    if (hasImage && imageInfo.filename) {
      const fname = (imageInfo.filename || '').toLowerCase()
      const fsize = imageInfo.size || 0
      const ftype = (imageInfo.type || '').toLowerCase()

      for (const [cat, sig] of Object.entries(signals)) {
        const catLower = cat.toLowerCase().replace(/\s+/g, '')
        if (fname.includes('flood') || fname.includes('water')) { if (cat === 'Flood') sig.weight += 3 }
        if (fname.includes('fire') || fname.includes('smoke') || fname.includes('burn')) { if (cat === 'Fire') sig.weight += 3 }
        if (fname.includes('collapse') || fname.includes('rubble')) { if (cat === 'Building Collapse') sig.weight += 3 }
        if (fname.includes('quake') || fname.includes('crack')) { if (cat === 'Earthquake') sig.weight += 3 }
        if (fname.includes('injury') || fname.includes('blood') || fname.includes('accident')) { if (cat === 'Medical Emergency') sig.weight += 3 }
        if (fname.includes('road') || fname.includes('block') || fname.includes('fallen')) { if (cat === 'Road Blockage') sig.weight += 3 }
      }

      if (fsize > 2 * 1024 * 1024) {
        for (const sig of Object.values(signals)) { sig.weight += 0.3 }
      }
    }

    const sorted = Object.entries(signals).sort((a, b) => b[1].weight - a[1].weight)
    const detected = sorted[0][1].weight > 0 ? sorted[0][0] : (userCat || 'Other')
    const matchStrength = sorted[0][1].weight
    const secondaryMatch = sorted.length > 1 && sorted[1][1].weight > 2 ? sorted[1][0] : null

    let confidence = 42 + Math.min(matchStrength * 4.8, 46)
    if (hasImage) confidence += 5.5
    if (desc.length > 150) confidence += 3.2
    else if (desc.length > 80) confidence += 1.8
    if (secondaryMatch) confidence -= 2.1
    if (userCat && detected === userCat) confidence += 4.5
    confidence = Math.min(Math.max(confidence, 28), 97.5)
    confidence = Math.round(confidence * 10) / 10

    const critWords = ['trapped','stranded','casualt','death','dying','critical','life-threatening','ventilator','collapsed','buried','drowning','unconscious','bleeding heavily','amputation','crush','killed','bodies','fatalities']
    const highWords = ['danger','rising','spread','multiple','toxic','severe','worsening','evacuate','approaching','structural damage','unstable','gas leak','hazardous','contaminated','rapidly','escalating']
    const crit = critWords.filter(w => desc.includes(w)).length
    const high = highWords.filter(w => desc.includes(w)).length

    let severity: string, urgency: string
    if (crit >= 2) { severity = 'Critical'; urgency = 'Immediate' }
    else if (crit >= 1 || high >= 3) { severity = 'Critical'; urgency = 'Immediate' }
    else if (high >= 2) { severity = 'High'; urgency = 'High' }
    else if (high >= 1 || matchStrength >= 5) { severity = 'High'; urgency = 'Medium' }
    else if (matchStrength >= 2) { severity = 'Moderate'; urgency = 'Medium' }
    else { severity = 'Low'; urgency = 'Low' }

    if (hasImage && severity === 'Low') { severity = 'Moderate'; urgency = 'Medium' }

    const templates: Record<string, Record<string, string>> = {
      Flood: {
        Critical: `Severe flooding detected in the reported area. Analysis indicates significant water accumulation with potential for structural damage and risk to human life. Immediate deployment of water rescue units and evacuation teams is strongly recommended. ${hasImage ? 'Visual evidence corroborates the severity — high-resolution imagery indicates extensive inundation consistent with a Critical classification.' : ''}`,
        High: `Substantial flooding identified. Water levels appear to be rising and may threaten low-lying structures. Preemptive evacuation of vulnerable populations and sandbagging operations are advised.${hasImage ? ' Photographic evidence supports elevated threat assessment.' : ''}`,
        Moderate: `Flooding activity confirmed in the area. Current conditions suggest manageable water levels, but continued monitoring is essential as the situation could escalate during sustained rainfall.`,
        Low: `Minor waterlogging reported. No immediate threat to life or critical infrastructure detected. Routine drainage response recommended.`,
      },
      Fire: {
        Critical: `Active fire with rapid spread potential detected. The presence of toxic fumes or accelerant materials heightens the danger. Immediate fire suppression, evacuation of adjacent structures, and hazmat standby are required.${hasImage ? ' Image analysis indicates visible flames or dense smoke consistent with an active large-scale fire event.' : ''}`,
        High: `Significant fire activity identified. The fire appears to be affecting structural elements and could spread to neighboring properties. Rapid fire response and perimeter control are recommended.`,
        Moderate: `Contained fire incident confirmed. Current fire appears manageable with standard suppression equipment. Continue monitoring for flare-ups and ensure ventilation safety.`,
        Low: `Minor fire or smoke report. No significant structural involvement detected. Standard investigation and monitoring recommended.`,
      },
    }

    const defaultTemplates: Record<string, string> = {
      Critical: `Critical ${detected.toLowerCase()} emergency detected. Multiple indicators suggest an immediate threat to life and property. Full-scale emergency response activation is recommended with priority resource deployment.${hasImage ? ' Visual evidence has been factored into this assessment and supports the critical severity determination.' : ''}`,
      High: `Significant ${detected.toLowerCase()} incident identified. Conditions indicate elevated risk requiring prompt intervention. Recommend deploying specialized response teams within the hour.${hasImage ? ' Uploaded imagery was analyzed and contributed to the threat level assessment.' : ''}`,
      Moderate: `${detected} incident confirmed at the reported location. Current threat level is manageable but warrants active monitoring and standby response resources.`,
      Low: `Minor ${detected.toLowerCase()} event reported. No immediate threat to life detected. Standard assessment and documentation protocols are sufficient.`,
    }

    const explanation = templates[detected]?.[severity] || defaultTemplates[severity] || defaultTemplates['Moderate']

    const nearby: string[] = []
    if (detected === 'Flood') nearby.push('Activate storm water pumping stations in the sector', 'Alert downstream communities along drainage channels')
    if (detected === 'Fire') nearby.push('Check adjacent structures for fire spread risk', 'Deploy hazmat screening if industrial area')
    if (detected === 'Earthquake') nearby.push('Inspect all nearby bridges and flyovers for structural integrity', 'Activate building safety assessment teams')
    if (detected === 'Building Collapse') nearby.push('Cordon off 100m radius for secondary collapse risk', 'Deploy acoustic life-detection equipment')
    if (severity === 'Critical') nearby.push('Mobilize all available NDRF units in the district', 'Establish forward command post within 500m of incident')

    return c.json({
      category: detected,
      secondary_category: secondaryMatch,
      confidence,
      severity,
      urgency,
      explanation,
      factors_detected: Math.round(matchStrength),
      critical_indicators: crit,
      risk_indicators: high,
      image_analyzed: hasImage,
      image_contributed: hasImage,
      recommended_actions: nearby,
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

    const cities: Record<string, number> = {}
    sh.forEach((s: any) => { if (s.city) cities[s.city] = (cities[s.city] || 0) + 1 })

    const parts: string[] = []

    if (inc.length === 0) {
      parts.push(`**SITUATION NORMAL** — No active incidents reported across the national monitoring network. All response teams are on standby. ${sh.length} facilities across ${Object.keys(cities).length} cities remain operational.`)
    } else {
      parts.push(`**SITUATION OVERVIEW** — ${inc.length} active incident${inc.length > 1 ? 's' : ''} across the monitoring network. ${critN} classified as critical, ${highN} as high priority. Response coordination is active across ${sh.filter((s: any) => s.status !== 'closed').length} operational facilities in ${Object.keys(cities).length} cities.`)
      if (topCat) {
        parts.push(`**PRIMARY CONCERN** — ${topCat[0]} events represent the leading threat category with ${topCat[1]} active report${topCat[1] > 1 ? 's' : ''}. Situational monitoring is elevated for the affected sectors.`)
      }
    }

    parts.push(`**FACILITY NETWORK** — Overall occupancy at ${occR}% across ${sh.length} registered facilities (${tOcc.toLocaleString()} of ${tCap.toLocaleString()} capacity). ${sh.filter((s: any) => s.status === 'emergency').length} operating under emergency protocols.${occR > 85 ? ' Overflow planning should be initiated immediately.' : ''}`)

    const lowRes: string[] = []
    if ((res.water || 0) < 3000) lowRes.push('drinking water')
    if ((res.food || 0) < 2500) lowRes.push('food supplies')
    if ((res.medicine || 0) < 2000) lowRes.push('medical supplies')
    if ((res.blankets || 0) < 2000) lowRes.push('blankets')

    if (lowRes.length > 0) {
      parts.push(`**SUPPLY ALERT** — Stock levels for ${lowRes.join(', ')} are below recommended thresholds. Coordinate with NDRF and state administrations for immediate resupply.`)
    } else {
      parts.push(`**SUPPLY STATUS** — All tracked resource categories are above minimum operational thresholds. Standard distribution cycles can continue.`)
    }

    parts.push(`**PERSONNEL** — ${vol.a || 0} of ${vol.t || 0} registered responders available for immediate deployment. ${(vol.t || 0) - (vol.a || 0)} currently assigned to active operations.`)

    const recs: string[] = []
    if (critN > 0) recs.push('Prioritize all available rescue assets toward critical incidents — assign team leads for each critical site')
    if (occR > 80) recs.push('Activate overflow arrangements with nearby educational and military facilities')
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
        evacuation: ['Follow routes announced by police or NDRF — avoid shortcuts through unfamiliar flooded areas', 'If using boats, ensure they are operated by trained personnel — do not overload', 'Prioritize evacuating children, elderly, pregnant women, and those with medical conditions', 'Signal rescuers from rooftops using bright fabric, mirrors, or flashlight at night'],
        actions: ['Call Disaster Management helpline 1077 or NDRF at 011-24363260', 'Send your GPS coordinates via SMS if voice networks are congested', 'Avoid contact with floodwater — it typically carries sewage, chemicals, and debris', 'After water recedes, do not enter structures until they are cleared by structural engineers'],
      },
      Fire: {
        steps: ['Evacuate immediately — do not waste time collecting belongings', 'Stay low and crawl if smoke is dense — breathable air is closest to the floor', 'Feel doors with the back of your hand before opening — if hot, the fire is on the other side', 'Never use elevators during a fire — use stairwells and keep doors closed behind you', 'If your clothing catches fire: stop, drop to the ground, and roll repeatedly', 'Cover your nose and mouth with a damp cloth to filter out smoke particles'],
        evacuation: ['Use the nearest fire exit and proceed to the designated assembly point', 'If trapped above the fire floor, go to the roof and signal for help — do not jump', 'Close every door behind you as you leave — this slows fire spread significantly', 'Once outside, move at least 100 meters from the structure and do not re-enter'],
        actions: ['Call Fire Service at 101 immediately', 'If safe to do so, alert neighbors by banging on doors and shouting', 'If trapped in a room, seal gaps under the door with wet cloth and signal from the window', 'Do not attempt to fight anything larger than a small wastebasket fire with an extinguisher'],
      },
      Earthquake: {
        steps: ['DROP to your hands and knees immediately', 'Take COVER under a sturdy desk, table, or bed — protect your head and neck', 'HOLD ON to your shelter and be prepared to move with it until shaking stops', 'If no shelter is available, crouch against an interior wall and protect your head with your arms', 'Stay away from windows, exterior walls, heavy furniture, and anything that could fall', 'If outdoors, move to a clear area away from buildings, trees, power lines, and bridges'],
        evacuation: ['Wait for shaking to stop completely before attempting to exit any structure', 'Use stairs only — check for structural damage on each landing before proceeding', 'Watch for falling debris, broken glass, and exposed wiring as you exit', 'Move to designated open spaces — large parks and open grounds are safest'],
        actions: ['Check yourself and others for injuries — administer first aid where possible', 'Do not use open flames — there may be gas leaks from ruptured pipelines', 'Expect aftershocks and be prepared to drop, cover, and hold on again', 'Report structural damage to your District Magistrate office or call 112'],
      },
      Landslide: {
        steps: ['If you hear rumbling sounds or see ground cracking, evacuate uphill immediately — perpendicular to the slide direction', 'Do not attempt to cross a landslide path, even if it appears to have stopped', 'Watch for muddy water in streams — this often indicates an upstream slide', 'Stay alert during and after heavy rainfall', 'Avoid valleys, drainage channels, and the bases of steep slopes during alerts', 'If indoors, move to the upper floor on the side away from the slope'],
        evacuation: ['Leave immediately if authorities issue a landslide warning for your area', 'Do not cross bridges over swollen streams or rivers', 'Evacuate on foot if roads are blocked — do not wait for vehicle access', 'Move to high ground on stable terrain'],
        actions: ['Report road blockages and visible ground movement to the local SDM office or call 112', 'Do not attempt to dig through slide debris without proper equipment', 'Keep well away from the edges of slide areas', 'Check on neighbors in vulnerable locations'],
      },
      Cyclone: {
        steps: ['Secure all loose objects outside — flying debris causes the majority of cyclone injuries', 'Board up or tape windows to prevent shattering', 'Move to the innermost room on the lowest floor — stay away from all windows', 'Fill clean containers with fresh water — supply may be disrupted for days', 'Charge all communication devices fully and keep a battery-powered radio ready', 'Stock at least 72 hours of food, water, and essential medications'],
        evacuation: ['Comply immediately with government evacuation orders', 'Move to the nearest designated cyclone shelter', 'Secure your home as much as possible before leaving', 'Take your emergency kit, identification documents, and essential medications'],
        actions: ['During the storm, stay indoors and away from windows', 'After the storm passes, avoid downed power lines, standing water, and damaged structures', 'Report damage and injuries to the State Emergency Operations Centre', 'Do not use tap water until authorities confirm it is safe'],
      },
      'Building Collapse': {
        steps: ['If trapped under rubble, cover your mouth with fabric to avoid inhaling dust', 'Tap on pipes or walls at regular intervals — rescue teams use acoustic sensors to locate survivors', 'Do not shout continuously — it wastes energy and you may inhale dangerous dust', 'If you can move, try to reach a void space near a large structural element', 'Conserve your phone battery — send a single SMS with your location', 'If you have access to water, drink small sips regularly'],
        evacuation: ['If outside the collapsed area, move away immediately — secondary collapses are common', 'Do not re-enter the structure for any reason', 'Clear the area around the collapse site to allow heavy equipment access', 'Watch for dust clouds indicating ongoing structural failure'],
        actions: ['Call NDRF (011-24363260) and local police (100) with exact location', 'If you witnessed the collapse, stay to provide information to first responders', 'Do not attempt rescue operations without proper training and equipment', 'Photograph the scene from a safe distance'],
      },
      'Medical Emergency': {
        steps: ['Ensure the scene is safe for you before approaching any injured person', 'Call 108 (ambulance) or 112 (emergency) immediately', 'Check for responsiveness — tap the shoulder firmly and ask if they can hear you', 'If unresponsive but breathing, place them in the recovery position', 'Apply firm direct pressure to any external bleeding', 'Do not move a person with suspected spinal injuries unless in immediate danger'],
        evacuation: ['Clear a path for ambulance access — remove vehicles and obstacles', 'Identify the nearest hospital and communicate this to the ambulance team', 'If multiple casualties, begin triage — prioritize life-threatening but survivable injuries', 'Designate someone to guide the ambulance to the exact location'],
        actions: ['Begin CPR if the person is unresponsive and not breathing', 'If an AED is available, follow its voice prompts', 'Keep the patient warm with a blanket or jacket — shock causes temperature to drop', 'Note the time of onset and any medications — paramedics will need this'],
      },
      'Road Blockage': {
        steps: ['Do not attempt to clear heavy debris, fallen trees, or downed power lines yourself', 'Turn on hazard lights and place reflective triangles at least 50 meters behind the obstruction', 'If power lines are down near your vehicle, stay inside', 'Report the exact blockage location with GPS coordinates', 'Check surroundings for injured people before focusing on the road', 'Photograph the obstruction for emergency records'],
        evacuation: ['If the road is blocked ahead, carefully reverse to the last intersection', 'Follow Traffic Police diversions and check for real-time updates', 'If stranded, stay with your vehicle unless it is in a dangerous location', 'If on foot, walk facing oncoming traffic and stay on the shoulder'],
        actions: ['Call Traffic Police at 1095 or PWD helpline with the road name and nearest landmark', 'Note whether vehicles are trapped in or under the obstruction', 'Yield immediately to approaching emergency vehicles', 'If flooding caused the blockage, alert others verbally — water depth may be hidden'],
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
  const city = c.req.query('city')
  let q = 'SELECT s.*, r.water, r.food, r.medicine, r.blankets, r.rescue_equipment FROM shelters s LEFT JOIN resources r ON s.id=r.shelter_id WHERE 1=1'
  const p: any[] = []
  if (t && t !== 'all') { q += ' AND s.type=?'; p.push(t) }
  if (city && city !== 'all') { q += ' AND s.city=?'; p.push(city) }
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
    const r = await c.env.DB.prepare('SELECT r.*, s.name as shelter_name, s.type as shelter_type, s.city FROM resources r JOIN shelters s ON r.shelter_id=s.id ORDER BY s.name').all()
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
app.get('/login', (c) => c.html(html))

export default app