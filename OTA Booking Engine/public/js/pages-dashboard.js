// ============================================================
// B2B AGENCY DASHBOARD
// ============================================================
async function renderDashboard(el) {
  if (!currentUser) { showAuthModal('login'); el.innerHTML = ''; return; }
  
  if (!currentUser.agency_id) {
    el.innerHTML = '<div class="empty-state"><h3>No Agency Connected</h3><p>Please contact support to link your agent account to a B2B Agency.</p></div>';
    return;
  }

  el.innerHTML = `
    <div class="dashboard">
      <div class="dash-header">
        <div>
          <h1>B2B Portal - <span style="color:var(--accent)">${currentAgency ? currentAgency.company_name : 'Loading...'}</span></h1>
          <p style="color:var(--text-secondary)">Manage your clients, bookings, and agency balance</p>
        </div>
        <div style="display:flex;gap:8px">
          <a href="#/bookings" class="btn btn-outline btn-sm"><i class="fas fa-suitcase"></i> Agency Bookings</a>
          ${currentUser.role === 'agency_admin' ? '<a href="#/ledger" class="btn btn-primary btn-sm"><i class="fas fa-file-invoice-dollar"></i> Ledger</a>' : ''}
        </div>
      </div>
      <div class="dash-metrics" id="dash-metrics">
        <div class="metric-card"><div class="metric-icon gold"><i class="fas fa-wallet"></i></div><div class="metric-value">${currentAgency ? formatPrice(currentAgency.credit_limit - currentAgency.current_balance) : '...'}</div><div class="metric-label">Available Credit</div></div>
        <div class="metric-card"><div class="metric-icon blue"><i class="fas fa-chart-line"></i></div><div class="metric-value">${currentAgency ? formatPrice(currentAgency.current_balance) : '...'}</div><div class="metric-label">Total Outstanding</div></div>
        <div class="metric-card"><div class="metric-icon green"><i class="fas fa-percent"></i></div><div class="metric-value">${currentAgency ? currentAgency.commission_rate + '%' : '...'}</div><div class="metric-label">Commission Rate</div></div>
      </div>
      <h2 style="font-family:var(--font-display);margin-bottom:16px">Recent Agency Bookings</h2>
      <div class="table-container"><table class="data-table"><thead><tr><th>Ref</th><th>Type</th><th>Client</th><th>Gross (Sell)</th><th>Net (Buy)</th><th>Commission</th><th>Status</th><th>Date</th></tr></thead><tbody id="dash-bookings"><tr><td colspan="8" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table></div>
    </div>`;

  try {
    const { bookings } = await API.getAgencyBookings();
    const tbody = document.getElementById('dash-bookings');
    tbody.innerHTML = bookings.length ? bookings.slice(0, 10).map(b => `
      <tr>
        <td><strong>${b.booking_ref}</strong><br><span style="font-size:0.7rem;color:var(--text-muted)">Agent: ${b.agent_first}</span></td>
        <td><span style="text-transform:capitalize">${b.booking_type}</span></td>
        <td>${b.client_first_name} ${b.client_last_name}</td>
        <td style="font-weight:700;color:var(--success)">${formatPrice(b.gross_price)}</td>
        <td style="color:var(--danger)">${formatPrice(b.net_price)}</td>
        <td style="color:var(--accent);font-weight:700">${formatPrice(b.commission_earned)}</td>
        <td><span class="status-badge ${b.status}">${b.status}</span></td>
        <td>${formatDate(b.created_at)}</td>
      </tr>
    `).join('') : '<tr><td colspan="8" class="empty-state">No bookings yet. Look for inventory to book!</td></tr>';
  } catch (err) {
    document.getElementById('dash-bookings').innerHTML = `<tr><td colspan="8" style="color:var(--danger)">${err.message}</td></tr>`;
  }
}

// ============================================================
// ALL BOOKINGS PAGE
// ============================================================
async function renderMyBookings(el) {
  if (!currentUser) { showAuthModal('login'); el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="page-header"><h1><i class="fas fa-suitcase"></i> Agency Bookings</h1><p>Full history of your agency's reservations</p></div>
    <div class="section">
      <div class="table-container"><table class="data-table"><thead><tr><th>Ref</th><th>Type</th><th>Client</th><th>Gross</th><th>Net</th><th>Profit</th><th>Date</th></tr></thead><tbody id="bookings-tbody"><tr><td colspan="7" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table></div>
    </div>`;
  try {
    const { bookings } = await API.getAgencyBookings();
    const tbody = document.getElementById('bookings-tbody');
    tbody.innerHTML = bookings.length ? bookings.map(b => `
      <tr>
        <td><strong>${b.booking_ref}</strong></td>
        <td><i class="fas fa-${b.booking_type==='flight'?'plane':b.booking_type==='hotel'?'hotel':'suitcase'}" style="color:var(--accent)"></i> ${b.booking_type}</td>
        <td>${b.client_first_name} ${b.client_last_name}</td>
        <td style="font-weight:700;color:var(--success)">${formatPrice(b.gross_price)}</td>
        <td>${formatPrice(b.net_price)}</td>
        <td style="color:var(--accent);font-weight:700">${formatPrice(b.commission_earned)}</td>
        <td>${formatDate(b.created_at)}</td>
      </tr>
    `).join('') : '<tr><td colspan="7"><div class="empty-state"><h3>No bookings yet</h3></div></td></tr>';
  } catch {}
}

// ============================================================
// LEDGER PAGE (ADMIN)
// ============================================================
async function renderLedger(el) {
  if (!currentUser || currentUser.role !== 'agency_admin') {
    el.innerHTML = '<div class="empty-state"><h3>Access Denied</h3><p>Agency Admin privileges required.</p></div>';
    return;
  }
  el.innerHTML = `
    <div class="page-header"><h1><i class="fas fa-file-invoice-dollar"></i> Agency Ledger</h1><p>Billing and credit history</p></div>
    <div class="section">
      <div class="table-container"><table class="data-table"><thead><tr><th>ID</th><th>Type</th><th>Amount</th><th>Description</th><th>Date</th></tr></thead><tbody id="ledger-tbody"><tr><td colspan="5" style="text-align:center;color:var(--text-muted)">Loading...</td></tr></tbody></table></div>
    </div>
  `;
  try {
    const { ledger } = await API.getAgencyLedger();
    const tbody = document.getElementById('ledger-tbody');
    tbody.innerHTML = ledger.length ? ledger.map(l => `
      <tr>
        <td>${l.id}</td>
        <td><span class="status-badge ${l.transaction_type === 'deposit' ? 'confirmed' : 'pending'}">${l.transaction_type}</span></td>
        <td style="font-weight:700;${l.transaction_type === 'booking_charge' ? 'color:var(--danger)' : 'color:var(--success)'}">
          ${l.transaction_type === 'booking_charge' ? '-' : '+'}${formatPrice(l.amount)}
        </td>
        <td>${l.description}</td>
        <td>${formatDate(l.created_at)}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" class="empty-state">No transaction history</td></tr>';
  } catch {}
}

function renderProfile(el) {
    if (!currentUser) return;
    el.innerHTML = `<div class="empty-state"><h3>Agent Profile</h3><p>${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})</p></div>`;
}
function renderAdmin(el) {
    el.innerHTML = `<div class="empty-state"><h3>Super Admin Panel (WIP)</h3></div>`;
}
