// ============================================================
// HOME & FLIGHTS PAGE
// ============================================================
function renderHome(el) {
  el.innerHTML = `
    <div class="hero">
      <div class="hero-content">
        <div class="badge"><i class="fas fa-gem"></i> #1 Global B2B Travel Platform</div>
        <h1 class="hero-title">Empower Your Travel Agency With Exclusive NET Rates</h1>
        <p class="hero-subtitle">Access global inventory of flights, hotels, and experiences with industry-leading B2B commissions and real-time ledger management.</p>
        
        <div class="search-widget">
          <div class="search-tabs">
            <div class="search-tab active"><i class="fas fa-plane"></i> Flights</div>
            <div class="search-tab" onclick="window.location.hash='#/hotels'"><i class="fas fa-hotel"></i> Hotels</div>
          </div>
          <form class="search-form" onsubmit="window.location.hash='#/flights?o='+document.getElementById('from').value+'&d='+document.getElementById('to').value; return false;">
            <div class="search-inputs">
              <div class="input-group"><label>FROM</label><input type="text" id="from" placeholder="City or airport" required></div>
              <div class="input-group"><label>TO</label><input type="text" id="to" placeholder="City or airport" required></div>
            </div>
            <button class="btn btn-primary btn-search"><i class="fas fa-search"></i> Search Inventory</button>
          </form>
        </div>
      </div>
    </div>
    
    <div class="section stats-section">
      <div class="stat-item"><div class="stat-value">5,000+</div><div class="stat-label">Agencies Enrolled</div></div>
      <div class="stat-item"><div class="stat-value">Up to 15%</div><div class="stat-label">Commissions</div></div>
      <div class="stat-item"><div class="stat-value">Zero</div><div class="stat-label">Markup Restrictions</div></div>
    </div>`;
}

async function renderFlights(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1><i class="fas fa-plane"></i> Global Flight Inventory</h1>
      <p>Search B2B Net Fares</p>
    </div>
    <div class="section">
      <div id="flights-container"><p style="color:var(--text-muted)">Loading inventory...</p></div>
    </div>
  `;
  try {
    const { flights } = await API.getFlights(window.location.hash.split('?')[1] || '');
    const container = document.getElementById('flights-container');
    
    if (!flights.length) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-plane-slash"></i><h3>No flights found</h3><p>Try adjusting your search criteria</p></div>';
      return;
    }
    
    container.innerHTML = `<p style="margin-bottom:16px;color:var(--text-muted)">${flights.length} flights found</p>` + 
      flights.map(f => `
      <div class="flight-card">
        <div class="flight-route">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
            <div style="font-size:1.5rem">${f.airline_logo}</div>
            <div><div style="font-weight:600">${f.airline_name}</div><div style="font-size:0.75rem;color:var(--text-muted)">${f.flight_number}</div></div>
          </div>
        </div>
        <div class="flight-time">
          <div class="time-block"><div class="time">${f.departure_time.split(' ')[1]}</div><div class="airport">${f.origin_code}</div></div>
          <div class="duration"><div style="font-size:0.75rem;margin-bottom:4px">${Math.floor(f.duration_minutes/60)}h ${f.duration_minutes%60}m</div><div style="height:1px;background:var(--border-subtle);width:100%;position:relative"><i class="fas fa-plane" style="position:absolute;top:-6px;left:50%;transform:translateX(-50%);color:var(--accent);font-size:0.75rem"></i></div></div>
          <div class="time-block"><div class="time">${f.arrival_time.split(' ')[1]}</div><div class="airport">${f.dest_code}</div></div>
        </div>
        <div class="flight-price">
          <div style="font-size:0.75rem;color:var(--text-muted)">NET Fare</div>
          <div class="amount">${formatPrice(f.price_net)}</div>
          <button class="btn btn-primary btn-sm" style="margin-top:8px;width:100%" onclick="initiateBooking('flight', ${f.id}, 'Flight ${f.flight_number} ${f.origin_code}-${f.dest_code}', ${f.price_net})">Book for Client</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('flights-container').innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Error loading flights</h3><p>${err.message}</p></div>`;
  }
}
