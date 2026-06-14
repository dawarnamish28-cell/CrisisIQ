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

    const f = [
      ['AIIMS Trauma Centre','hospital','Sri Aurobindo Marg, Ansari Nagar','Delhi','Delhi',28.5672,77.2100,450,312,'open','+91-11-26588500'],
      ['Safdarjung Hospital','hospital','Ansari Nagar West','Delhi','Delhi',28.5685,77.2065,600,478,'open','+91-11-26707437'],
      ['Lok Nayak Jai Prakash Hospital','hospital','Jawaharlal Nehru Marg','Delhi','Delhi',28.6382,77.2410,520,445,'emergency','+91-11-23232400'],
      ['GTB Hospital','hospital','Dilshad Garden, Shahdara','Delhi','Delhi',28.6839,77.3091,400,298,'open','+91-11-22586262'],
      ['Rajiv Gandhi Super Speciality Hospital','hospital','Tahirpur, Dilshad Garden','Delhi','Delhi',28.6912,77.3156,350,189,'open','+91-11-22890604'],
      ['Ram Manohar Lohia Hospital','hospital','Baba Kharak Singh Marg','Delhi','Delhi',28.6270,77.2085,700,540,'open','+91-11-23365525'],
      ['Hindu Rao Hospital','hospital','Hindu Rao Marg, Malka Ganj','Delhi','Delhi',28.6802,77.2117,500,380,'open','+91-11-23919293'],
      ['Deen Dayal Upadhyay Hospital','hospital','Hari Nagar','Delhi','Delhi',28.6313,77.1182,450,320,'open','+91-11-25128484'],
      ['Yamuna Sports Complex Relief Camp','shelter','Surajmal Vihar','Delhi','Delhi',28.6276,77.2971,2000,1456,'open','+91-11-22145000'],
      ['Thyagraj Stadium Shelter','shelter','Thyagraj Nagar, INA','Delhi','Delhi',28.5830,77.2140,800,623,'open','+91-11-24617891'],
      ['Talkatora Indoor Stadium','shelter','President Estate','Delhi','Delhi',28.6225,77.1992,1200,340,'open','+91-11-23011792'],
      ['Jawaharlal Nehru Stadium','shelter','Lodhi Road','Delhi','Delhi',28.5812,77.2378,5000,1800,'open','+91-11-24364837'],
      ['Indira Gandhi Indoor Stadium','shelter','Ring Road, ITO','Delhi','Delhi',28.6339,77.2412,3500,950,'open','+91-11-23379750'],
      ['NDRF 2nd Battalion HQ','rescue_center','Aravalli Hills, Faridabad','Faridabad','Haryana',28.4292,77.3103,200,48,'open','+91-129-2234400'],
      ['Delhi Fire Service HQ','rescue_center','Connaught Place','Delhi','Delhi',28.6315,77.2167,150,62,'open','+91-11-23416666'],
      ['KEM Hospital','hospital','Acharya Donde Marg, Parel','Mumbai','Maharashtra',19.0035,72.8422,1800,1420,'open','+91-22-24136051'],
      ['Lilavati Hospital','hospital','Bandra Reclamation','Mumbai','Maharashtra',19.0509,72.8290,350,220,'open','+91-22-26751000'],
      ['JJ Hospital','hospital','Byculla East','Mumbai','Maharashtra',18.9670,72.8364,1350,1050,'open','+91-22-23735555'],
      ['Nair Hospital','hospital','Mumbai Central','Mumbai','Maharashtra',18.9730,72.8200,900,680,'open','+91-22-23027062'],
      ['Sion Hospital','hospital','Sion West','Mumbai','Maharashtra',19.0407,72.8628,800,610,'open','+91-22-24076381'],
      ['SSKM Hospital','hospital','244 AJC Bose Road','Kolkata','West Bengal',22.5363,88.3441,1600,1280,'open','+91-33-22041101'],
      ['NRS Medical College','hospital','138 AJC Bose Road','Kolkata','West Bengal',22.5430,88.3499,900,760,'open','+91-33-22861401'],
      ['Calcutta Medical College','hospital','88 College Street','Kolkata','West Bengal',22.5711,88.3638,1200,950,'open','+91-33-22413636'],
      ['RG Kar Medical College','hospital','1 Khudiram Bose Sarani','Kolkata','West Bengal',22.5935,88.3703,600,480,'open','+91-33-25574073'],
      ['Government General Hospital','hospital','Park Town','Chennai','Tamil Nadu',13.0780,80.2752,2500,1900,'open','+91-44-25305000'],
      ['Rajiv Gandhi Govt General Hospital','hospital','EVR Periyar Salai','Chennai','Tamil Nadu',13.0780,80.2682,1800,1420,'open','+91-44-25305000'],
      ['Stanley Medical College Hospital','hospital','Royapuram','Chennai','Tamil Nadu',13.1141,80.2909,1100,820,'open','+91-44-25281665'],
      ['Kilpauk Medical College Hospital','hospital','Poonamallee High Road','Chennai','Tamil Nadu',13.0783,80.2453,800,590,'open','+91-44-26432842'],
      ['Victoria Hospital','hospital','Fort, KR Market Area','Bengaluru','Karnataka',12.9610,77.5770,1500,1100,'open','+91-80-26701150'],
      ['Bowring Hospital','hospital','Shivaji Nagar','Bengaluru','Karnataka',12.9815,77.6007,600,430,'open','+91-80-25591325'],
      ['Nimhans','hospital','Hosur Road','Bengaluru','Karnataka',12.9425,77.5937,800,600,'open','+91-80-26995000'],
      ['Osmania General Hospital','hospital','Afzalgunj','Hyderabad','Telangana',17.3700,78.4731,1800,1350,'open','+91-40-24600146'],
      ['Gandhi Hospital','hospital','Musheerabad','Hyderabad','Telangana',17.4000,78.4800,1500,1120,'open','+91-40-27505566'],
      ['Nizam Institute of Medical Sciences','hospital','Punjagutta','Hyderabad','Telangana',17.4200,78.4500,1000,780,'open','+91-40-23489000'],
      ['SMS Hospital','hospital','JLN Marg','Jaipur','Rajasthan',26.9196,75.8091,2000,1530,'open','+91-141-2560291'],
      ['Zanana Hospital','hospital','MI Road','Jaipur','Rajasthan',26.9110,75.7890,700,520,'open','+91-141-2564222'],
      ['Civil Hospital Ahmedabad','hospital','Asarwa','Ahmedabad','Gujarat',23.0465,72.6006,2500,1820,'open','+91-79-22683721'],
      ['VS Hospital','hospital','Ellis Bridge','Ahmedabad','Gujarat',23.0290,72.5650,800,590,'open','+91-79-26577621'],
      ['IGMC Shimla','hospital','The Ridge','Shimla','Himachal Pradesh',31.1070,77.1730,500,380,'open','+91-177-2804251'],
      ['PGIMER Chandigarh','hospital','Sector 12','Chandigarh','Chandigarh',30.7628,76.7746,2000,1600,'open','+91-172-2747585'],
      ['GMCH Chandigarh','hospital','Sector 32','Chandigarh','Chandigarh',30.7370,76.7681,1200,900,'open','+91-172-2665253'],
      ['KGMU Lucknow','hospital','Shahmina Road','Lucknow','Uttar Pradesh',26.8574,80.9325,3000,2400,'open','+91-522-2258140'],
      ['BHU Hospital','hospital','Lanka','Varanasi','Uttar Pradesh',25.2677,82.9913,1500,1150,'open','+91-542-2368558'],
      ['AIIMS Patna','hospital','Phulwarisharif','Patna','Bihar',25.5820,85.0871,700,520,'open','+91-612-2451070'],
      ['PMCH Patna','hospital','Ashok Rajpath','Patna','Bihar',25.6167,85.1584,2000,1650,'open','+91-612-2300343'],
      ['AIIMS Bhopal','hospital','Saket Nagar','Bhopal','Madhya Pradesh',23.2050,77.4600,600,420,'open','+91-755-2672317'],
      ['Hamidia Hospital','hospital','Royal Market','Bhopal','Madhya Pradesh',23.2600,77.4120,1000,780,'open','+91-755-2540222'],
      ['AIIMS Bhubaneswar','hospital','Sijua','Bhubaneswar','Odisha',20.2350,85.7780,800,580,'open','+91-674-2476789'],
      ['SCB Medical College','hospital','Mangalabag','Cuttack','Odisha',20.4700,85.8900,1500,1200,'open','+91-671-2414080'],
      ['GMCH Guwahati','hospital','Bhangagarh','Guwahati','Assam',26.1864,91.7413,1200,950,'open','+91-361-2529457'],
      ['JNIMS Imphal','hospital','Porompat','Imphal','Manipur',24.8097,93.9440,500,350,'open','+91-385-2414654'],
      ['NEIGRIHMS Shillong','hospital','Mawdiangdiang','Shillong','Meghalaya',25.5732,91.8830,400,280,'open','+91-364-2538013'],
      ['AIIMS Rishikesh','hospital','Virbhadra Road','Rishikesh','Uttarakhand',30.0705,78.2553,700,500,'open','+91-135-2462938'],
      ['SKIMS Srinagar','hospital','Soura','Srinagar','Jammu & Kashmir',34.1264,74.8403,800,600,'open','+91-194-2401013'],
      ['GMC Jammu','hospital','Bakshi Nagar','Jammu','Jammu & Kashmir',32.7181,74.8526,900,680,'open','+91-191-2584221'],
      ['Goa Medical College','hospital','Bambolim','Panaji','Goa',15.4604,73.8746,700,490,'open','+91-832-2458727'],
      ['Calicut Medical College','hospital','Medical College PO','Kozhikode','Kerala',11.2580,75.7830,1400,1050,'open','+91-495-2350216'],
      ['Trivandrum Medical College','hospital','Chalakkuzhi','Thiruvananthapuram','Kerala',8.5150,76.9490,1200,900,'open','+91-471-2528386'],
      ['JIPMER Puducherry','hospital','Dhanvantari Nagar','Puducherry','Puducherry',11.9570,79.7990,1000,750,'open','+91-413-2296000'],
      ['Madurai Govt Rajaji Hospital','hospital','Panagal Road','Madurai','Tamil Nadu',9.9210,78.1190,2000,1550,'open','+91-452-2532535'],
      ['NDRF 1st Battalion HQ','rescue_center','Guwahati','Guwahati','Assam',26.1584,91.7699,300,75,'open','+91-361-2340399'],
      ['NDRF 3rd Battalion HQ','rescue_center','Mundali, Cuttack','Cuttack','Odisha',20.5284,85.8790,250,60,'open','+91-671-2365100'],
      ['NDRF 5th Battalion HQ','rescue_center','Sudumbare, Pune','Pune','Maharashtra',18.6975,73.6520,300,82,'open','+91-20-22852021'],
      ['NDRF 7th Battalion HQ','rescue_center','Bathinda','Bathinda','Punjab',30.2100,74.9450,200,55,'open','+91-164-2250121'],
      ['NDRF 8th Battalion HQ','rescue_center','Kamrup','Guwahati','Assam',26.1400,91.7500,200,50,'open','+91-361-2850234'],
      ['NDRF 9th Battalion HQ','rescue_center','Patna','Patna','Bihar',25.6100,85.1400,250,65,'open','+91-612-2262055'],
      ['NDRF 10th Battalion HQ','rescue_center','Vijayawada','Vijayawada','Andhra Pradesh',16.5062,80.6480,250,70,'open','+91-866-2412100'],
      ['NDRF 12th Battalion HQ','rescue_center','Itanagar','Itanagar','Arunachal Pradesh',27.0844,93.6053,150,35,'open','+91-360-2244567'],
      ['Nehru Indoor Stadium Shelter','shelter','Periamet','Chennai','Tamil Nadu',13.0726,80.2802,3000,1200,'open','+91-44-25390678'],
      ['Salt Lake Stadium Shelter','shelter','Bidhannagar','Kolkata','West Bengal',22.5726,88.4092,4000,800,'open','+91-33-23587712'],
      ['Kanteerava Indoor Stadium','shelter','Kasturba Road','Bengaluru','Karnataka',12.9758,77.5952,2000,450,'open','+91-80-22110875'],
      ['Sardar Patel Stadium','shelter','Navrangpura','Ahmedabad','Gujarat',23.0396,72.5618,3500,600,'open','+91-79-26400221'],
      ['Gachibowli Indoor Stadium','shelter','Gachibowli','Hyderabad','Telangana',17.4268,78.3497,2000,380,'open','+91-40-23001122'],
      ['Balewadi Stadium Shelter','shelter','Balewadi','Pune','Maharashtra',18.5800,73.7700,2500,500,'open','+91-20-25684321'],
      ['Sarusjai Stadium Shelter','shelter','Sarusjai','Guwahati','Assam',26.1250,91.8020,1500,300,'open','+91-361-2465789'],
      ['Kalinga Stadium Shelter','shelter','Nayapalli','Bhubaneswar','Odisha',20.2880,85.8190,3000,700,'open','+91-674-2300456'],
      ['Sawai Mansingh Stadium','shelter','Tonk Road','Jaipur','Rajasthan',26.8920,75.8010,2500,400,'open','+91-141-2742222'],
      ['Greenfield Stadium Shelter','shelter','Kariavattom','Thiruvananthapuram','Kerala',8.5350,76.8830,2000,350,'open','+91-471-2418790'],
      ['Gandhi Maidan Shelter','shelter','Frazer Road','Patna','Bihar',25.6120,85.1390,4000,900,'open','+91-612-2219876'],
      ['EMS Stadium Shelter','shelter','Kozhikode','Kozhikode','Kerala',11.2520,75.7710,1800,280,'open','+91-495-2720345'],
    ]

    const batchSize = 8
    for (let i = 0; i < f.length; i += batchSize) {
      const chunk = f.slice(i, i + batchSize)
      await db.batch(chunk.map(r =>
        db.prepare(`INSERT OR IGNORE INTO shelters (name,type,address,city,state,latitude,longitude,capacity,occupancy,status,contact_phone) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10])
      ))
    }

    const shelterCount = await db.prepare('SELECT COUNT(*) as c FROM shelters').first() as any
    const total = shelterCount?.c || 0
    const resBatch: any[] = []
    for (let sid = 1; sid <= total; sid++) {
      const isHosp = sid <= 60
      resBatch.push(
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
    for (let i = 0; i < resBatch.length; i += 8) {
      await db.batch(resBatch.slice(i, i + 8))
    }

    await db.batch([
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Dr. Arun Kapoor','arun.kapoor@ndrf.gov.in','+91-98765-43210','Emergency Medicine, Triage, Trauma Surgery','available',28.6139,77.2090)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Priya Sharma','priya.sharma@redcross.in','+91-87654-32109','First Aid, CPR, Disaster Psychology','available',28.5672,77.2100)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Rahul Verma','rahul.verma@civildefence.in','+91-76543-21098','Search and Rescue, Structural Assessment','available',28.6350,77.2250)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Anjali Deshmukh','anjali.d@sphere.ngo','+91-65432-10987','Water Purification, Logistics','available',28.5830,77.2140)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Mohammed Irfan','m.irfan@delhifire.gov.in','+91-99887-76655','Firefighting, Hazmat Response','available',28.6315,77.2167)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Sunita Yadav','sunita.y@goonj.org','+91-88776-65544','Supply Distribution, Community Work','available',28.6276,77.2971)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Vikram Singh Rathore','vikram.sr@army.mil.in','+91-77665-54433','Swift Water Rescue, Navigation','available',28.6839,77.3091)`),
      db.prepare(`INSERT OR IGNORE INTO volunteers (name,email,phone,skills,availability,location_lat,location_lng) VALUES ('Deepika Nair','deepika.nair@msf.org','+91-66554-43322','Nursing, Epidemiology, Field Hospital','available',28.6912,77.3156)`),
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
      totalFacilities: await db.prepare('SELECT COUNT(*) as c FROM shelters').first().then((r: any) => r?.c || 0),
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
    const u: string[] = [], p: any[] = []
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
      Flood: { words: [['flood'],['water','level'],['submerge'],['drown'],['waterlog'],['inundat'],['overflow'],['river','swell'],['rain','heavy'],['yamuna'],['drain','block'],['maroon'],['waist','deep'],['knee','deep'],['deluge'],['monsoon'],['embankment'],['rising','water'],['flash','flood'],['dam'],['canal','breach'],['sewage']], weight: 0 },
      Fire: { words: [['fire'],['burn'],['blaze'],['smoke'],['flame'],['inferno'],['chemical','fire'],['explosion'],['engulf'],['charred'],['gutted'],['cylinder'],['short','circuit'],['arson'],['warehouse','fire'],['factory','fire'],['slum','fire'],['electric','fire'],['forest','fire'],['wildfire'],['gas','leak'],['lpg'],['kerosene']], weight: 0 },
      Earthquake: { words: [['earthquake'],['tremor'],['seismic'],['crack','wall'],['shake'],['quake'],['richter'],['aftershock'],['fissure'],['tectonic'],['building','sway'],['ground','split']], weight: 0 },
      Landslide: { words: [['landslide'],['mudslide'],['debris','flow'],['slope'],['hillside'],['mud','flow'],['erosion'],['rockfall'],['soil','slip'],['cave','in'],['sinkhole'],['subsidence']], weight: 0 },
      Cyclone: { words: [['cyclone'],['hurricane'],['typhoon'],['wind','speed'],['storm','surge'],['tornado'],['gust'],['uprooted'],['gale'],['squall'],['roof','blown'],['storm','warning']], weight: 0 },
      'Building Collapse': { words: [['collapse'],['structure','fail'],['rubble'],['demolish'],['pancake'],['slab','fall'],['pillar'],['beam','break'],['construction','fall'],['illegal','construction'],['wall','collapse'],['ceiling','fall'],['foundation']], weight: 0 },
      'Medical Emergency': { words: [['medical','emergency'],['injury'],['hospital','urgent'],['patient','critical'],['ambulance'],['poison'],['heatstroke'],['cardiac'],['stroke'],['choking'],['bleeding'],['fracture'],['unconscious'],['epidemic'],['outbreak'],['snakebite'],['accident','victim'],['mass','casualty']], weight: 0 },
      'Road Blockage': { words: [['road','block'],['tree','fallen'],['traffic','jam'],['power','line','down'],['pothole'],['crater'],['barricade'],['waterlogged','road'],['flyover'],['underpass','flood'],['bridge','damage'],['highway','block']], weight: 0 },
    }

    for (const [cat, sig] of Object.entries(signals)) {
      let m = 0
      for (const phrase of sig.words) {
        if (phrase.length === 1) { if (desc.includes(phrase[0])) m += 1.5 }
        else { if (phrase.every(w => desc.includes(w))) m += 2.5; else if (phrase.some(w => desc.includes(w))) m += 0.6 }
      }
      if (cat.toLowerCase() === userCat.toLowerCase()) m += 4
      sig.weight = m
    }

    if (hasImage && imageInfo.filename) {
      const fname = (imageInfo.filename || '').toLowerCase()
      if (fname.includes('flood') || fname.includes('water')) signals['Flood'].weight += 3
      if (fname.includes('fire') || fname.includes('smoke')) signals['Fire'].weight += 3
      if (fname.includes('collapse') || fname.includes('rubble')) signals['Building Collapse'].weight += 3
      if (fname.includes('quake') || fname.includes('crack')) signals['Earthquake'].weight += 3
      if (fname.includes('injury') || fname.includes('blood')) signals['Medical Emergency'].weight += 3
      if (fname.includes('road') || fname.includes('block')) signals['Road Blockage'].weight += 3
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

    const critWords = ['trapped','stranded','casualt','death','dying','critical','life-threatening','ventilator','collapsed','buried','drowning','unconscious','bleeding heavily','amputation','crush','killed','fatalities']
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
        Critical: `Severe flooding detected. Analysis indicates significant water accumulation with risk to human life. Immediate deployment of water rescue units and evacuation teams is strongly recommended.${hasImage ? ' Visual evidence corroborates the critical severity assessment.' : ''}`,
        High: `Substantial flooding identified. Water levels appear to be rising and may threaten low-lying structures. Preemptive evacuation of vulnerable populations advised.`,
        Moderate: `Flooding confirmed in the area. Current conditions suggest manageable water levels, but continued monitoring is essential.`,
        Low: `Minor waterlogging reported. No immediate threat to life. Routine drainage response recommended.`,
      },
      Fire: {
        Critical: `Active fire with rapid spread potential detected. Immediate fire suppression, evacuation of adjacent structures, and hazmat standby required.${hasImage ? ' Image analysis indicates active large-scale fire event.' : ''}`,
        High: `Significant fire activity identified. Rapid response and perimeter control recommended.`,
        Moderate: `Contained fire incident confirmed. Manageable with standard suppression equipment.`,
        Low: `Minor fire or smoke report. Standard investigation recommended.`,
      },
    }

    const defaultTemplates: Record<string, string> = {
      Critical: `Critical ${detected.toLowerCase()} emergency detected. Multiple indicators suggest immediate threat to life and property. Full-scale emergency response activation recommended.${hasImage ? ' Visual evidence supports the critical determination.' : ''}`,
      High: `Significant ${detected.toLowerCase()} incident identified. Elevated risk requiring prompt intervention. Deploy specialized teams within the hour.`,
      Moderate: `${detected} incident confirmed. Manageable threat level but warrants active monitoring and standby resources.`,
      Low: `Minor ${detected.toLowerCase()} event reported. No immediate threat detected. Standard protocols sufficient.`,
    }

    const explanation = templates[detected]?.[severity] || defaultTemplates[severity] || defaultTemplates['Moderate']

    const actions: string[] = []
    if (detected === 'Flood') { actions.push('Activate storm water pumping stations'); actions.push('Alert downstream communities') }
    if (detected === 'Fire') { actions.push('Check adjacent structures for spread risk'); actions.push('Deploy hazmat screening if industrial area') }
    if (detected === 'Earthquake') { actions.push('Inspect nearby bridges and flyovers'); actions.push('Activate building safety teams') }
    if (detected === 'Building Collapse') { actions.push('Cordon off 100m radius'); actions.push('Deploy acoustic life-detection equipment') }
    if (severity === 'Critical') { actions.push('Mobilize all available NDRF units'); actions.push('Establish forward command post') }

    return c.json({ category: detected, secondary_category: secondaryMatch, confidence, severity, urgency, explanation, factors_detected: Math.round(matchStrength), critical_indicators: crit, risk_indicators: high, image_analyzed: hasImage, image_contributed: hasImage, recommended_actions: actions, timestamp: new Date().toISOString() })
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
    const inc = incData.results || [], sh = shData.results || [], res = resData as any || {}, vol = volData as any || {}
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
    if (inc.length === 0) parts.push(`**SITUATION NORMAL** -- No active incidents reported across the national monitoring network. All response teams on standby. ${sh.length} facilities across ${Object.keys(cities).length} cities remain operational.`)
    else {
      parts.push(`**SITUATION OVERVIEW** -- ${inc.length} active incident${inc.length > 1 ? 's' : ''} across the monitoring network. ${critN} critical, ${highN} high priority. Response coordination active across ${sh.filter((s: any) => s.status !== 'closed').length} facilities in ${Object.keys(cities).length} cities.`)
      if (topCat) parts.push(`**PRIMARY CONCERN** -- ${topCat[0]} events are the leading threat with ${topCat[1]} active report${topCat[1] > 1 ? 's' : ''}.`)
    }
    parts.push(`**FACILITY NETWORK** -- Occupancy at ${occR}% across ${sh.length} facilities (${tOcc.toLocaleString()} of ${tCap.toLocaleString()}).${occR > 85 ? ' Overflow planning should begin immediately.' : ''}`)
    const lowRes: string[] = []
    if ((res.water || 0) < 3000) lowRes.push('drinking water')
    if ((res.food || 0) < 2500) lowRes.push('food supplies')
    if ((res.medicine || 0) < 2000) lowRes.push('medical supplies')
    if (lowRes.length > 0) parts.push(`**SUPPLY ALERT** -- ${lowRes.join(', ')} below recommended thresholds.`)
    else parts.push(`**SUPPLY STATUS** -- All resource categories above minimum thresholds.`)
    parts.push(`**PERSONNEL** -- ${vol.a || 0} of ${vol.t || 0} responders available for deployment.`)
    const recs: string[] = []
    if (critN > 0) recs.push('Prioritize rescue assets toward critical incidents')
    if (occR > 80) recs.push('Activate overflow arrangements with nearby facilities')
    if (lowRes.length > 0) recs.push(`Expedite resupply of ${lowRes.join(', ')}`)
    if ((vol.a || 0) < 3) recs.push('Issue mobilization alert to off-duty personnel')
    if (inc.length > 0) recs.push('Maintain 15-minute reporting cadence for active incidents')
    recs.push('Verify VHF radio backup for all field teams')
    if (inc.length === 0) recs.push('Conduct readiness drills during low-activity window')
    return c.json({ summary: parts.join('\n\n'), metrics: { activeIncidents: inc.length, criticalIncidents: critN, highPriorityIncidents: highN, shelterOccupancy: occR, availableVolunteers: vol.a || 0, totalVolunteers: vol.t || 0 }, recommendations: recs, topIncidents: inc.slice(0, 5), generated_at: new Date().toISOString() })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

app.post('/api/ai/guidance', async (c) => {
  try {
    const { category } = await c.req.json()
    const g: Record<string, any> = {
      Flood: { steps: ['Move to the highest floor or rooftop immediately','Do not walk or drive through moving water','Turn off electricity at the main breaker if water is entering','Store clean drinking water in sealed containers','Keep documents and medications in a waterproof bag','If you smell gas or see sparking wires, evacuate immediately'], evacuation: ['Follow routes announced by police or NDRF','Prioritize children, elderly, and pregnant women','Signal rescuers from rooftops using bright fabric','Do not use shortcuts through unfamiliar flooded areas'], actions: ['Call 1077 or NDRF at 011-24363260','Send GPS coordinates via SMS if networks are congested','Avoid contact with floodwater','Do not enter structures until cleared by engineers'] },
      Fire: { steps: ['Evacuate immediately -- do not collect belongings','Stay low and crawl if smoke is dense','Feel doors before opening -- if hot, fire is on the other side','Never use elevators during a fire','If clothing catches fire: stop, drop, and roll','Cover nose and mouth with a damp cloth'], evacuation: ['Use nearest fire exit to assembly point','If trapped above fire, go to roof and signal','Close every door behind you','Once outside, move 100m from structure'], actions: ['Call Fire Service at 101','Alert neighbors by banging on doors','If trapped, seal door gaps with wet cloth','Do not fight fires larger than a wastebasket'] },
      Earthquake: { steps: ['DROP to hands and knees immediately','Take COVER under a sturdy desk or table','HOLD ON until shaking stops','If no shelter, crouch against interior wall','Stay away from windows and heavy furniture','If outdoors, move to clear area away from buildings'], evacuation: ['Wait for shaking to stop before exiting','Use stairs only, check each landing','Watch for falling debris and broken glass','Move to open spaces like parks'], actions: ['Check for injuries and administer first aid','Do not use open flames -- gas leaks possible','Expect aftershocks','Report structural damage to authorities or call 112'] },
      Landslide: { steps: ['Evacuate uphill perpendicular to slide direction','Do not cross a landslide path','Watch for muddy water in streams','Stay alert during heavy rainfall','Avoid valleys and steep slope bases','Move to upper floor away from the slope'], evacuation: ['Leave immediately on landslide warnings','Do not cross bridges over swollen rivers','Evacuate on foot if roads blocked','Move to high ground on stable terrain'], actions: ['Report ground movement to local SDM or call 112','Do not dig through debris without equipment','Stay away from slide edges','Check on vulnerable neighbors'] },
      Cyclone: { steps: ['Secure all loose objects outside','Board up or tape windows','Move to innermost room on lowest floor','Fill containers with fresh water','Charge all devices and have battery radio ready','Stock 72 hours of food and water'], evacuation: ['Comply with government evacuation orders','Move to nearest cyclone shelter','Turn off gas and electricity before leaving','Take emergency kit and documents'], actions: ['Stay indoors during the storm','After storm, avoid power lines and standing water','Report damage to Emergency Operations Centre','Do not use tap water until cleared'] },
      'Building Collapse': { steps: ['If trapped, cover mouth with fabric','Tap on pipes or walls at regular intervals','Do not shout continuously -- conserve energy','Try to reach void spaces near structural elements','Conserve phone battery -- send one SMS','Drink small sips of water if available'], evacuation: ['Move away from collapsed area immediately','Do not re-enter for any reason','Clear area for heavy equipment access','Watch for dust clouds indicating ongoing failure'], actions: ['Call NDRF and police with exact location','Stay to provide building info to responders','Do not attempt rescue without training','Photograph scene from safe distance'] },
      'Medical Emergency': { steps: ['Ensure scene is safe before approaching','Call 108 or 112 immediately','Check responsiveness -- tap shoulder firmly','If breathing but unresponsive, use recovery position','Apply pressure to external bleeding','Do not move suspected spinal injuries'], evacuation: ['Clear path for ambulance access','Identify nearest hospital and route','Triage if multiple casualties','Guide ambulance to exact location'], actions: ['Begin CPR if not breathing','Use AED if available','Keep patient warm','Note time of onset and medications'] },
      'Road Blockage': { steps: ['Do not clear heavy debris or power lines','Turn on hazard lights, place triangles 50m back','If power lines are down, stay in vehicle','Report exact location with GPS','Check for injured people','Photograph the obstruction'], evacuation: ['Reverse to last intersection if blocked','Follow Traffic Police diversions','Stay with vehicle unless in danger','Walk facing oncoming traffic if on foot'], actions: ['Call Traffic Police at 1095','Note if vehicles are trapped','Yield to emergency vehicles','Alert others if flooding caused blockage'] },
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
  const t = c.req.query('type'), city = c.req.query('city')
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

app.delete('/api/volunteers/:id', async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM volunteers WHERE id=?').bind(c.req.param('id')).run()
    return c.json({ success: true })
  } catch (e: any) { return c.json({ error: e.message }, 500) }
})

const html = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>CrisisIQ - Disaster Response Platform</title>
<meta name="description" content="AI-powered disaster response and emergency coordination platform for India">
<script src="https://cdn.tailwindcss.com"><\/script>
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