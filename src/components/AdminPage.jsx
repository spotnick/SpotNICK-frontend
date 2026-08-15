import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import AdminUsers from './AdminUsers';
import AdminLocations from './AdminLocations';
import AdminAccessPoints from './AdminAccessPoints';
import AdminMikrotikRouters from './AdminMikrotikRouters';
import ConsumptionDashboard from './ConsumptionDashboard';
import SmsBalanceCard from './SmsBalanceCard';
import LogExtraction from './LogExtraction';
import Campanhas from './Campanhas';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('locations');

  const [access, setAccess] = useState(null); // { isOwner, locationIds } | null (ainda carregando) | false (sem acesso)
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      try {
        const { data } = await api.get('/api/admin/my-access');
        setAccess(data);
      } catch {
        setAccess(false); // sem acesso admin (backend já barrou)
      } finally {
        setAccessLoading(false);
      }
    })();
  }, [loading, user]);

  if (loading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-spotnicik-light">
        <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isOwner = !!access?.isOwner;
  const isAllowed = !!access; // owner OU location_admin (o backend já validou)

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
            <span className="text-xs bg-spotnicik-dark text-white px-2 py-1 rounded">
              {isOwner ? 'ADMIN' : 'ADMIN DE LOCAL'}
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-spotnicik-cyan hover:underline"
          >
            ← Voltar ao app
          </button>
        </div>
      </header>

      {/* Saldo SMS - visível apenas para o dono */}
      {isOwner && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <SmsBalanceCard />
        </div>
      )}

      {/* Abas do admin */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-8">
          {isOwner && (
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
          )}
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
		  {isOwner && (
            <button
              onClick={() => setTab('logs')}
              className={`py-4 px-2 font-medium transition ${
                tab === 'logs'
                  ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                  : 'text-spotnicik-dark hover:text-spotnicik-primary'
              }`}
            >
              Registros
            </button>
			<button
            onClick={() => setTab('campanhas')}
            className={`py-4 px-2 font-medium transition ${
              tab === 'campanhas'
                ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                : 'text-spotnicik-dark hover:text-spotnicik-primary'
            }`}
          >
            Campanhas
          </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'users' && isOwner && <AdminUsers />}
        {tab === 'locations' && <AdminLocations isOwner={isOwner} />}
        {tab === 'routers' && <AdminMikrotikRouters />}
        {tab === 'aps' && <AdminAccessPoints />}
        {tab === 'consumption' && <ConsumptionDashboard />}
		{tab === 'logs' && isOwner && <LogExtraction />}
		{tab === 'campanhas' && <Campanhas isOwner={isOwner} />}
      </main>
    </div>
  );
}
