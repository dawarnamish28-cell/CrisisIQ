-- CrisisIQ Seed Data

-- Admin and Responder Users
INSERT OR IGNORE INTO users (name, email, phone, role) VALUES
  ('Admin Control', 'admin@crisisiq.org', '+1-555-0100', 'admin'),
  ('Sarah Chen', 'sarah@crisisiq.org', '+1-555-0101', 'responder'),
  ('Marcus Johnson', 'marcus@crisisiq.org', '+1-555-0102', 'responder'),
  ('Dr. Priya Sharma', 'priya@crisisiq.org', '+1-555-0103', 'responder'),
  ('James Wilson', 'james@crisisiq.org', '+1-555-0104', 'citizen'),
  ('Maria Garcia', 'maria@crisisiq.org', '+1-555-0105', 'volunteer');

-- Shelters
INSERT OR IGNORE INTO shelters (name, type, address, latitude, longitude, capacity, occupancy, status, contact_phone) VALUES
  ('Central Community Center', 'shelter', '123 Main St, Downtown', 28.6139, 77.2090, 500, 342, 'open', '+1-555-1001'),
  ('City General Hospital', 'hospital', '456 Health Ave, Midtown', 28.6280, 77.2195, 200, 178, 'open', '+1-555-1002'),
  ('Riverside Rescue Station', 'rescue_center', '789 River Rd, Eastside', 28.6050, 77.2300, 150, 45, 'open', '+1-555-1003'),
  ('North District Shelter', 'shelter', '321 North Blvd, Northside', 28.6500, 77.1900, 300, 267, 'emergency', '+1-555-1004'),
  ('St. Mary Medical Center', 'hospital', '654 Care St, Westside', 28.5900, 77.1800, 250, 180, 'open', '+1-555-1005'),
  ('Southside Emergency Hub', 'rescue_center', '987 South Ave, Southside', 28.5700, 77.2400, 200, 88, 'open', '+1-555-1006'),
  ('East Community Hall', 'shelter', '147 East Rd, Eastside', 28.6200, 77.2600, 400, 395, 'full', '+1-555-1007'),
  ('Mountain View Camp', 'shelter', '258 Hill St, Highland', 28.6700, 77.2100, 350, 120, 'open', '+1-555-1008');

-- Resources for each shelter
INSERT OR IGNORE INTO resources (shelter_id, water, food, medicine, blankets, rescue_equipment) VALUES
  (1, 850, 720, 340, 500, 45),
  (2, 400, 300, 890, 200, 120),
  (3, 600, 450, 250, 300, 200),
  (4, 120, 80, 60, 50, 30),
  (5, 500, 400, 950, 250, 80),
  (6, 700, 550, 400, 350, 180),
  (7, 50, 30, 20, 10, 15),
  (8, 900, 800, 500, 600, 100);

-- Incidents (realistic disaster scenarios)
INSERT OR IGNORE INTO incidents (report_id, category, description, latitude, longitude, location_name, severity, urgency, status, ai_confidence, ai_explanation, reporter_name, reporter_phone, assigned_team, population_density, priority_score, created_at) VALUES
  ('INC-20260610-001', 'Flood', 'Severe waterlogging in residential area. Water level rising above 4 feet. Multiple families stranded on rooftops.', 28.6200, 77.2150, 'Sector 12, Downtown', 'Critical', 'Immediate', 'dispatched', 95.2, 'Large-scale urban flooding detected. Multiple structures submerged. Immediate rescue operations required.', 'Rajesh Kumar', '+1-555-2001', 'Alpha Rescue Team', 8500, 97.5, datetime('now', '-2 hours')),
  ('INC-20260610-002', 'Building Collapse', 'Three-story residential building collapsed after heavy rains. Approximately 15-20 people trapped.', 28.6350, 77.2050, 'Old City Quarter', 'Critical', 'Immediate', 'in_progress', 91.8, 'Structural collapse confirmed. Multiple casualties likely. Heavy machinery required for rescue.', 'Anita Desai', '+1-555-2002', 'Bravo Search & Rescue', 12000, 96.2, datetime('now', '-1 hours')),
  ('INC-20260610-003', 'Fire', 'Chemical warehouse fire spreading to adjacent buildings. Toxic fumes reported.', 28.5950, 77.2350, 'Industrial Zone East', 'Critical', 'Immediate', 'dispatched', 88.5, 'Chemical fire with toxic fumes. Evacuation zone recommended within 2km radius.', 'Vikram Singh', '+1-555-2003', 'Charlie Fire Brigade', 3200, 94.8, datetime('now', '-3 hours')),
  ('INC-20260610-004', 'Landslide', 'Major landslide blocking NH-44. Several vehicles buried under debris.', 28.6700, 77.1800, 'Highway NH-44, Km 234', 'High', 'High', 'verified', 82.3, 'Significant landslide activity. Road completely blocked. Vehicles likely trapped.', 'Suresh Patel', '+1-555-2004', NULL, 1500, 85.6, datetime('now', '-4 hours')),
  ('INC-20260610-005', 'Medical Emergency', 'Mass food poisoning at community event. Over 50 people showing symptoms.', 28.6100, 77.2500, 'Community Park, Eastside', 'High', 'High', 'in_progress', 79.1, 'Mass casualty incident from contaminated food. Medical triage recommended.', 'Dr. Meena Reddy', '+1-555-2005', 'Medical Response Unit', 6800, 82.3, datetime('now', '-5 hours')),
  ('INC-20260610-006', 'Flood', 'River overflow threatening residential colony. Water approaching danger mark.', 28.5800, 77.2100, 'Riverside Colony, Southside', 'High', 'High', 'verified', 86.7, 'River water levels approaching critical threshold. Pre-emptive evacuation recommended.', 'Kavita Joshi', '+1-555-2006', NULL, 9200, 88.1, datetime('now', '-6 hours')),
  ('INC-20260610-007', 'Road Blockage', 'Fallen trees blocking multiple roads after storm. Power lines down.', 28.6400, 77.2400, 'Green Park Area', 'Moderate', 'Medium', 'reported', 71.4, 'Storm damage with fallen trees and downed power lines. Area unsafe for transit.', 'Amit Sharma', '+1-555-2007', NULL, 5400, 65.2, datetime('now', '-7 hours')),
  ('INC-20260610-008', 'Cyclone', 'Strong winds damaging structures in coastal area. Roof damage to multiple houses.', 28.5600, 77.1900, 'Coastal Ward 7', 'High', 'High', 'dispatched', 84.9, 'Cyclonic wind damage pattern identified. Structural integrity compromised in multiple buildings.', 'Lakshmi Nair', '+1-555-2008', 'Delta Relief Team', 7100, 86.9, datetime('now', '-8 hours')),
  ('INC-20260610-009', 'Earthquake', 'Tremors felt across eastern district. Cracks reported in several buildings.', 28.6300, 77.2700, 'Eastern District Block C', 'Moderate', 'Medium', 'verified', 76.2, 'Seismic activity detected. Structural assessments recommended for affected buildings.', 'Ravi Gupta', '+1-555-2009', NULL, 4300, 68.7, datetime('now', '-10 hours')),
  ('INC-20260610-010', 'Flood', 'Underground metro station flooded. Passengers evacuated but some may be trapped.', 28.6150, 77.2250, 'Central Metro Station', 'Critical', 'Immediate', 'in_progress', 93.6, 'Underground infrastructure flooding. High risk due to confined space and electrical hazards.', 'Deepa Menon', '+1-555-2010', 'Alpha Rescue Team', 15000, 98.1, datetime('now', '-30 minutes')),
  ('INC-20260610-011', 'Medical Emergency', 'Elderly care home without power for 12+ hours. Patients on ventilators at risk.', 28.6450, 77.1950, 'Sunrise Elder Care, Northside', 'Critical', 'Immediate', 'dispatched', 90.1, 'Life-support systems at risk due to power failure. Generator deployment critical.', 'Nurse Rekha Bai', '+1-555-2011', 'Medical Response Unit', 2800, 93.4, datetime('now', '-1 hours')),
  ('INC-20260610-012', 'Landslide', 'Minor mudslide on hillside road. No casualties but road partially blocked.', 28.6600, 77.2200, 'Hill Road Section 3', 'Low', 'Low', 'reported', 65.8, 'Minor land movement. Road clearance needed. Monitor for further slides.', 'Prakash Yadav', '+1-555-2012', NULL, 800, 35.4, datetime('now', '-12 hours'));

-- Volunteers
INSERT OR IGNORE INTO volunteers (name, email, phone, skills, availability, assigned_incident_id, location_lat, location_lng) VALUES
  ('Arjun Mehta', 'arjun@volunteer.org', '+1-555-3001', 'First Aid, Swimming, Heavy Lifting', 'on_mission', 1, 28.6180, 77.2130),
  ('Fatima Khan', 'fatima@volunteer.org', '+1-555-3002', 'Medical, CPR, Trauma Care', 'on_mission', 5, 28.6090, 77.2480),
  ('David Park', 'david@volunteer.org', '+1-555-3003', 'Search & Rescue, Climbing, Navigation', 'available', NULL, 28.6300, 77.2100),
  ('Lisa Thompson', 'lisa@volunteer.org', '+1-555-3004', 'Communication, Logistics, Driving', 'available', NULL, 28.6400, 77.2200),
  ('Omar Hassan', 'omar@volunteer.org', '+1-555-3005', 'Construction, Electrical, Plumbing', 'on_mission', 2, 28.6340, 77.2040),
  ('Chen Wei', 'chen@volunteer.org', '+1-555-3006', 'IT Support, Drone Operation, Mapping', 'available', NULL, 28.6100, 77.2300),
  ('Sofia Rodriguez', 'sofia@volunteer.org', '+1-555-3007', 'Counseling, Translation, Child Care', 'available', NULL, 28.5900, 77.2000),
  ('Raj Patel', 'raj@volunteer.org', '+1-555-3008', 'Cooking, Supply Management, Driving', 'unavailable', NULL, 28.6500, 77.2500),
  ('Emma Williams', 'emma@volunteer.org', '+1-555-3009', 'Nursing, First Aid, Elder Care', 'on_mission', 11, 28.6440, 77.1940),
  ('Yuki Tanaka', 'yuki@volunteer.org', '+1-555-3010', 'Water Rescue, Boat Operation, Swimming', 'available', NULL, 28.5800, 77.2150);
