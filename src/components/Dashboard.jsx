import Historico from './Historico';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import Pagamentos from './Pagamentos';
import Perfil from './Perfil';
import LocationsMap from './LocationsMap';
import SaldoCard from './SaldoCard';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'owner') {
      setHasAdminAccess(true);
      return;
    }
    // role normal não revela se a pessoa administra algum local
    // (isso é um vínculo separado) — checamos direto com o backend
    (async () => {
      try {
        await api.get('/api/admin/my-access');
        setHasAdminAccess(true);
      } catch {
        setHasAdminAccess(false);
      }
    })();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-spotnicik-light">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-spotnicik-primary">SpotNICK</h1>
            <p className="text-spotnicik-dark text-sm">Wi-Fi Zone</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-spotnicik-dark">Bem-vindo, {user?.name}!</span>
            {hasAdminAccess && (
              <button
                onClick={() => navigate('/admin')}
                className="px-4 py-2 bg-spotnicik-dark text-white rounded-lg hover:bg-gray-800 transition"
              >
                Admin
              </button>
            )}
                        <button
              onClick={handleLogout}
              className="px-4 py-2 bg-spotnicik-pink text-white rounded-lg hover:bg-red-600 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          <button
            onClick={() => setActiveTab('historico')}
            className={`py-4 px-2 font-medium transition ${
              activeTab === 'historico'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            Histórico
          </button>
                  <button
            onClick={() => setActiveTab('home')}
            className={`py-4 px-2 font-medium transition ${
              activeTab === 'home'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('pagamentos')}
            className={`py-4 px-2 font-medium transition ${
              activeTab === 'pagamentos'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            Comprar
          </button>
          <button
            onClick={() => setActiveTab('perfil')}
            className={`py-4 px-2 font-medium transition ${
              activeTab === 'perfil'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('mapa')}
            className={`py-4 px-2 font-medium transition ${
              activeTab === 'mapa'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            🗺️ Mapa
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card Saldo */}
            <SaldoCard />

            {/* Card Dados */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-spotnicik-cyan">
              <h3 className="text-spotnicik-dark font-semibold text-sm uppercase">Dados</h3>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-spotnicik-dark"><strong>Email:</strong> {user?.email}</p>
                <p className="text-sm text-spotnicik-dark"><strong>Telefone:</strong> {user?.phone || 'N/A'}</p>
              </div>
            </div>

            {/* Card Ação */}
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-spotnicik-pink">
              <h3 className="text-spotnicik-dark font-semibold text-sm uppercase">Ação Rápida</h3>
              <button
                onClick={() => setActiveTab('pagamentos')}
                className="w-full mt-4 bg-spotnicik-pink text-white py-2 rounded-lg font-medium hover:bg-red-600 transition"
              >
                Comprar Plano
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pagamentos' && <Pagamentos />}
        {activeTab === 'perfil' && <Perfil user={user} />}
        {activeTab === 'historico' && <Historico />}
        {activeTab === 'mapa' && <LocationsMap />}
      </main>
    </div>
  );
}
