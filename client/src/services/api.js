const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const getHeaders = (token, includeJson = true) => {
  const headers = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const request = async (endpoint, options = {}, token) => {
  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...getHeaders(token, options.body !== undefined),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to connect to RuralConnect. Check that the API server is running, then try again.');
    }
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if ([502, 503, 504].includes(response.status)) {
    throw new Error('RuralConnect API is temporarily unavailable. Start or restart the API server, then try again.');
  }
  if (!response.ok) {
    const error = new Error(data.message || 'Request failed');
    error.paymentStatus = data.paymentStatus;
    throw error;
  }

  return data;
};

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: (token) => request('/auth/me', {}, token),
  getProducts: (token) => request('/products', {}, token),
  getMyProducts: (token) => request('/products/mine', {}, token),
  createProduct: (payload, token) => request('/products', { method: 'POST', body: JSON.stringify(payload) }, token),
  updateProduct: (id, payload, token) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token),
  deleteProduct: (id, token) => request(`/products/${id}`, { method: 'DELETE' }, token),
  getDashboardData: (token) => request('/analytics/dashboard', {}, token),
  getInventory: (token) => request('/inventory', {}, token),
  adjustInventory: (payload, token) => request('/inventory/adjust', { method: 'POST', body: JSON.stringify(payload) }, token),
  createOrder: (payload, token) => request('/orders', { method: 'POST', body: JSON.stringify(payload) }, token),
  getOrders: (token) => request('/orders', {}, token),
  updateOrderStatus: (id, status, token) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token),
  getSupport: (token) => request('/support', {}, token),
  postSupportMessage: (payload, token) => request('/support/message', { method: 'POST', body: JSON.stringify(payload) }, token),
  createSupportConversation: (payload, token) => request('/support', { method: 'POST', body: JSON.stringify(payload) }, token),
  getNotifications: (token) => request('/notifications', {}, token),
};
