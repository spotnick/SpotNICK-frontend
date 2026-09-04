import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const STATUS_INFO = {
  draft:     { label: 'Rascunho',  cls: 'bg-gray-100 text-gray-700' },
  approved:  { label: 'Aprovada',  cls: 'bg-green-100 text-green-700' },
  fulfilled: { label: 'Atendida',  cls: 'bg-blue-100 text-blue-700' },
  rejected:  { label: 'Recusada',  cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-100 text-gray-500' },
};

const TIPO_LABEL = {
  ordem_judicial: 'Ordem judicial',
  requisicao_administrativa: 'Requisição administrativa',
};

const DOC_TIPO = {
  oficio: 'Ofício',
  decisao_judicial: 'Decisão judicial',
  mandado: 'Mandado',
  resposta_enviada: 'Resposta enviada',
  outro: 'Outro',
};

const EMPTY = {
  request_type: 'ordem_judicial',
  requesting_authority: '',
  case_number: '',
  received_at: new Date().toISOString().slice(0, 10),
  deadline: '',
  scope_description: '',
  scope_user_email: '',
  scope_ip: '',
  scope_date_from: '',
  scope_date_to: '',
  notes: '',
};

const fmtData = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—');
const fmtDataHora = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '—');

export default function LegalRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [detalhe, setDetalhe] = useState(null);
  const [arquivo, setArquivo] = useState(null);
  const [tipoDoc, setTipoDoc] = useState('oficio');
  const [enviando, setEnviando] = useState(false);

  const load = useCallback(async (status) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/legal-requests', {
        params: status ? { status } : {},
      });
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar requisições.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(filtro); }, [load, filtro]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const salvar = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach((k) => { if (payload[k] === '') delete payload[k]; });
      await api.post('/api/admin/legal-requests', payload);
      setShowForm(false);
      setForm(EMPTY);
      await load(filtro);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao registrar requisição.');
    } finally {
      setSaving(false);
    }
  };

  const abrirDetalhe = async (id) => {
    try {
      const { data } = await api.get(`/api/admin/legal-requests/${id}`);
      setDetalhe(data);
      setArquivo(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao carregar detalhes.');
    }
  };

  const anexar = async () => {
    if (!arquivo) { alert('Selecione um arquivo.'); return; }
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append('documento', arquivo);
      fd.append('document_type', tipoDoc);
      await api.post(`/api/admin/legal-requests/${detalhe.request.id}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setArquivo(null);
      await abrirDetalhe(detalhe.request.id);
      await load(filtro);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao anexar documento.');
    } finally {
      setEnviando(false);
    }
  };

  const baixar = async (docId) => {
    try {
      const { data } = await api.get(`/api/admin/legal-requests/documents/${docId}/download`);
      window.open(data.url, '_blank');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao gerar link de download.');
    }
  };

  const aprovar = async () => {
    const notas = window.prompt('Observações da aprovação (opcional):');
    if (notas === null) return;
    try {
      await api.post(`/api/admin/legal-requests/${detalhe.request.id}/approve`, {
        approval_notes: notas || null,
      });
      await abrirDetalhe(detalhe.request.id);
      await load(filtro);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao aprovar.');
    }
  };

  const recusar = async () => {
    const motivo = window.prompt('Motivo da recusa (mínimo 10 caracteres):');
    if (!motivo) return;
    try {
      await api.post(`/api/admin/legal-requests/${detalhe.request.id}/reject`, {
        rejection_reason: motivo,
      });
      await abrirDetalhe(detalhe.request.id);
      await load(filtro);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao recusar.');
    }
  };

  const concluir = async () => {
    const notas = window.prompt('O que foi entregue? (opcional)');
    if (notas === null) return;
    try {
      await api.post(`/api/admin/legal-requests/${detalhe.request.id}/fulfill`, {
        fulfillment_notes: notas || null,
      });
      await abrirDetalhe(detalhe.request.id);
      await load(filtro);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao concluir.');
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary">Requisições Judiciais e Administrativas</h2>
          <p className="text-xs text-gray-500 mt-1">
            Registro, aprovação e atendimento. A extração de registros de conexão
            para estes fins só é liberada após a aprovação da requisição.
          </p>
        </div>
        <div className="flex gap-2">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className={inputCls}>
            <option value="">Todas</option>
            {Object.entries(STATUS_INFO).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setForm(EMPTY); setFormError(null); setShowForm(true); }}
            className="bg-spotnicik-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition whitespace-nowrap"
          >
            + Nova Requisição
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
          Nenhuma requisição {filtro ? 'com este status' : 'registrada'}.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => {
            const st = STATUS_INFO[r.status] || STATUS_INFO.draft;
            const prazoVencido = r.deadline && r.status === 'approved'
              && new Date(r.deadline) < new Date();
            return (
              <div key={r.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-semibold text-spotnicik-dark">{r.protocol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      <span className="text-xs text-gray-500">{TIPO_LABEL[r.request_type]}</span>
                      {prazoVencido && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          Prazo vencido
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-spotnicik-dark">{r.requesting_authority}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      {r.case_number && <span>Processo: {r.case_number}</span>}
                      <span>Recebida: {fmtData(r.received_at)}</span>
                      {r.deadline && <span>Prazo: {fmtData(r.deadline)}</span>}
                      <span>{r.documentos} documento(s)</span>
                      <span>{r.extracoes} extração(ões)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => abrirDetalhe(r.id)}
                    className="text-sm px-3 py-1.5 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 transition shrink-0"
                  >
                    Abrir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Formulário ---- */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
             onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-spotnicik-primary mb-4">Nova Requisição</h3>
            {formError && <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{formError}</div>}

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Tipo *</label>
                  <select name="request_type" value={form.request_type} onChange={handleChange} className={inputCls}>
                    {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Nº do processo / ofício</label>
                  <input name="case_number" value={form.case_number} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Órgão solicitante *</label>
                <input name="requesting_authority" value={form.requesting_authority} onChange={handleChange}
                       placeholder="Ex: 2ª Vara Criminal de ..." className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Recebida em *</label>
                  <input type="date" name="received_at" value={form.received_at} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Prazo de resposta</label>
                  <input type="date" name="deadline" value={form.deadline} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-spotnicik-dark mb-2">
                  Escopo solicitado
                  <span className="font-normal text-gray-400"> — delimite o mínimo necessário</span>
                </p>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Descrição *</label>
                  <textarea name="scope_description" value={form.scope_description} onChange={handleChange}
                            rows={3} placeholder="O que exatamente foi solicitado?" className={inputCls} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <input name="scope_user_email" value={form.scope_user_email} onChange={handleChange}
                         placeholder="E-mail do usuário (se houver)" className={inputCls} />
                  <input name="scope_ip" value={form.scope_ip} onChange={handleChange}
                         placeholder="IP (se houver)" className={inputCls} />
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Período de</label>
                    <input type="datetime-local" name="scope_date_from" value={form.scope_date_from} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Até</label>
                    <input type="datetime-local" name="scope_date_to" value={form.scope_date_to} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Observações</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className={inputCls} />
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button onClick={() => setShowForm(false)}
                      className="flex-1 bg-gray-200 text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-gray-300 transition">
                Cancelar
              </button>
              <button onClick={salvar} disabled={saving}
                      className="flex-1 bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                {saving ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Detalhe ---- */}
      {detalhe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
             onClick={() => setDetalhe(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-spotnicik-primary font-mono">{detalhe.request.protocol}</h3>
                <p className="text-sm text-spotnicik-dark">{detalhe.request.requesting_authority}</p>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-sm">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${(STATUS_INFO[detalhe.request.status] || STATUS_INFO.draft).cls}`}>
                  {(STATUS_INFO[detalhe.request.status] || STATUS_INFO.draft).label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tipo</p>
                <p className="text-spotnicik-dark">{TIPO_LABEL[detalhe.request.request_type]}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Recebida</p>
                <p className="text-spotnicik-dark">{fmtData(detalhe.request.received_at)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Prazo</p>
                <p className="text-spotnicik-dark">{fmtData(detalhe.request.deadline)}</p>
              </div>
            </div>

            <div className="bg-spotnicik-light rounded-lg p-3 mb-5">
              <p className="text-xs text-gray-500 mb-1">Escopo solicitado</p>
              <p className="text-sm text-spotnicik-dark">{detalhe.request.scope_description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
                {detalhe.request.scope_user_email && <span>Usuário: {detalhe.request.scope_user_email}</span>}
                {detalhe.request.scope_ip && <span>IP: {detalhe.request.scope_ip}</span>}
                {detalhe.request.scope_date_from && <span>De: {fmtDataHora(detalhe.request.scope_date_from)}</span>}
                {detalhe.request.scope_date_to && <span>Até: {fmtDataHora(detalhe.request.scope_date_to)}</span>}
              </div>
            </div>

            {detalhe.request.approved_at && (
              <div className="bg-green-50 border border-green-200 text-green-800 text-sm p-3 rounded-lg mb-4">
                Aprovada em {fmtDataHora(detalhe.request.approved_at)}
                {detalhe.request.approval_notes && ` — ${detalhe.request.approval_notes}`}
              </div>
            )}
            {detalhe.request.rejected_at && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-lg mb-4">
                Recusada em {fmtDataHora(detalhe.request.rejected_at)} — {detalhe.request.rejection_reason}
              </div>
            )}
            {detalhe.request.fulfilled_at && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm p-3 rounded-lg mb-4">
                Atendida em {fmtDataHora(detalhe.request.fulfilled_at)}
                {detalhe.request.fulfillment_notes && ` — ${detalhe.request.fulfillment_notes}`}
              </div>
            )}

            {/* Documentos */}
            <div className="mb-5">
              <h4 className="font-semibold text-spotnicik-dark mb-2">
                Documentos ({detalhe.documentos.length})
              </h4>
              {detalhe.documentos.length === 0 ? (
                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-lg">
                  Nenhum documento anexado. É obrigatório anexar ao menos um antes de aprovar.
                </p>
              ) : (
                <div className="space-y-1">
                  {detalhe.documentos.map((d) => (
                    <div key={d.id} className="flex items-center justify-between bg-spotnicik-light rounded px-3 py-2 text-sm">
                      <div>
                        <span className="text-spotnicik-dark">{d.filename}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {DOC_TIPO[d.document_type] || d.document_type} · {Math.round((d.size_bytes || 0) / 1024)} KB
                        </span>
                      </div>
                      <button onClick={() => baixar(d.id)} className="text-xs text-spotnicik-primary hover:underline">
                        Baixar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {detalhe.request.status === 'draft' && (
                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                  <p className="text-xs font-semibold text-spotnicik-dark mb-2">Anexar documento</p>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                           onChange={(e) => setArquivo(e.target.files[0])}
                           className="text-sm flex-1" />
                    <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} className={inputCls + ' md:w-48'}>
                      {Object.entries(DOC_TIPO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button onClick={anexar} disabled={enviando || !arquivo}
                            className="text-sm px-4 py-2 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap">
                      {enviando ? 'Enviando...' : 'Anexar'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">PDF, JPG, PNG ou WEBP — até 10 MB.</p>
                </div>
              )}
            </div>

            {/* Extrações vinculadas */}
            <div className="mb-5 border-t pt-4">
              <h4 className="font-semibold text-spotnicik-dark mb-2">
                Extrações realizadas ({detalhe.extracoes.length})
              </h4>
              {detalhe.extracoes.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma extração vinculada a esta requisição.</p>
              ) : (
                <div className="space-y-1">
                  {detalhe.extracoes.map((e) => (
                    <div key={e.id} className="flex justify-between bg-spotnicik-light rounded px-3 py-2 text-sm">
                      <span className="text-spotnicik-dark">{e.actor_name}</span>
                      <span className="text-xs text-gray-500">
                        {fmtDataHora(e.extracted_at)} · {e.row_count} registro(s)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex gap-2 flex-wrap border-t pt-4">
              {detalhe.request.status === 'draft' && (
                <>
                  <button onClick={aprovar}
                          className="text-sm px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                    Aprovar
                  </button>
                  <button onClick={recusar}
                          className="text-sm px-4 py-2 border border-red-400 text-red-600 rounded-lg font-medium hover:bg-red-50 transition">
                    Recusar
                  </button>
                </>
              )}
              {detalhe.request.status === 'approved' && (
                <button onClick={concluir}
                        className="text-sm px-4 py-2 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 transition">
                  Marcar como atendida
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
