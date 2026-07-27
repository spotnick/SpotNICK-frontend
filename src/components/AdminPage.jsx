import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AdminUsers from './AdminUsers';
import AdminLocations from './AdminLocations';
import AdminAccessPoints from './AdminAccessPoints';
import AdminMikrotikRouters from './AdminMikrotikRouters';
import ConsumptionDashboard from './ConsumptionDashboard';
import SmsBalanceCard from './SmsBalanceCard';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-spotnicik-light">
        <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isOwner = user && user.role === 'owner';
  const isAllowed = isOwner; // por enquanto só owner; location_admin liberamos depois

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-spotnicik-light px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-spotnicik-dark mb-2">Acesso restrito</h1>
          <p className="text-gray-600 mb-6">Esta área é exclusiva para administradores.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-spotnicik-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotnicik-light">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-spotnicik-primary">SpotNICK</h1>
            <span className="text-xs bg-spotnicik-dark text-white px-2 py-1 rounded">ADMIN</span>
          </div>
      {isOwner && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <SmsBalanceCard />
        </div>
      )}
		  
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-spotnicik-cyan hover:underline"
          >
            ← Voltar ao app
          </button>
        </div>
      </header>

      {/* Abas do admin */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          <button
            onClick={() => setTab('users')}
            className={`py-4 px-2 font-medium transition ${
              tab === 'users'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            Usuários
          </button>
          <button
            onClick={() => setTab('locations')}
            className={`py-4 px-2 font-medium transition ${
              tab === 'locations'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            Locais
          </button>
		  <button
            onClick={() => setTab('routers')}
            className={`py-4 px-2 font-medium transition ${
              tab === 'routers'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            Roteadores
          </button>
		  <button
            onClick={() => setTab('aps')}
            className={`py-4 px-2 font-medium transition ${
              tab === 'aps'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            Access Points
          </button>
		  <button
            onClick={() => setTab('consumption')}
            className={`py-4 px-2 font-medium transition ${
              tab === 'consumption'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            Consumo
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'users' && <AdminUsers />}
        {tab === 'locations' && <AdminLocations isOwner={isOwner} />}
        {tab === 'routers' && <AdminMikrotikRouters />}
		{tab === 'aps' && <AdminAccessPoints />}
        {tab === 'consumption' && <ConsumptionDashboard />}
      </main>
    </div>
  );
}
