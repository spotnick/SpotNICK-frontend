import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const STATUS_INFO = {
  received:  { label: 'Recebida',   cls: 'bg-gray-100 text-gray-700' },
  scheduled: { label: 'Agendada',   cls: 'bg-blue-100 text-blue-700' },
  blocked:   { label: 'Aguardando', cls: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Concluída',  cls: 'bg-green-100 text-green-700' },
  rejected:  { label: 'Recusada',   cls: 'bg-red-100 text-red-700' },
};

const TIPO_LABEL = {
  eliminacao: 'Eliminação de dados',
  acesso: 'Acesso aos dados',
  correcao: 'Correção',
  informacao: 'Informação',
  portabilidade: 'Portabilidade',
};

const fmtData = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—');
const fmtDataHora = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '—');

// Dias restantes até o prazo de resposta. Negativo = vencido.
function diasRestantes(prazo) {
  if (!prazo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(prazo + 'T12:00:00');
  return Math.round((d - hoje) / 86400000);
}

export default function DataSubjectRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [detalhe, setDetalhe] = useState(null);
  const [respondendo, setRespondendo] = useState(false);

  const load = useCallback(async (status) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/data-subject-requests', {
        params: status ? { status } : {},
      });
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar solicitações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filtro); }, [load, filtro]);

  const registrarResposta = async (r) => {
    const notas = window.prompt(
      `Registrar resposta ao titular (protocolo ${r.protocol}).\n\nO que foi comunicado?`
    );
    if (notas === null) return;

    setRespondendo(true);
    try {
      await api.post(`/api/admin/data-subject-requests/${r.id}/respond`, {
        response_notes: notas || null,
      });
      await load(filtro);
      if (detalhe?.id === r.id) setDetalhe(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar resposta.');
    } finally {
      setRespondendo(false);
    }
  };

  // Solicitações sem resposta registrada e com prazo próximo ou vencido
  const pendentes = requests.filter(
    (r) => !r.responded_at && diasRestantes(r.response_deadline) !== null
      && diasRestantes(r.response_deadline) <= 5
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary">Solicitações de Titulares</h2>
          <p className="text-xs text-gray-500 mt-1">
            Pedidos de eliminação e demais direitos previstos na LGPD.
            O prazo de resposta ao titular é de 15 dias.
          </p>
        </div>
        <select
          value={filtro} onChange={(e) => setFiltro(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
        >
          <option value="">Todas</option>
          {Object.entries(STATUS_INFO).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Aviso de prazo — o que exige ação agora */}
      {pendentes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-4 text-sm">
          <strong>{pendentes.length} solicitação(ões)</strong> com prazo de resposta próximo ou vencido.
          O prazo se refere à comunicação ao titular, independentemente de a anonimização já ter ocorrido.
        </div>
      )}

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
          Nenhuma solicitação {filtro ? 'com este status' : 'registrada'}.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const st = STATUS_INFO[r.status] || STATUS_INFO.received;
            const dias = diasRestantes(r.response_deadline);
            const prazoAlerta = !r.responded_at && dias !== null && dias <= 5;
            return (
              <div key={r.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-semibold text-spotnicik-dark">{r.protocol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      <span className="text-xs text-gray-500">{TIPO_LABEL[r.request_type] || r.request_type}</span>
                      {r.responded_at ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Respondida
                        </span>
                      ) : prazoAlerta && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {dias < 0 ? `Prazo vencido há ${-dias}d` : `Responder em ${dias}d`}
                        </span>
                      )}
                    </div>

                    {/* O e-mail do solicitante é preservado no protocolo mesmo
                        após a anonimização — é o que torna o registro legível */}
                    <p className="text-sm text-spotnicik-dark">{r.requester_email}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      <span>Solicitada: {fmtDataHora(r.requested_at)}</span>
                      <span>Prazo: {fmtData(r.response_deadline)}</span>
                      {r.scheduled_for && <span>Anonimização: {fmtData(r.scheduled_for)}</span>}
                      {r.completed_at && <span>Concluída: {fmtDataHora(r.completed_at)}</span>}
                      {r.attempts > 0 && <span>{r.attempts} tentativa(s)</span>}
                    </div>

                    {r.blocked_reason && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-1 rounded mt-2">
                        {r.blocked_reason}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setDetalhe(r)}
                      className="text-sm px-3 py-1.5 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light transition"
                    >
                      Detalhes
                    </button>
                    {!r.responded_at && (
                      <button
                        onClick={() => registrarResposta(r)}
                        disabled={respondendo}
                        className="text-sm px-3 py-1.5 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
                      >
                        Registrar resposta
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Detalhe ---- */}
      {detalhe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
             onClick={() => setDetalhe(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-spotnicik-primary font-mono">{detalhe.protocol}</h3>
                <p className="text-sm text-spotnicik-dark">{detalhe.requester_email}</p>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-sm">
              <div>
                <p className="text-xs text-gray-500">Situação</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${(STATUS_INFO[detalhe.status] || STATUS_INFO.received).cls}`}>
                  {(STATUS_INFO[detalhe.status] || STATUS_INFO.received).label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <p className="text-spotnicik-dark">{TIPO_LABEL[detalhe.request_type]}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Prazo de resposta</p>
                <p className="text-spotnicik-dark">{fmtData(detalhe.response_deadline)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Respondida em</p>
                <p className="text-spotnicik-dark">{fmtDataHora(detalhe.responded_at)}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-1">Verificação de identidade</p>
              <p className="text-sm text-spotnicik-dark">
                {detalhe.verification_method === 'conta_autenticada'
                  ? 'Solicitação partiu da própria conta autenticada'
                  : detalhe.verification_method}
              </p>
            </div>

            {/* Avaliação apurada no momento da solicitação */}
            {detalhe.evaluation && (
              <div className="bg-spotnicik-light rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-spotnicik-dark mb-2">
                  Situação apurada na solicitação
                </p>
                <p className="text-sm text-spotnicik-dark mb-2">{detalhe.evaluation.motivo}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>
                    Histórico de conexão: {detalhe.evaluation.tem_historico_conexao ? 'sim' : 'não'}
                  </span>
                  {detalhe.evaluation.ultima_conexao && (
                    <span>Última conexão: {fmtDataHora(detalhe.evaluation.ultima_conexao)}</span>
                  )}
                  <span>Cobranças: {detalhe.evaluation.cobrancas ?? 0}</span>
                  <span>Créditos: {detalhe.evaluation.creditos ?? 0}</span>
                </div>
              </div>
            )}

            {detalhe.scheduled_for && detalhe.status !== 'completed' && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded-lg mb-4">
                Anonimização prevista para {fmtData(detalhe.scheduled_for)}.
                Os registros de conexão são preservados pelo prazo legal e permanecem
                vinculados ao identificador, sem os dados pessoais.
              </div>
            )}

            {detalhe.blocked_reason && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded-lg mb-4">
                <strong>Aguardando condição:</strong> {detalhe.blocked_reason}
                {detalhe.attempts > 0 && (
                  <p className="text-xs mt-1">
                    {detalhe.attempts} tentativa(s) da rotina diária.
                    {detalhe.attempts >= 30 && ' Bloqueio persistente — verificar manualmente.'}
                  </p>
                )}
              </div>
            )}

            {detalhe.completed_at && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm p-3 rounded-lg mb-4">
                Anonimização concluída em {fmtDataHora(detalhe.completed_at)}.
                Os dados pessoais foram substituídos; o identificador e os registros
                de conexão foram preservados.
              </div>
            )}

            {detalhe.response_notes && (
              <div className="border-t pt-4">
                <p className="text-xs text-gray-500 mb-1">Resposta registrada</p>
                <p className="text-sm text-spotnicik-dark">{detalhe.response_notes}</p>
              </div>
            )}

            {!detalhe.responded_at && (
              <div className="border-t pt-4">
                <button
                  onClick={() => registrarResposta(detalhe)}
                  disabled={respondendo}
                  className="text-sm px-4 py-2 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  Registrar resposta ao titular
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
