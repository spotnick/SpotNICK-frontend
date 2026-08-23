import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const STATUS_INFO = {
  draft:     { label: 'Rascunho',     cls: 'bg-gray-100 text-gray-700' },
  trial:     { label: 'Trial',        cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Ativo',        cls: 'bg-green-100 text-green-700' },
  suspended: { label: 'Suspenso',     cls: 'bg-yellow-100 text-yellow-700' },
  overdue:   { label: 'Inadimplente', cls: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'Cancelado',    cls: 'bg-red-100 text-red-700' },
  expired:   { label: 'Expirado',     cls: 'bg-red-100 text-red-700' },
};

// Transições permitidas a partir de cada status
const NEXT_STATUS = {
  draft:     ['trial', 'active', 'cancelled'],
  trial:     ['active', 'cancelled', 'expired'],
  active:    ['suspended', 'overdue', 'cancelled'],
  suspended: ['active', 'cancelled'],
  overdue:   ['active', 'suspended', 'cancelled'],
  cancelled: [],
  expired:   [],
};

const EMPTY_FORM = {
  company_id: '', starts_at: '', ends_at: '', term_months: '',
  auto_renew: true, notice_days: 30, discount_percent: '',
  readjust_index: '', readjust_month: '', billing_cycle: 'monthly',
  payment_method: '', billing_day: '', trial_days: '', notes: '',
};

function money(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d) {
  return d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
}

export default function AdminContracts({ isPlatformAdmin }) {
  const [contracts, setContracts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [items, setItems] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadContracts = useCallback(async (status) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/contracts', {
        params: status ? { status } : {},
      });
      setContracts(data.contracts || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar contratos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadContracts(filterStatus); }, [loadContracts, filterStatus]);

  useEffect(() => {
    (async () => {
      try {
        const [c, p, l] = await Promise.all([
          api.get('/api/admin/companies'),
          api.get('/api/admin/products'),
          api.get('/api/admin/locations'),
        ]);
        setCompanies(c.data.companies || []);
        setProducts(p.data.products || []);
        setLocations(l.data.locations || []);
      } catch { /* ignora */ }
    })();
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setItems([]);
    setSelectedLocations([]);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = async (c) => {
    try {
      const { data } = await api.get(`/api/admin/contracts/${c.id}`);
      setForm({
        company_id: data.contract.company_id,
        starts_at: data.contract.starts_at || '',
        ends_at: data.contract.ends_at || '',
        term_months: data.contract.term_months || '',
        auto_renew: data.contract.auto_renew,
        notice_days: data.contract.notice_days || 30,
        discount_percent: data.contract.discount_percent || '',
        readjust_index: data.contract.readjust_index || '',
        readjust_month: data.contract.readjust_month || '',
        billing_cycle: data.contract.billing_cycle || 'monthly',
        payment_method: data.contract.payment_method || '',
        billing_day: data.contract.billing_day || '',
        trial_days: data.contract.trial_days || '',
        notes: data.contract.notes || '',
      });
      setItems(data.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount || 0,
      })));
      setSelectedLocations(data.locations.map((l) => l.id));
      setEditingId(c.id);
      setFormError(null);
      setShowForm(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao carregar contrato.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const addItem = () => {
    setItems((prev) => [...prev, { product_id: '', quantity: 1, unit_price: 0, discount: 0 }]);
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      // Ao escolher o produto, sugere o preço de tabela
      if (field === 'product_id') {
        const p = products.find((pr) => pr.id === value);
        if (p) updated.unit_price = p.base_price;
      }
      return updated;
    }));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleLocation = (id) => {
    setSelectedLocations((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const computedTotal = () => {
    let total = items.reduce(
      (acc, it) => acc + (Number(it.quantity) || 1) * (Number(it.unit_price) || 0) - (Number(it.discount) || 0),
      0
    );
    if (form.discount_percent) total *= (1 - Number(form.discount_percent) / 100);
    return total;
  };

  const handleSave = async () => {
    if (!form.company_id) { setFormError('Selecione a empresa.'); return; }
    if (items.length === 0) { setFormError('Adicione ao menos um item.'); return; }
    if (items.some((i) => !i.product_id)) { setFormError('Todos os itens precisam de um produto.'); return; }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        ...form,
        term_months: form.term_months ? Number(form.term_months) : null,
        notice_days: form.notice_days ? Number(form.notice_days) : null,
        discount_percent: form.discount_percent ? Number(form.discount_percent) : 0,
        readjust_month: form.readjust_month ? Number(form.readjust_month) : null,
        billing_day: form.billing_day ? Number(form.billing_day) : null,
        trial_days: form.trial_days ? Number(form.trial_days) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        items,
        location_ids: selectedLocations,
      };

      if (editingId) {
        await api.patch(`/api/admin/contracts/${editingId}`, payload);
      } else {
        await api.post('/api/admin/contracts', payload);
      }

      setShowForm(false);
      await loadContracts(filterStatus);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar contrato.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (c, status) => {
    let reason = null;
    if (status === 'cancelled') {
      reason = window.prompt('Motivo do cancelamento (opcional):');
      if (reason === null) return; // cancelou o prompt
    } else if (!window.confirm(`Alterar o status para "${STATUS_INFO[status].label}"?`)) {
      return;
    }

    try {
      await api.post(`/api/admin/contracts/${c.id}/status`, {
        status, cancellation_reason: reason,
      });
      await loadContracts(filterStatus);
      if (detail?.contract?.id === c.id) await openDetail(c.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar status.');
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Excluir o rascunho ${c.contract_number}?`)) return;
    try {
      await api.delete(`/api/admin/contracts/${c.id}`);
      await loadContracts(filterStatus);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir.');
    }
  };

  const openDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/api/admin/contracts/${id}`);
      setDetail(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao carregar detalhes.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-spotnicik-primary';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary">Contratos</h2>
          <p className="text-xs text-gray-500 mt-1">
            Vincula empresa, produtos e locais. A vigência e o trial são controlados aqui.
          </p>
        </div>
        {isPlatformAdmin && (
          <button
            onClick={openCreate}
            className="bg-spotnicik-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Novo Contrato
          </button>
        )}
      </div>

      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_INFO).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
          Nenhum contrato encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => {
            const st = STATUS_INFO[c.status] || STATUS_INFO.draft;
            const transitions = NEXT_STATUS[c.status] || [];
            return (
              <div key={c.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-semibold text-spotnicik-dark">
                        {c.contract_number}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      {c.status === 'trial' && c.trial_ends_at && (
                        <span className="text-xs text-blue-600">
                          até {fmtDate(c.trial_ends_at)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-spotnicik-dark mb-1">
                      {c.companies?.trade_name || c.companies?.legal_name || '—'}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="font-medium text-spotnicik-primary">{money(c.total_value)}</span>
                      <span>{c.locations_count} local(is)</span>
                      {c.starts_at && <span>Início: {fmtDate(c.starts_at)}</span>}
                      {c.ends_at && <span>Fim: {fmtDate(c.ends_at)}</span>}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => openDetail(c.id)}
                      className="text-sm px-3 py-1.5 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                      Detalhes
                    </button>
                    {isPlatformAdmin && (
                      <>
                        <button
                          onClick={() => openEdit(c)}
                          className="text-sm px-3 py-1.5 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light transition"
                        >
                          Editar
                        </button>
                        {transitions.map((s) => (
                          <button
                            key={s}
                            onClick={() => changeStatus(c, s)}
                            className={`text-sm px-3 py-1.5 rounded-lg font-medium transition border ${
                              s === 'cancelled'
                                ? 'border-red-400 text-red-600 hover:bg-red-50'
                                : s === 'active'
                                ? 'border-green-500 text-green-700 hover:bg-green-50'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {STATUS_INFO[s].label}
                          </button>
                        ))}
                        {c.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(c)}
                            className="text-sm px-3 py-1.5 border border-red-400 text-red-600 rounded-lg font-medium hover:bg-red-50 transition"
                          >
                            Excluir
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Formulário ---- */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-spotnicik-primary mb-4">
              {editingId ? 'Editar Contrato' : 'Novo Contrato'}
            </h3>

            {formError && (
              <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{formError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Empresa *</label>
                <select
                  name="company_id" value={form.company_id} onChange={handleChange}
                  disabled={!!editingId} className={inputCls}
                >
                  <option value="">Selecione...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.trade_name || c.legal_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Itens */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold text-spotnicik-dark">Itens do contrato *</p>
                  <button
                    type="button" onClick={addItem}
                    className="text-xs px-3 py-1.5 bg-spotnicik-cyan text-spotnicik-dark rounded-lg font-medium hover:bg-cyan-400 transition"
                  >
                    + Adicionar item
                  </button>
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum item. Adicione ao menos um produto.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((it, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                          <div className="md:col-span-5">
                            <label className="block text-[11px] text-gray-500 mb-1">Produto</label>
                            <select
                              value={it.product_id}
                              onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                              className={inputCls}
                            >
                              <option value="">Selecione...</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] text-gray-500 mb-1">Qtd</label>
                            <input
                              type="number" min="1" value={it.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] text-gray-500 mb-1">Valor un.</label>
                            <input
                              type="number" step="0.01" value={it.unit_price}
                              onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] text-gray-500 mb-1">Desconto</label>
                            <input
                              type="number" step="0.01" value={it.discount}
                              onChange={(e) => updateItem(idx, 'discount', e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div className="md:col-span-1">
                            <button
                              type="button" onClick={() => removeItem(idx)}
                              className="w-full text-red-600 hover:bg-red-50 rounded-lg py-2 text-lg leading-none transition"
                              title="Remover item"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Locais */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-spotnicik-dark mb-1">Locais abrangidos</p>
                <p className="text-xs text-gray-500 mb-2">
                  Um local não pode ter dois contratos ativos cobrindo o mesmo tipo de serviço.
                </p>
                {locations.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum local cadastrado.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 max-h-40 overflow-y-auto border rounded-lg p-2">
                    {locations.map((l) => (
                      <label key={l.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={selectedLocations.includes(l.id)}
                          onChange={() => toggleLocation(l.id)}
                        />
                        <span className="text-spotnicik-dark">{l.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Vigência */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-spotnicik-dark mb-2">Vigência</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Início</label>
                    <input type="date" name="starts_at" value={form.starts_at} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Fim</label>
                    <input type="date" name="ends_at" value={form.ends_at} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Prazo (meses)</label>
                    <input type="number" name="term_months" value={form.term_months} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Aviso prévio (dias)</label>
                    <input type="number" name="notice_days" value={form.notice_days} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm mt-3 cursor-pointer">
                  <input type="checkbox" name="auto_renew" checked={form.auto_renew} onChange={handleChange} />
                  Renovação automática
                </label>
              </div>

              {/* Trial */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-spotnicik-dark mb-2">Período de teste</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Dias de trial</label>
                    <input
                      type="number" name="trial_days" value={form.trial_days} onChange={handleChange}
                      placeholder="Ex: 14" className={inputCls}
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      As datas são calculadas ao iniciar o trial.
                    </p>
                  </div>
                </div>
              </div>

              {/* Financeiro */}
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-spotnicik-dark mb-2">Financeiro</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Ciclo</label>
                    <select name="billing_cycle" value={form.billing_cycle} onChange={handleChange} className={inputCls}>
                      <option value="monthly">Mensal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Dia de vencimento</label>
                    <input type="number" min="1" max="28" name="billing_day" value={form.billing_day} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Forma de pagamento</label>
                    <input name="payment_method" value={form.payment_method} onChange={handleChange} placeholder="Boleto, PIX..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Desconto geral (%)</label>
                    <input type="number" step="0.01" name="discount_percent" value={form.discount_percent} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Índice de reajuste</label>
                    <input name="readjust_index" value={form.readjust_index} onChange={handleChange} placeholder="IPCA, IGPM..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Mês do reajuste</label>
                    <input type="number" min="1" max="12" name="readjust_month" value={form.readjust_month} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Observações</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className={inputCls} />
              </div>

              {/* Total */}
              <div className="bg-spotnicik-light rounded-lg p-4 flex justify-between items-center">
                <span className="text-sm font-medium text-spotnicik-dark">Valor total</span>
                <span className="text-2xl font-bold text-spotnicik-primary">{money(computedTotal())}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button
                type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-200 text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                type="button" onClick={handleSave} disabled={saving}
                className="flex-1 bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar rascunho'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Detalhes ---- */}
      {detail && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-spotnicik-primary font-mono">
                  {detail.contract.contract_number}
                </h3>
                <p className="text-sm text-spotnicik-dark">
                  {detail.contract.companies?.trade_name || detail.contract.companies?.legal_name}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>

            {loadingDetail ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-5">
                  <div>
                    <p className="text-[11px] text-gray-500">Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${(STATUS_INFO[detail.contract.status] || {}).cls}`}>
                      {(STATUS_INFO[detail.contract.status] || {}).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Valor</p>
                    <p className="font-semibold text-spotnicik-primary">{money(detail.contract.total_value)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Ciclo</p>
                    <p>{detail.contract.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Início</p>
                    <p>{fmtDate(detail.contract.starts_at)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Fim</p>
                    <p>{fmtDate(detail.contract.ends_at)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Renovação</p>
                    <p>{detail.contract.auto_renew ? 'Automática' : 'Manual'}</p>
                  </div>
                  {detail.contract.trial_ends_at && (
                    <div>
                      <p className="text-[11px] text-gray-500">Trial até</p>
                      <p>{fmtDate(detail.contract.trial_ends_at)}</p>
                    </div>
                  )}
                  {detail.contract.readjust_index && (
                    <div>
                      <p className="text-[11px] text-gray-500">Reajuste</p>
                      <p>{detail.contract.readjust_index} (mês {detail.contract.readjust_month || '-'})</p>
                    </div>
                  )}
                </div>

                {detail.contract.cancellation_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
                    <p className="text-[11px] text-red-600 font-semibold">Motivo do cancelamento</p>
                    <p className="text-red-800">{detail.contract.cancellation_reason}</p>
                  </div>
                )}

                <div className="border-t pt-4 mb-4">
                  <h4 className="font-semibold text-spotnicik-dark mb-2">Itens ({detail.items.length})</h4>
                  <table className="w-full text-xs">
                    <thead className="bg-spotnicik-light">
                      <tr>
                        <th className="text-left px-2 py-1">Produto</th>
                        <th className="text-right px-2 py-1">Qtd</th>
                        <th className="text-right px-2 py-1">Valor un.</th>
                        <th className="text-right px-2 py-1">Desc.</th>
                        <th className="text-right px-2 py-1">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((it) => (
                        <tr key={it.id} className="border-t border-gray-100">
                          <td className="px-2 py-2">{it.products?.name || '—'}</td>
                          <td className="px-2 py-2 text-right">{it.quantity}</td>
                          <td className="px-2 py-2 text-right">{money(it.unit_price)}</td>
                          <td className="px-2 py-2 text-right">{money(it.discount)}</td>
                          <td className="px-2 py-2 text-right font-medium">
                            {money(it.quantity * it.unit_price - (it.discount || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-spotnicik-dark mb-2">
                    Locais ({detail.locations.length})
                  </h4>
                  {detail.locations.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum local vinculado.</p>
                  ) : (
                    <div className="space-y-1">
                      {detail.locations.map((l) => (
                        <div key={l.id} className="flex justify-between bg-spotnicik-light rounded px-3 py-2 text-sm">
                          <span className="text-spotnicik-dark">{l.name}</span>
                          <span className="text-xs text-gray-500">
                            {l.operation_mode === 'saas_b2b' ? 'SaaS B2B' : 'Operação B2C'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {detail.contract.notes && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-[11px] text-gray-500 mb-1">Observações</p>
                    <p className="text-sm text-spotnicik-dark">{detail.contract.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
