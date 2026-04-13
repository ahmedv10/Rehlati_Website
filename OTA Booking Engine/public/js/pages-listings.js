// ============================================================
// HOTELS PAGE
// ============================================================
async function renderHotels(el) {
  el.innerHTML = `
    <div class="page-header">
      <h1><i class="fas fa-hotel"></i> Global Hotel Inventory</h1>
      <p>Luxury accommodations at wholesale NET rates</p>
    </div>
    <div class="section">
      <div class="grid" id="hotels-grid"><p style="color:var(--text-muted)">Loading inventory...</p></div>
    </div>
  `;
  try {
    const { hotels } = await API.getHotels();
    const grid = document.getElementById('hotels-grid');
    
    if (!hotels.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-hotel"></i><h3>No hotels found</h3></div>';
      return;
    }
    
    grid.innerHTML = hotels.map(h => `
      <div class="card">
        <div style="height:200px;background:linear-gradient(45deg, #1a1a1a, #2a2a2a);display:flex;align-items:center;justify-content:center;position:relative">
          <i class="fas fa-hotel" style="font-size:3rem;color:var(--accent);opacity:0.5"></i>
          <div style="position:absolute;bottom:10px;left:10px;background:rgba(0,0,0,0.7);color:var(--accent);padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.8rem">
             <i class="fas fa-star"></i> ${h.rating}
          </div>
        </div>
        <div class="card-content">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <h3 style="margin:0;font-size:1.2rem">${h.name}</h3>
          </div>
          <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:16px"><i class="fas fa-map-marker-alt"></i> ${h.city}</p>
          <div style="display:flex;justify-content:space-between;align-items:flex-end">
            <div>
              <div style="font-size:0.75rem;color:var(--text-muted)">NET Rate from</div>
              <div style="font-size:1.5rem;font-weight:700;color:var(--success)">${formatPrice(h.price_net_from)}<span style="font-size:0.8rem;color:var(--text-muted);font-weight:400">/night</span></div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="initiateBooking('hotel', ${h.id}, '${h.name} (${h.city})', ${h.price_net_from})">Book Room</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    document.getElementById('hotels-grid').innerHTML = `<p style="color:var(--danger)">${err.message}</p>`;
  }
}
