// Global State
let currentUser = null;
let currentAgency = null;
let bookingItem = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  await restoreSession();
  setupNavigation();
  handleRoute();
});

async function restoreSession() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const { user, agency } = await API.getMe();
      currentUser = user;
      currentAgency = agency;
      updateAuthUI();
    } catch (e) {
      console.warn('Session expired');
      localStorage.removeItem('token');
    }
  }
}

// Router
function handleRoute() {
  const hash = window.location.hash || '#/';
  const content = document.getElementById('main-content');
  const path = hash.split('?')[0];

  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-links a[href="${path}"]`);
  if (activeLink) activeLink.classList.add('active');

  switch (path) {
    case '#/': renderHome(content); break;
    case '#/flights': renderFlights(content); break;
    case '#/hotels': renderHotels(content); break;
    case '#/dashboard': renderDashboard(content); break;
    case '#/bookings': renderMyBookings(content); break;
    case '#/ledger': renderLedger(content); break;
    case '#/profile': renderProfile(content); break;
    default: content.innerHTML = '<div class="section"><div class="empty-state"><h3>404 - Page Not Found</h3></div></div>';
  }
}

function setupNavigation() {
  window.addEventListener('hashchange', handleRoute);
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
      const dropdown = document.querySelector('.user-dropdown');
      if (dropdown) dropdown.classList.remove('active');
    }
  });
}

// Auth UI
function updateAuthUI() {
  const authLinks = document.getElementById('auth-links');
  const userMenu = document.getElementById('user-menu');
  
  if (currentUser) {
    authLinks.style.display = 'none';
    userMenu.style.display = 'block';
    document.getElementById('user-name-display').textContent = `Agent ${currentUser.firstName}`;
    
    // Build dropdown B2B specific
    const dropdown = document.getElementById('user-dropdown-content');
    dropdown.innerHTML = `
      <div style="padding:12px;border-bottom:1px solid var(--border-subtle);margin-bottom:8px">
        <div style="font-weight:600">${currentUser.firstName} ${currentUser.lastName}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${currentAgency ? currentAgency.company_name : 'No Agency'} (${currentUser.role})</div>
      </div>
      <a href="#/dashboard"><i class="fas fa-home"></i> Agency Portal</a>
      <a href="#/bookings"><i class="fas fa-suitcase"></i> My Bookings</a>
      ${currentUser.role === 'agency_admin' ? '<a href="#/ledger"><i class="fas fa-file-invoice"></i> Ledger</a>' : ''}
      <a href="#" onclick="logout(); return false;" style="color:var(--danger)"><i class="fas fa-sign-out-alt"></i> Sign Out</a>
    `;
  } else {
    authLinks.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}

// Auth Modal
function showAuthModal(type) {
  const modal = document.getElementById('auth-modal');
  modal.classList.add('active');
  const title = document.getElementById('auth-title');
  const body = document.getElementById('auth-body');

  if (type === 'login') {
    title.innerHTML = 'Agent Login';
    body.innerHTML = `
      <form id="login-form" onsubmit="handleLogin(event)">
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="login-email" required placeholder="agent@agency.com" value="manager@skyhigh.com">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="login-password" required value="password123">
        </div>
        <button type="submit" class="btn btn-primary btn-block">Sign In</button>
      </form>
    `;
  }
}

function closeModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.classList.add('loading');
  try {
    const data = await API.login(
      document.getElementById('login-email').value,
      document.getElementById('login-password').value
    );
    localStorage.setItem('token', data.token);
    currentUser = data.user;
    currentAgency = data.agency;
    updateAuthUI();
    closeModals();
    showToast('Success', 'Logged in to B2B Portal successfully');
    if (window.location.hash === '#/') window.location.hash = '#/dashboard';
    else handleRoute();
  } catch (err) {
    showToast('Login Failed', err.message, 'error');
  } finally {
    btn.classList.remove('loading');
  }
}

function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  currentAgency = null;
  updateAuthUI();
  window.location.hash = '#/';
  showToast('Logged Out', 'You have been signed out.');
}

// B2B Booking Flow
function initiateBooking(type, id, name, netPrice) {
  if (!currentUser) {
    showAuthModal('login');
    showToast('Agent Login Required', 'Please login to book inventory for clients', 'info');
    return;
  }
  
  if (!currentAgency) {
    showToast('Error', 'Your account is not linked to an active agency. Cannot book.', 'error');
    return;
  }

  bookingItem = { type, id, name, netPrice };
  const modal = document.getElementById('booking-modal');
  modal.classList.add('active');
  
  const body = document.getElementById('booking-modal-body');
  body.innerHTML = `
    <div style="background:var(--bg-input);padding:16px;border-radius:12px;margin-bottom:24px">
      <h3 style="margin-bottom:8px">${name}</h3>
      <div style="display:flex;justify-content:space-between;color:var(--text-secondary);font-size:0.9rem">
        <span>NET Price:</span>
        <span style="font-weight:700;color:var(--accent)">${formatPrice(netPrice)}</span>
      </div>
    </div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="form-group">
        <label>Client First Name *</label>
        <input type="text" id="b-first" required>
      </div>
      <div class="form-group">
        <label>Client Last Name *</label>
        <input type="text" id="b-last" required>
      </div>
    </div>
    <div class="form-group">
      <label>Client Email</label>
      <input type="email" id="b-email">
    </div>
    
    <div class="form-group" style="margin-top:24px;border-top:1px solid var(--border-subtle);padding-top:16px">
      <label>Markup Percentage (%) *</label>
      <input type="number" id="b-markup" value="10" min="0" max="100" step="1" oninput="updatePricingPreview()">
    </div>
    
    <div id="pricing-preview" style="background:#0a0a0a;padding:16px;border-radius:8px;font-family:monospace;margin-bottom:24px">
      <!-- Calculated dynamically -->
    </div>
    
    <button class="btn btn-primary btn-block" onclick="processBooking(this)">Confirm Booking (Charge Agency Balance)</button>
  `;
  updatePricingPreview();
}

function updatePricingPreview() {
  const markup = parseFloat(document.getElementById('b-markup').value) || 0;
  const net = bookingItem.netPrice;
  const gross = net * (1 + markup/100);
  const profit = gross - net + (net * (currentAgency.commission_rate/100)); // Total earnings
  
  document.getElementById('pricing-preview').innerHTML = `
    <div style="display:flex;justify-content:space-between"><span>NET Price (Charge to Agency):</span> <span>${formatPrice(net)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Markup (${markup}%):</span> <span>+${formatPrice(gross-net)}</span></div>
    <div style="display:flex;justify-content:space-between;border-top:1px dashed #333;margin-top:8px;padding-top:8px">
      <span>GROSS (Sell to Client):</span> <span style="color:var(--success);font-weight:bold">${formatPrice(gross)}</span>
    </div>
    <div style="margin-top:8px;font-size:0.8rem;color:var(--accent)">* You will also earn ${currentAgency.commission_rate}% base commission on the NET price (${formatPrice(net*(currentAgency.commission_rate/100))})</div>
  `;
}

async function processBooking(btn) {
  const first = document.getElementById('b-first').value;
  const last = document.getElementById('b-last').value;
  const email = document.getElementById('b-email').value;
  const markup = parseFloat(document.getElementById('b-markup').value) || 0;

  if (!first || !last) return showToast('Error', 'Client name is required', 'error');

  btn.classList.add('loading');
  try {
    const res = await API.createBooking({
      bookingType: bookingItem.type,
      itemId: bookingItem.id,
      netPrice: bookingItem.netPrice,
      markupPercentage: markup,
      clientFirstName: first,
      clientLastName: last,
      clientEmail: email
    });
    
    // Deduct local state memory
    currentAgency.current_balance += bookingItem.netPrice;
    
    closeModals();
    showToast('Booking Confirmed', `Ref: ${res.bookingRef}. Net charged to agency.`, 'success');
  } catch (err) {
    showToast('Booking Failed', err.message, 'error');
  } finally {
    btn.classList.remove('loading');
  }
}

// Utils
function formatPrice(num) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
}
function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function showToast(title, message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-message">${message}</div>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; setTimeout(() => toast.remove(), 300); }, 4000);
}
function toggleDropdown() {
  document.querySelector('.user-dropdown').classList.toggle('active');
}
