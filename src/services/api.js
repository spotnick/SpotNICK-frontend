import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token nos headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Rotas de AUTENTICAÇÃO: um 401 aqui significa "credenciais inválidas",
// não "sessão expirada". Elas tratam o próprio erro e mostram a mensagem
// na tela — o interceptador não deve tentar renovar token nem redirecionar,
// senão o recarregamento apaga a mensagem antes da pessoa conseguir ler.
const AUTH_ROUTES = [
  '/api/portal/login',
  '/api/auth/login',
  '/api/auth/admin-login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/verify-email',
  '/api/auth/verify-sms',
  '/api/auth/request-password-reset',
  '/api/auth/reset-password',
];

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url || '';
    const isAuthRoute = AUTH_ROUTES.some((route) => url.includes(route));

    if (error.response?.status === 401 && !isAuthRoute) {
      // Sessão expirada durante o uso — tenta renovar
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('sem refresh token');

        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        });
        localStorage.setItem('accessToken', data.accessToken);
        return api(error.config);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');

        // Manda cada perfil para a sua própria tela de entrada
        const isAdminArea = window.location.pathname.startsWith('/admin');
        window.location.href = isAdminArea ? '/admin/login' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
