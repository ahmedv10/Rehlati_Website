const API_URL = '/api';

const API = {
  headers: () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }),

  async get(endpoint) {
    const res = await fetch(`${API_URL}${endpoint}`, { headers: this.headers() });
    if (!res.ok) {
      if (res.status === 401) localStorage.removeItem('token');
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },

  async post(endpoint, data) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },
  
  async p_put(endpoint, data) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },

  // Auth
  login: (email, password) => API.post('/auth/login', { email, password }),
  getMe: () => API.get('/auth/me'),

  // Inventory
  getFlights: (params = '') => API.get(`/flights?${params}`),
  getHotels: () => API.get('/hotels'),

  // Bookings
  createBooking: (data) => API.post('/bookings', data),
  getAgencyBookings: () => API.get('/agency/bookings'),
  getAgencyLedger: () => API.get('/agency/ledger')
};
