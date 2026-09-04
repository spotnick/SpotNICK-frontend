import { useState, useEffect } from 'react';
import api from '../services/api';

function toCsv(logs) {
  const headers = ['Usuário', 'Email', 'Local', 'IP Interno', 'MAC', 'IP Público (WAN)', 'Porta Início', 'Porta Fim', 'Conectado em', 'Desconectado em', 'Duração (min)'];
  const rows = logs.map((l) => [
    l.users?.name || '',
    l.users?.email || '',
    l.locations?.name || '',
    l.ip_address || '',
    l.mac_address || '',
    l.wan_ip || '',
    l.wan_port_start || '',
    l.wan_port_end || '',
    l.connected_at || '',
    l.disconnected_at || '',
    l.duration_minutes || '',
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  return csv;
}

export default function LogExtraction({ onOpenHistory }) {
  const [filters, setFilters] = useState({ email: '', ip: '', date_from: '', date_to: '', purpose: '', extraction_type: '', legal_request_id: '' });
  const [tipos, setTipos] = useState([]);
  const [requisicoes, setRequisicoes] = useState([]);

  // Os tipos e a regra de obrigatoriedade vêm do backend, para não
  // duplicar a definição em dois lugares.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/admin/extraction-types');
        setTipos(data.tipos || []);
      } catch { /* o backend valida de qualquer forma */ }
      try {
        // Só requisições aprovadas podem fundamentar uma extração
        const { data } = await api.get('/api/admin/legal-requests', { params: { status: 'approved' } });
        setRequisicoes(data.requests || []);
      } catch { /* o backend valida de qualquer forma */ }
    })();
  }, []);
  const [logs, setLogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.email) params.email = filters.email;
      if (filters.ip) params.ip = filters.ip;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.purpose) params.purpose = filters.purpose;
      params.extraction_type = filters.extraction_type;
      if (filters.legal_request_id) params.legal_request_id = filters.legal_request_id;

      const { data } = await api.get('/api/admin/access-logs/search', { params });
      setLogs(data.logs || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao buscar registros.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!logs || logs.length === 0) return;
    const csv = toCsv(logs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spotnick_registros_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '-');

  // Obrigatoriedade derivada da lista do backend — não replicada aqui
  const finalidadeObrigatoria =
    tipos.find((t) => t.valor === filters.extraction_type)?.finalidade_obrigatoria || false;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary mb-2">Extração de Registros de Conexão</h2>
          <p className="text-xs text-gray-500">
            Toda consulta realizada aqui é registrada automaticamente para fins de auditoria (data, filtros usados, quantidade de resultados).
          </p>
        </div>
        {onOpenHistory && (
          <button
            onClick={onOpenHistory}
            className="text-sm px-3 py-1.5 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light transition whitespace-nowrap"
          >
            Ver histórico de auditoria
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-spotnicik-dark mb-1">E-mail do usuário</label>
            <input
              type="email" name="email" value={filters.email} onChange={handleChange}
              placeholder="usuario@exemplo.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-spotnicik-dark mb-1">IP (interno ou público)</label>
            <input
              type="text" name="ip" value={filters.ip} onChange={handleChange}
              placeholder="10.5.50.37"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-spotnicik-dark mb-1">De</label>
            <input
              type="datetime-local" name="date_from" value={filters.date_from} onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-spotnicik-dark mb-1">Até</label>
            <input
              type="datetime-local" name="date_to" value={filters.date_to} onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
            />
          </div>
        </div>

        {/* Tipo da extração — determina se a finalidade é obrigatória */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-spotnicik-dark mb-1">
            Tipo da extração <span className="text-red-500">*</span>
          </label>
          <select
            name="extraction_type" value={filters.extraction_type} onChange={handleChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
          >
            <option value="">Selecione...</option>
            {tipos.map((t) => (
              <option key={t.valor} value={t.valor}>{t.descricao}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-400 mt-1">
            Fica registrado na auditoria. Extrações destinadas a atender requisição
            externa, investigação ou incidente exigem a declaração da finalidade.
          </p>
        </div>

        {/* Requisição aprovada — obrigatória nos tipos sensíveis (Bloco 7).
            Substitui a finalidade em texto livre: o fundamento passa a ser
            uma requisição registrada, documentada e aprovada. */}
        {finalidadeObrigatoria ? (
          <div className="mb-4">
            <label className="block text-xs font-medium text-spotnicik-dark mb-1">
              Requisição que fundamenta a extração <span className="text-red-500">*</span>
            </label>
            <select
              name="legal_request_id" value={filters.legal_request_id} onChange={handleChange}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary ${
                !filters.legal_request_id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
              }`}
            >
              <option value="">Selecione uma requisição aprovada...</option>
              {requisicoes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.protocol} — {r.requesting_authority}
                  {r.case_number ? ` (${r.case_number})` : ''}
                </option>
              ))}
            </select>
            {requisicoes.length === 0 ? (
              <p className="text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded mt-1">
                Nenhuma requisição aprovada disponível. Registre a requisição, anexe
                o documento e aprove na aba Requisições antes de extrair.
              </p>
            ) : (
              <p className="text-[11px] text-gray-400 mt-1">
                A finalidade registrada na auditoria deriva da requisição selecionada.
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-xs font-medium text-spotnicik-dark mb-1">
              Finalidade da consulta <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text" name="purpose" value={filters.purpose} onChange={handleChange}
              placeholder="Ex: diagnóstico de conexão do local X"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Fica registrada no histórico de auditoria junto com esta consulta.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-spotnicik-primary text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          {logs && logs.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="bg-white border border-spotnicik-primary text-spotnicik-primary px-5 py-2 rounded-lg font-medium hover:bg-spotnicik-light transition"
            >
              Exportar CSV
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {logs && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-5 py-3 border-b text-sm text-gray-500">
            {logs.length} registro{logs.length !== 1 ? 's' : ''} encontrado{logs.length !== 1 ? 's' : ''}
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-spotnicik-light sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Usuário</th>
                  <th className="text-left px-3 py-2">Local</th>
                  <th className="text-left px-3 py-2">IP Interno</th>
                  <th className="text-left px-3 py-2">IP Público</th>
                  <th className="text-left px-3 py-2">Portas</th>
                  <th className="text-left px-3 py-2">Conectado em</th>
                  <th className="text-left px-3 py-2">Duração</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{l.users?.email || '-'}</td>
                    <td className="px-3 py-2">{l.locations?.name || '-'}</td>
                    <td className="px-3 py-2">{l.ip_address || '-'}</td>
                    <td className="px-3 py-2">{l.wan_ip || '-'}</td>
                    <td className="px-3 py-2">
                      {l.wan_port_start ? `${l.wan_port_start}-${l.wan_port_end}` : '-'}
                    </td>
                    <td className="px-3 py-2">{formatDate(l.connected_at)}</td>
                    <td className="px-3 py-2">{l.duration_minutes ? `${l.duration_minutes} min` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
