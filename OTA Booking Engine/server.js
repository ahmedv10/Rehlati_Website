const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { initDatabase, queryAll, queryOne, runSql, saveDb } = require('./database/init');
const { seedDatabase } = require('./database/seed');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rehlati-b2b-secret';

// Middleware
app.use(cors());
app.use(compression());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// Auth Middlewares
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid token' }); }
}
function agencyAdmin(req, res, next) {
  if (req.user.role !== 'agency_admin' && req.user.role !== 'super_admin') return res.status(403).json({ error: 'Agency admin access required' });
  next();
}
function superAdmin(req, res, next) {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Super admin access required' });
  next();
}

// ==================== AUTH ====================
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = queryOne('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  
  const token = jwt.sign({ id: user.id, uuid: user.uuid, email: user.email, role: user.role, agency_id: user.agency_id }, JWT_SECRET, { expiresIn: '7d' });
  
  let agency = null;
  if (user.agency_id) {
    agency = queryOne('SELECT id, company_name, credit_limit, current_balance, commission_rate, is_approved FROM agencies WHERE id = ?', [user.agency_id]);
    if (!agency.is_approved) return res.status(403).json({ error: 'Agency account is pending approval' });
  }

  res.json({ 
    token, 
    user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role },
    agency
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = queryOne('SELECT id, email, first_name, last_name, role, agency_id FROM users WHERE id = ?', [req.user.id]);
  let agency = null;
  if (user.agency_id) {
    agency = queryOne('SELECT id, company_name, credit_limit, current_balance, commission_rate FROM agencies WHERE id = ?', [user.agency_id]);
  }
  res.json({ user, agency });
});

// ==================== INVENTORY SEARCH (B2B) ====================
app.get('/api/flights', auth, (req, res) => {
  const { origin, destination, date } = req.query;
  let sql = `SELECT f.id, f.flight_number, f.departure_time, f.arrival_time, f.duration_minutes, f.price_net,
    a1.code as origin_code, a1.city as origin_city, a2.code as dest_code, a2.city as dest_city,
    al.name as airline_name, al.logo as airline_logo
    FROM flights f JOIN airports a1 ON f.origin_id=a1.id JOIN airports a2 ON f.destination_id=a2.id
    JOIN airlines al ON f.airline_id=al.id WHERE f.status='scheduled'`;
  const flights = queryAll(sql);
  res.json({ flights, count: flights.length });
});

app.get('/api/hotels', auth, (req, res) => {
  let sql = `SELECT h.id, h.name, h.city, h.stars, h.rating, h.image, MIN(hr.price_p_night_net) as price_net_from 
             FROM hotels h LEFT JOIN hotel_rooms hr ON h.id=hr.hotel_id GROUP BY h.id`;
  const hotels = queryAll(sql);
  res.json({ hotels, count: hotels.length });
});

// ==================== B2B BOOKING ENGINE ====================
app.post('/api/bookings', auth, (req, res) => {
  if (req.user.role === 'super_admin') return res.status(403).json({ error: 'Super admins cannot make bookings' });
  
  const { bookingType, itemId, netPrice, markupPercentage, clientFirstName, clientLastName, clientEmail, clientPhone } = req.body;
  const agencyId = req.user.agency_id;
  
  if (!agencyId) return res.status(400).json({ error: 'No agency associated' });

  const agency = queryOne('SELECT current_balance, credit_limit, commission_rate FROM agencies WHERE id = ?', [agencyId]);
  
  // Check credit
  if (agency.current_balance + netPrice > agency.credit_limit) {
    return res.status(402).json({ error: 'Credit limit exceeded. Please top up your agency balance.' });
  }

  // Calculate financials
  const grossPrice = netPrice * (1 + (markupPercentage / 100));
  const commissionEarned = netPrice * (agency.commission_rate / 100);
  const bookingRef = `B2B-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Create booking
  const result = runSql(
    `INSERT INTO bookings (booking_ref, agency_id, agent_id, booking_type, item_id, net_price, markup_percentage, gross_price, commission_earned, client_first_name, client_last_name, client_email, client_phone) 
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [bookingRef, agencyId, req.user.id, bookingType, itemId, netPrice, markupPercentage, grossPrice, commissionEarned, clientFirstName, clientLastName, clientEmail, clientPhone]
  );

  // Update agency balance & ledge
  runSql(`UPDATE agencies SET current_balance = current_balance + ? WHERE id = ?`, [netPrice, agencyId]);
  runSql(`INSERT INTO ledger (agency_id, booking_id, transaction_type, amount, description) VALUES (?,?,?,?,?)`, 
    [agencyId, result.lastInsertRowid, 'booking_charge', netPrice, `Charge for booking ${bookingRef}`]);

  res.status(201).json({ bookingRef, status: 'confirmed', netPrice, grossPrice });
});

app.get('/api/agency/bookings', auth, (req, res) => {
  if (!req.user.agency_id) return res.status(400).json({ error: 'No agency connected' });
  const bookings = queryAll(
    `SELECT b.*, u.first_name as agent_first, u.last_name as agent_last
     FROM bookings b JOIN users u ON b.agent_id = u.id 
     WHERE b.agency_id = ? ORDER BY b.created_at DESC`, 
    [req.user.agency_id]);
  res.json({ bookings });
});

app.get('/api/agency/ledger', auth, agencyAdmin, (req, res) => {
  const ledger = queryAll(`SELECT * FROM ledger WHERE agency_id = ? ORDER BY created_at DESC`, [req.user.agency_id]);
  res.json({ ledger });
});

// SPA Fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

async function start() {
  await initDatabase();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`\n🌍 REHLATI B2B Porta`);
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Super Admin: admin@rehlati.com / password123`);
    console.log(`📊 Agency Admin: manager@skyhigh.com / password123`);
    console.log(`📊 Agent: agent1@skyhigh.com / password123\n`);
  });
}
start().catch(console.error);
