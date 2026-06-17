import api from './api';

export const authService = {
  // POST /auth/login/ → stores tokens, returns raw token data
  login: async (username, password) => {
    const { data } = await api.post('/auth/login/', { username, password });
    localStorage.setItem('access_token',  data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },

  // POST /auth/logout/ → blacklists refresh token, clears storage
  logout: async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (refresh) {
      try { await api.post('/auth/logout/', { refresh }); } catch { /* ignore */ }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  // GET /auth/user/profile/ → current user object
  getProfile: async () => {
    const { data } = await api.get('/auth/user/profile/');
    // add `name` alias so Sidebar's user.name works without changes
    return { ...data, name: data.username };
  },

  // GET /auth/worker/list/ → only role='worker' users (for Workers page display)
  getUsers: async () => {
    const { data } = await api.get('/auth/worker/list/');
    return data;
  },

  // GET /auth/user/list/ → ALL users regardless of role (Admin/Manager/Officer only).
  // Used to build a complete userMap so alerts/incidents filed by non-workers
  // resolve to real names. Workers receive 403; App.jsx falls back to getUsers().
  getAllUsers: async () => {
    const { data } = await api.get('/auth/user/list/');
    return data;
  },

  isAuthenticated: () => !!localStorage.getItem('access_token'),
};