const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'rehlati_b2b.db');
let _db = null;

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function initDatabase() {
  if (_db) return _db;
  ensureDataDir();
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(buf);
  } else {
    _db = new SQL.Database();
  }

  _db.run('PRAGMA foreign_keys = ON');

  // B2B specific: Agencies
  _db.run(`
    CREATE TABLE IF NOT EXISTS agencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      license_number TEXT,
      country TEXT,
      city TEXT,
      address TEXT,
      credit_limit REAL DEFAULT 10000,
      current_balance REAL DEFAULT 0,
      commission_rate REAL DEFAULT 10.0,
      is_approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Users (Agents & Admins)
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      agency_id INTEGER,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'agent', -- 'agent', 'agency_admin', 'super_admin'
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Same travel inventory tables
  _db.run(`CREATE TABLE IF NOT EXISTS airports (id INTEGER PRIMARY KEY, code TEXT UNIQUE, name TEXT, city TEXT, country TEXT, latitude REAL, longitude REAL)`);
  _db.run(`CREATE TABLE IF NOT EXISTS airlines (id INTEGER PRIMARY KEY, code TEXT UNIQUE, name TEXT, logo TEXT, country TEXT)`);
  _db.run(`
    CREATE TABLE IF NOT EXISTS flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT, flight_number TEXT, airline_id INTEGER, origin_id INTEGER, destination_id INTEGER, departure_time TEXT, arrival_time TEXT, duration_minutes INTEGER,
      price_net REAL NOT NULL, status TEXT DEFAULT 'scheduled'
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS hotels (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, city TEXT, country TEXT, address TEXT, stars INTEGER, rating REAL, review_count INTEGER, image TEXT, amenities TEXT, is_featured INTEGER DEFAULT 0
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS hotel_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT, hotel_id INTEGER, room_type TEXT, price_p_night_net REAL NOT NULL, max_guests INTEGER, bed_type TEXT, amenities TEXT
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS car_rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT, car_type TEXT, model TEXT, city TEXT, country TEXT, price_p_day_net REAL NOT NULL, image TEXT, features TEXT, seats INTEGER, transmission TEXT, fuel_type TEXT
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, city TEXT, country TEXT, category TEXT, price_net REAL NOT NULL, duration_hours REAL, rating REAL, review_count INTEGER, is_featured INTEGER DEFAULT 0
    )
  `);

  // Bookings - B2B structure
  _db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref TEXT UNIQUE NOT NULL,
      agency_id INTEGER NOT NULL,
      agent_id INTEGER NOT NULL,
      booking_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      status TEXT DEFAULT 'confirmed',
      check_in TEXT,
      check_out TEXT,
      guests INTEGER DEFAULT 1,
      rooms INTEGER DEFAULT 1,
      net_price REAL NOT NULL,
      markup_percentage REAL DEFAULT 0,
      gross_price REAL NOT NULL,
      commission_earned REAL NOT NULL,
      client_first_name TEXT NOT NULL,
      client_last_name TEXT NOT NULL,
      client_email TEXT,
      client_phone TEXT,
      special_requests TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Agency Ledger / Balance Transactions
  _db.run(`
    CREATE TABLE IF NOT EXISTS ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agency_id INTEGER NOT NULL,
      booking_id INTEGER,
      transaction_type TEXT, -- 'booking_charge', 'deposit', 'refund'
      amount REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDb();
  return _db;
}

function getDb() { return _db; }

function saveDb() {
  if (!_db) return;
  ensureDataDir();
  const data = _db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function queryAll(sql, params = []) {
  const stmt = _db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

function runSql(sql, params = []) {
  _db.run(sql, params);
  saveDb();
  return { lastInsertRowid: queryOne('SELECT last_insert_rowid() as id').id, changes: _db.getRowsModified() };
}

module.exports = { initDatabase, getDb, saveDb, queryAll, queryOne, runSql, DB_PATH };
