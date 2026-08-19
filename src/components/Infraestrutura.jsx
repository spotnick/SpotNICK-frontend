import { useState, useEffect } from 'react';
import api from '../services/api';

function ServiceCard({ title, status, children }) {
  const statusColor = status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  const statusLabel = status === 'ok' ? 'Operacional' : 'Erro';
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-spotnicik-dark">{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ percent }) {
  const color = percent > 85 ? 'bg-red-500' : percent > 60 ? 'bg-yellow-500' : 'bg-spotnicik-primary';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

export default function Infraestrutura() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/infra-status');
      setData(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary">Infraestrutura</h2>
          <p className="text-xs text-gray-500 mt-1">Monitoramento dos serviços que sustentam o SpotNICK.</p>
        </div>
        <button onClick={load} disabled={loading} className="text-sm text-spotnicik-cyan hover:underline disabled:opacity-50">
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading && !data ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supabase */}
          <ServiceCard title="Supabase (Banco de Dados)" status={data.supabase?.status}>
            {data.supabase?.status === 'ok' ? (
              <>
                <p className="text-2xl font-bold text-spotnicik-dark">
                  {data.supabase.used_mb} <span className="text-sm font-normal text-gray-400">MB de {data.supabase.limit_mb} MB</span>
                </p>
                <ProgressBar percent={data.supabase.percent} />
                <p className="text-xs text-gray-400 mt-1">{data.supabase.percent}% utilizado</p>
              </>
            ) : (
              <p className="text-sm text-red-600">{data.supabase?.error}</p>
            )}
          </ServiceCard>

          {/* SMS */}
          <ServiceCard title="GTI SMS" status={data.sms?.status}>
            {data.sms?.status === 'ok' ? (
              <>
                <p className="text-2xl font-bold text-spotnicik-dark">
                  {data.sms.saldo ?? '—'} <span className="text-sm font-normal text-gray-400">créditos</span>
                </p>
                {data.sms.expira_em && (
                  <p className="text-xs text-gray-400 mt-1">Expira em {data.sms.expira_em}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-red-600">{data.sms?.error}</p>
            )}
          </ServiceCard>

          {/* Placeholders da Fase 2 */}
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-5 flex items-center justify-center">
            <p className="text-sm text-gray-400 text-center">Railway (deploy/uso)<br />— em breve —</p>
          </div>
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-5 flex items-center justify-center">
            <p className="text-sm text-gray-400 text-center">GitHub (commits/CI)<br />— em breve —</p>
          </div>
        </div>
      )}
    </div>
  );
}
