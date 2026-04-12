const { initDatabase, queryOne, runSql, saveDb } = require('./init');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedDatabase() {
  const db = await initDatabase();

  const row = queryOne('SELECT COUNT(*) as c FROM agencies');
  if (row && row.c > 0) {
    console.log('Database already seeded.');
    return;
  }

  console.log('Seeding B2B database...');
  const hash = bcrypt.hashSync('password123', 10);

  // Agencies
  const agencies = [
    ['SkyHigh Travels', 'LIC1001', 'UAE', 'Dubai', 'Business Bay', 50000, 2500, 15.0, 1],
    ['Global Tours B2B', 'LIC2002', 'UK', 'London', 'Oxford St', 20000, 800, 12.0, 1]
  ];
  agencies.forEach(a => db.run('INSERT INTO agencies (company_name, license_number, country, city, address, credit_limit, current_balance, commission_rate, is_approved) VALUES (?,?,?,?,?,?,?,?,?)', a));

  // Users
  const users = [
    // Super Admin
    [uuidv4(), null, 'admin@rehlati.com', hash, 'Super', 'Admin', '+97150000000', 'super_admin', 1],
    // Agency 1 Admins/Agents
    [uuidv4(), 1, 'manager@skyhigh.com', hash, 'Ahmed', 'Ali', '+97150111111', 'agency_admin', 1],
    [uuidv4(), 1, 'agent1@skyhigh.com', hash, 'Sarah', 'Smith', '+97150222222', 'agent', 1],
    // Agency 2 Agent
    [uuidv4(), 2, 'agent@globaltours.com', hash, 'John', 'Doe', '+44700000000', 'agent', 1]
  ];
  users.forEach(u => db.run('INSERT INTO users (uuid, agency_id, email, password, first_name, last_name, phone, role, is_active) VALUES (?,?,?,?,?,?,?,?,?)', u));

  // Airports
  const airports = [
    ['DXB','Dubai International','Dubai','UAE',25.2532,55.3657],
    ['LHR','London Heathrow','London','UK',51.4700,-0.4543],
    ['JFK','JFK International','New York','USA',40.6413,-73.7781]
  ];
  airports.forEach(a => db.run('INSERT INTO airports (code,name,city,country,latitude,longitude) VALUES (?,?,?,?,?,?)', a));

  // Airlines
  const airlines = [['EK','Emirates','✈️','UAE'],['BA','British Airways','✈️','UK']];
  airlines.forEach(a => db.run('INSERT INTO airlines (code,name,logo,country) VALUES (?,?,?,?)', a));

  // Flights (Net Prices)
  const flights = [
    ['EK001',1,1,2,'2026-05-10 08:00','2026-05-10 13:30',450, 400.00, 'scheduled'],
    ['BA105',2,2,3,'2026-05-11 11:00','2026-05-11 14:20',500, 350.00, 'scheduled']
  ];
  flights.forEach(f => db.run('INSERT INTO flights (flight_number,airline_id,origin_id,destination_id,departure_time,arrival_time,duration_minutes,price_net,status) VALUES (?,?,?,?,?,?,?,?,?)', f));

  // Hotels
  const hotels = [
    ['Burj Al Arab','Dubai','UAE','Jumeirah St',5,4.9,2000,'img','["Pool"]',1],
    ['The Ritz','London','UK','Piccadilly',5,4.8,1500,'img','["WiFi"]',1]
  ];
  hotels.forEach(h => db.run('INSERT INTO hotels (name,city,country,address,stars,rating,review_count,image,amenities,is_featured) VALUES (?,?,?,?,?,?,?,?,?,?)', h));

  // Hotel rooms (Net Prices)
  const rooms = [
    [1,'Deluxe Suite',1500.00,2,'King','["Ocean View"]'],
    [2,'Superior Room',650.00,2,'Queen','["Park View"]']
  ];
  rooms.forEach(r => db.run('INSERT INTO hotel_rooms (hotel_id,room_type,price_p_night_net,max_guests,bed_type,amenities) VALUES (?,?,?,?,?,?)', r));

  saveDb();
  console.log('✅ B2B Database seeded successfully!');
}

module.exports = { seedDatabase };
