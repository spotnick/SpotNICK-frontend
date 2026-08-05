import { useState, useEffect } from 'react';
import api from '../services/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data.user);
    } catch (err) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const { data } = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao fazer login';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (name, email, phone, cpf, password, verification_method, termsAccepted, marketingConsent) => {
    try {
      setError(null);
      const { data } = await api.post('/api/auth/register', {
        name,
        email,
        phone,
        cpf,
        password,
        verification_method,
        terms_accepted: termsAccepted,
        marketing_consent: marketingConsent,
      });
      return { success: true, data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erro ao registrar';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/api/auth/logout', { refreshToken });
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };
}
