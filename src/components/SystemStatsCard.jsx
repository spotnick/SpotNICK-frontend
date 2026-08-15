import { useState, useEffect } from 'react';
import api from '../services/api';

function Stat({ label, value, sub }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
      <p className="text-xl font-bold text-spotnicik-primary mt-0.5">
        {value}
        {sub && <span className="text-xs font-normal text-gray-400 ml-1">{sub}</span>}
      </p>
    </div>
  );
}

export default function SystemStatsCard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/system-stats');
      setStats(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar estatísticas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="inline-flex items-center gap-4 bg-white rounded-lg shadow px-4 py-3">
        <div className="w-5 h-5 border-2 border-spotnicik-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-gray-400">Carregando estatísticas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inline-flex items-center gap-3 bg-white rounded-lg shadow px-4 py-3">
        <span className="text-sm text-red-600">{error}</span>
        <button onClick={loadStats} className="text-xs text-spotnicik-cyan hover:underline">Tentar de novo</button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-white rounded-lg shadow px-5 py-3">
      <Stat label="Usuários" value={stats.total_users} />
      <Stat label="Não verificados" value={stats.unverified_users} />
      <Stat label="Locais" value={stats.total_locations} />
      <Stat label="Roteadores" value={stats.total_routers} sub={`(${stats.routers_online} online)`} />
      <Stat label="Access Points" value={stats.total_access_points} sub={`(${stats.active_access_points} ativos)`} />
      <button
        onClick={loadStats}
        className="text-xs text-spotnicik-cyan hover:underline ml-auto"
      >
        Atualizar
      </button>
    </div>
  );
}
