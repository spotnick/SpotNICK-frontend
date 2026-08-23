import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    // Impede o recarregamento da página, que apagaria a mensagem de erro
    if (e?.preventDefault) e.preventDefault();

    if (!form.email.trim() || !form.password) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/api/auth/admin-login', {
        email: form.email.trim(),
        password: form.password,
      });

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível entrar. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-spotnicik-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">SpotNICK</h1>
          <p className="text-spotnicik-cyan text-sm mt-1">Painel Administrativo</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-700 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-spotnicik-dark mb-1">E-mail</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                autoComplete="username"
                autoFocus
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-spotnicik-dark mb-1">Senha</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                autoComplete="current-password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-spotnicik-primary text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-gray-500">
              Acesso restrito a administradores.
            </p>
            <Link to="/login" className="text-xs text-spotnicik-cyan hover:underline mt-1 inline-block">
              É usuário do Wi-Fi? Entre por aqui
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
