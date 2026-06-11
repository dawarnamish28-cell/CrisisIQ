-- CrisisIQ Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'citizen' CHECK(role IN ('citizen','admin','responder','volunteer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Flood','Fire','Earthquake','Landslide','Cyclone','Building Collapse','Medical Emergency','Road Blockage','Other')),
  description TEXT NOT NULL,
  image_data TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  location_name TEXT,
  severity TEXT NOT NULL DEFAULT 'Moderate' CHECK(severity IN ('Low','Moderate','High','Critical')),
  urgency TEXT NOT NULL DEFAULT 'Medium' CHECK(urgency IN ('Low','Medium','High','Immediate')),
  status TEXT NOT NULL DEFAULT 'reported' CHECK(status IN ('reported','verified','dispatched','in_progress','resolved','closed')),
  ai_confidence REAL DEFAULT 0,
  ai_explanation TEXT,
  reporter_name TEXT,
  reporter_phone TEXT,
  assigned_team TEXT,
  population_density INTEGER DEFAULT 0,
  priority_score REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shelters table
CREATE TABLE IF NOT EXISTS shelters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'shelter' CHECK(type IN ('shelter','hospital','rescue_center')),
  address TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 100,
  occupancy INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','full','closed','emergency')),
  contact_phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Resources table
CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shelter_id INTEGER NOT NULL,
  water INTEGER NOT NULL DEFAULT 0,
  food INTEGER NOT NULL DEFAULT 0,
  medicine INTEGER NOT NULL DEFAULT 0,
  blankets INTEGER NOT NULL DEFAULT 0,
  rescue_equipment INTEGER NOT NULL DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shelter_id) REFERENCES shelters(id) ON DELETE CASCADE
);

-- Volunteers table
CREATE TABLE IF NOT EXISTS volunteers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  skills TEXT,
  availability TEXT NOT NULL DEFAULT 'available' CHECK(availability IN ('available','on_mission','unavailable')),
  assigned_incident_id INTEGER,
  location_lat REAL,
  location_lng REAL,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_incident_id) REFERENCES incidents(id) ON DELETE SET NULL
);

-- AI Analysis Log
CREATE TABLE IF NOT EXISTS ai_analysis_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id INTEGER NOT NULL,
  analysis_type TEXT NOT NULL,
  result TEXT NOT NULL,
  confidence REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_shelters_status ON shelters(status);
CREATE INDEX IF NOT EXISTS idx_shelters_type ON shelters(type);
CREATE INDEX IF NOT EXISTS idx_volunteers_availability ON volunteers(availability);
