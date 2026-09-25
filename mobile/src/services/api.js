import { Platform, NativeModules } from 'react-native';

const getDevHost = () => {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1]) return match[1];
    }
  } catch (_) {}
  return Platform.OS === 'android' ? '192.168.29.203' : 'localhost';
};

export const API_BASE_URL = `http://${getDevHost()}:5000`;


async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.warn(`[API Error] ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // ── Authentication ────────────────────────────────────────────────────────
  signup: (userData) =>
    request('/api/users/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  login: (credentials) =>
    request('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  googleAuth: (idToken, userInfo, password, signupType, phone, isPhoneVerified) =>
    request('/api/users/google-auth', {
      method: 'POST',
      body: JSON.stringify({
        idToken,
        userInfo,
        password,
        signupType,
        role: signupType,
        phone,
        isPhoneVerified,
      }),
    }),

  verifyTruecaller: (payload) =>
    request('/api/users/truecaller/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUserRole: (userId, role) =>
    request(`/api/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  updateProfile: (userId, profileData) =>
    request(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  // ── RFQs & Reverse Auctions ───────────────────────────────────────────────
  getRfqs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.buyerId && params.role !== 'SUPPLIER') query.append('buyerId', params.buyerId);
    if (params.role) query.append('role', params.role);
    if (params.supplierId) query.append('supplierId', params.supplierId);
    const qs = query.toString();
    return request(qs ? `/api/rfqs?${qs}` : '/api/rfqs');
  },

  getRfqById: (rfqId, params = {}) => {
    const query = new URLSearchParams();
    if (params.buyerId) query.append('buyerId', params.buyerId);
    if (params.role) query.append('role', params.role);
    const qs = query.toString();
    return request(qs ? `/api/rfqs/${rfqId}?${qs}` : `/api/rfqs/${rfqId}`);
  },

  createRfq: (rfqData) =>
    request('/api/rfqs', {
      method: 'POST',
      body: JSON.stringify(rfqData),
    }),

  closeRfq: (rfqId, buyerId) =>
    request(`/api/rfqs/${rfqId}/close`, {
      method: 'POST',
      body: JSON.stringify({ buyerId }),
    }),

  deleteRfq: (rfqId, buyerId) =>
    request(`/api/rfqs/${rfqId}${buyerId ? `?buyerId=${encodeURIComponent(buyerId)}` : ''}`, {
      method: 'DELETE',
    }),

  // ── Notifications ─────────────────────────────────────────────────────────
  getNotifications: (userId) =>
    request(`/api/notifications?userId=${encodeURIComponent(userId)}`),

  markNotificationRead: (id, userId) =>
    request(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ userId }),
    }),

  // ── Bids ──────────────────────────────────────────────────────────────────
  getBids: (rfqId) => request(`/api/bids/${rfqId}`),

  submitBid: (bidData) =>
    request('/api/bids', {
      method: 'POST',
      body: JSON.stringify(bidData),
    }),

  // ── Buyer Contacts (Private Supplier Network) ──────────────────────────
  getContacts: (buyerId) =>
    request(buyerId ? `/api/contacts?buyerId=${encodeURIComponent(buyerId)}` : '/api/contacts'),

  addContact: (contactData) =>
    request('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(contactData),
    }),

  deleteContact: (id, buyerId) =>
    request(`/api/contacts/${id}${buyerId ? `?buyerId=${encodeURIComponent(buyerId)}` : ''}`, {
      method: 'DELETE',
    }),

  // ── Suppliers & Users ─────────────────────────────────────────────────────
  getSuppliers: (buyerId) =>
    request(buyerId ? `/api/users?role=SUPPLIER&buyerId=${encodeURIComponent(buyerId)}` : '/api/users?role=SUPPLIER'),

  addSupplierFromContact: (supplierData) =>
    request('/api/users/add-supplier', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    }),

  getUserById: (id) => request(`/api/users/${id}`),
};

export default api;
