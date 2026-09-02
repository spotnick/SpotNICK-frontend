import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Rótulos legíveis para os filtros gravados na auditoria.
// A exibição é traduzida; o conteúdo armazenado não é alterado.
const FILTER_LABEL = {
  email: 'E-mail',
  ip: 'IP',
  location_id: 'Local',
  date_from: 'De',
  date_to: 'Até',
};

function formatFilterValue(key, value) {
  if (value === null || value === undefined || value === '') return null;
  if (key === 'date_from' || key === 'date_to') {
    const d = new Date(value);
    return isNaN(d) ? String(value) : d.toLocaleString('pt-BR');
  }
  return String(value);
}

// Converte o objeto de filtros em pares legíveis, omitindo os vazios
function readableFilters(filters) {
  if (!filters || typeof filters !== 'object') return [];
  return Object.entries(filters)
    .map(([k, v]) => [FILTER_LABEL[k] || k, formatFilterValue(k, v)])
    .filter(([, v]) => v !== null);
}

export default function AuditHistory({ onBack }) {
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/log-extractions');
      setExtractions(data.extractions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar o histórico de auditoria.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const formatDateTime = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '—');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary mb-2">
            Histórico de Auditoria
          </h2>
          <p className="text-xs text-gray-500">
            Registro de todas as consultas realizadas aos registros de conexão.
            Cada linha identifica o <strong>administrador responsável</strong> pela extração —
            não os usuários cujos dados foram consultados.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={load}
            disabled={loading}
            className="text-sm px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm px-3 py-1.5 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 transition whitespace-nowrap"
            >
              ← Voltar à extração
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading && extractions.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : extractions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
          Nenhuma extração registrada.
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-gray-500">
              {extractions.length} extração(ões) registrada(s)
            </p>
            {extractions.length >= 200 && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1 rounded-lg">
                Exibindo as 200 mais recentes
              </p>
            )}
          </div>

          <div className="space-y-3">
            {extractions.map((e) => {
              const filtros = readableFilters(e.filters);
              return (
                <div key={e.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                    {/* Responsável pela extração — destacado */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[11px] uppercase tracking-wide text-gray-400">
                          Responsável
                        </span>
                        <span className="font-semibold text-spotnicik-dark">
                          {e.actor_name || '—'}
                        </span>
                        {e.actor_email && (
                          <span className="text-xs text-gray-500">{e.actor_email}</span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>{formatDateTime(e.extracted_at)}</span>
                        <span>
                          <strong className="text-spotnicik-primary">{e.row_count ?? 0}</strong>
                          {' '}registro(s) retornado(s)
                        </span>
                        {e.ip_address && <span>Origem: {e.ip_address}</span>}
                      </div>

                      {/* Filtros utilizados */}
                      <div className="mt-2">
                        {filtros.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">
                            Sem filtros — consulta ampla
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {filtros.map(([label, value]) => (
                              <span
                                key={label}
                                className="text-[11px] bg-spotnicik-light text-spotnicik-dark px-2 py-0.5 rounded-full"
                              >
                                {label}: {value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Finalidade */}
                    <div className="md:max-w-xs md:text-right shrink-0">
                      <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-0.5">
                        Finalidade
                      </p>
                      {e.purpose ? (
                        <p className="text-sm text-spotnicik-dark break-words">{e.purpose}</p>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Não informada</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
