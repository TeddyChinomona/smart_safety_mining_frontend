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
      try { await api.post('/auth/logout/', { refresh }); } catch {}
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

  // GET /auth/worker/list/ → all workers
  getUsers: async () => {
    const { data } = await api.get('/auth/worker/list/');
    return data;
  },

  isAuthenticated: () => !!localStorage.getItem('access_token'),
};
