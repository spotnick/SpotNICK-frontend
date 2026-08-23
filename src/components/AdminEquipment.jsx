import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const STATUS_INFO = {
  stock:       { label: 'Em estoque',  cls: 'bg-blue-100 text-blue-700' },
  assigned:    { label: 'Cedido',      cls: 'bg-green-100 text-green-700' },
  maintenance: { label: 'Manutenção',  cls: 'bg-yellow-100 text-yellow-700' },
  defective:   { label: 'Com defeito', cls: 'bg-orange-100 text-orange-700' },
  written_off: { label: 'Baixado',     cls: 'bg-gray-100 text-gray-600' },
  sold:        { label: 'Vendido',     cls: 'bg-purple-100 text-purple-700' },
};

const REGIME_LABEL = {
  rental: 'Locação',
  loan: 'Comodato',
  sold: 'Venda',
  internal: 'Uso interno',
};

const MOVEMENT_LABEL = {
  purchase: 'Compra / cadastro',
  to_stock: 'Entrada em estoque',
  to_location: 'Enviado ao local',
  to_maintenance: 'Para manutenção',
  from_maintenance: 'Retorno da manutenção',
  returned: 'Devolvido',
  written_off: 'Baixa patrimonial',
  sold: 'Venda',
};

const EMPTY_FORM = {
  serial_number: '', type: 'Roteador', brand: '', model: '', mac_address: '',
  purchase_date: '', purchase_value: '', invoice_number: '', notes: '',
};

const EMPTY_ASSIGN = {
  company_id: '', location_id: '', contract_id: '', regime: 'loan',
  monthly_value: '', assigned_at: new Date().toISOString().slice(0, 10),
  installed_by: '', notes: '',
};

const EMPTY_RETURN = {
  returned_at: new Date().toISOString().slice(0, 10),
  return_condition: '', received_by: '', to_maintenance: false, notes: '',
};

function fmtDate(d) {
  return d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
}

export default function AdminEquipment({ isPlatformAdmin }) {
  const [equipment, setEquipment] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [detail, setDetail] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN);
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnForm, setReturnForm] = useState(EMPTY_RETURN);
  const [processing, setProcessing] = useState(false);

  const loadEquipment = useCallback(async (status, searchTerm) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (status) params.status = status;
      if (searchTerm) params.search = searchTerm;
      const { data } = await api.get('/api/admin/equipment', { params });
      setEquipment(data.equipment || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar equipamentos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEquipment(filterStatus, ''); }, [loadEquipment, filterStatus]);

  // Fecha o menu de ações ao clicar em qualquer outro lugar
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  useEffect(() => {
    if (!isPlatformAdmin) return;
    (async () => {
      try {
        const [c, l, ct] = await Promise.all([
          api.get('/api/admin/companies'),
          api.get('/api/admin/locations'),
          api.get('/api/admin/contracts'),
        ]);
        setCompanies(c.data.companies || []);
        setLocations(l.data.locations || []);
        setContracts(ct.data.contracts || []);
      } catch { /* ignora */ }
    })();
  }, [isPlatformAdmin]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadEquipment(filterStatus, search);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM); setEditingId(null); setFormError(null); setShowForm(true);
  };

  const openEdit = (eq) => {
    setForm({
      serial_number: eq.serial_number, type: eq.type, brand: eq.brand || '',
      model: eq.model || '', mac_address: eq.mac_address || '',
      purchase_date: eq.purchase_date || '', purchase_value: String(eq.purchase_value || ''),
      invoice_number: eq.invoice_number || '', notes: eq.notes || '',
    });
    setEditingId(eq.id); setFormError(null); setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true); setFormError(null);
    try {
      const payload = {
        ...form,
        purchase_value: form.purchase_value ? Number(form.purchase_value) : null,
        purchase_date: form.purchase_date || null,
      };
      if (editingId) {
        delete payload.serial_number;
        await api.patch(`/api/admin/equipment/${editingId}`, payload);
      } else {
        await api.post('/api/admin/equipment', payload);
      }
      setShowForm(false);
      await loadEquipment(filterStatus, search);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id) => {
    try {
      const { data } = await api.get(`/api/admin/equipment/${id}`);
      setDetail(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao carregar ficha.');
    }
  };

  const handleAssign = async () => {
    if (!assignForm.assigned_at) { alert('Informe a data da cessão.'); return; }
    setProcessing(true);
    try {
      await api.post(`/api/admin/equipment/${assignTarget.id}/assign`, {
        ...assignForm,
        company_id: assignForm.company_id || null,
        location_id: assignForm.location_id || null,
        contract_id: assignForm.contract_id || null,
        monthly_value: assignForm.monthly_value ? Number(assignForm.monthly_value) : 0,
      });
      setAssignTarget(null);
      setAssignForm(EMPTY_ASSIGN);
      await loadEquipment(filterStatus, search);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao ceder equipamento.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReturn = async () => {
    if (!returnForm.returned_at) { alert('Informe a data da devolução.'); return; }
    setProcessing(true);
    try {
      await api.post(`/api/admin/equipment/${returnTarget.id}/return`, returnForm);
      setReturnTarget(null);
      setReturnForm(EMPTY_RETURN);
      await loadEquipment(filterStatus, search);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar devolução.');
    } finally {
      setProcessing(false);
    }
  };

  const changeStatus = async (eq, newStatus, label) => {
    if (!window.confirm(`Confirma: ${label}?`)) return;
    try {
      await api.patch(`/api/admin/equipment/${eq.id}`, { status: newStatus });
      await loadEquipment(filterStatus, search);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar status.');
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-spotnicik-primary';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary">Equipamentos</h2>
          <p className="text-xs text-gray-500 mt-1">
            {isPlatformAdmin
              ? 'Controle patrimonial por número de série, com histórico de movimentação.'
              : 'Equipamentos cedidos à sua empresa.'}
          </p>
        </div>
        {isPlatformAdmin && (
          <button
            onClick={openCreate}
            className="bg-spotnicik-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition whitespace-nowrap"
          >
            + Novo Equipamento
          </button>
        )}
      </div>

      {isPlatformAdmin && (
        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <div className="flex gap-2 flex-1">
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
              placeholder="Buscar por série, modelo ou MAC..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-spotnicik-cyan text-spotnicik-dark rounded-lg font-medium text-sm hover:bg-cyan-400 transition"
            >
              Buscar
            </button>
          </div>
          <select
            value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_INFO).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      )}

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : equipment.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
          Nenhum equipamento {filterStatus || search ? 'encontrado com esses filtros' : 'cadastrado'}.
        </div>
      ) : (
        <div className="space-y-3">
          {equipment.map((eq) => {
            const st = STATUS_INFO[eq.status] || STATUS_INFO.stock;
            const a = eq.current_assignment;
            return (
              <div key={eq.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-sm font-semibold text-spotnicik-dark">
                        {eq.serial_number}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      {a && (
                        <span className="text-xs bg-spotnicik-light text-spotnicik-dark px-2 py-0.5 rounded-full">
                          {REGIME_LABEL[a.regime] || a.regime}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-spotnicik-dark">
                      {[eq.type, eq.brand, eq.model].filter(Boolean).join(' · ')}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                      {eq.mac_address && <span>MAC: {eq.mac_address}</span>}
                      {a?.company_name && <span>🏢 {a.company_name}</span>}
                      {a?.location_name && <span>📍 {a.location_name}</span>}
                      {a?.assigned_at && <span>Desde {fmtDate(a.assigned_at)}</span>}
                      {a?.regime === 'rental' && Number(a.monthly_value) > 0 && (
                        <span>R$ {Number(a.monthly_value).toFixed(2)}/mês</span>
                      )}
                    </div>
                  </div>

                  {isPlatformAdmin && (
                    <div className="flex gap-2 items-center shrink-0">
                      {/* Ação principal, conforme o status */}
                      {['stock', 'maintenance', 'defective'].includes(eq.status) && (
                        <button
                          onClick={() => { setAssignTarget(eq); setAssignForm(EMPTY_ASSIGN); }}
                          className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                        >
                          Ceder
                        </button>
                      )}
                      {eq.status === 'assigned' && (
                        <button
                          onClick={() => { setReturnTarget(eq); setReturnForm(EMPTY_RETURN); }}
                          className="text-sm px-3 py-1.5 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition"
                        >
                          Devolver
                        </button>
                      )}

                      <button
                        onClick={() => openDetail(eq.id)}
                        className="text-sm px-3 py-1.5 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light transition"
                      >
                        Ficha
                      </button>

                      {/* Demais ações agrupadas */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === eq.id ? null : eq.id);
                          }}
                          className="text-sm px-2.5 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                          title="Mais ações"
                        >
                          &#8942;
                        </button>

                        {openMenuId === eq.id && (
                          <div
                            className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[180px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { setOpenMenuId(null); openEdit(eq); }}
                              className="w-full text-left px-4 py-2 text-sm text-spotnicik-dark hover:bg-spotnicik-light transition"
                            >
                              Editar dados
                            </button>

                            {eq.status === 'stock' && (
                              <button
                                onClick={() => { setOpenMenuId(null); changeStatus(eq, 'maintenance', 'Enviar para manutenção'); }}
                                className="w-full text-left px-4 py-2 text-sm text-spotnicik-dark hover:bg-spotnicik-light transition"
                              >
                                Enviar para manutenção
                              </button>
                            )}
                            {eq.status === 'maintenance' && (
                              <button
                                onClick={() => { setOpenMenuId(null); changeStatus(eq, 'stock', 'Retornar ao estoque'); }}
                                className="w-full text-left px-4 py-2 text-sm text-spotnicik-dark hover:bg-spotnicik-light transition"
                              >
                                Voltar ao estoque
                              </button>
                            )}
                            {['stock', 'maintenance', 'defective'].includes(eq.status) && (
                              <>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                  onClick={() => { setOpenMenuId(null); changeStatus(eq, 'written_off', 'Dar baixa neste equipamento'); }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                                >
                                  Dar baixa
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Cadastro/edição ---- */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
             onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-spotnicik-primary mb-4">
              {editingId ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h3>

            {formError && <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{formError}</div>}

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Número de Série *</label>
                  <input
                    name="serial_number" value={form.serial_number} onChange={handleChange}
                    disabled={!!editingId}
                    className={`${inputCls} font-mono ${editingId ? 'bg-gray-100' : ''}`}
                  />
                  {editingId && <p className="text-[11px] text-gray-400 mt-1">A série não pode ser alterada.</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Tipo *</label>
                  <input name="type" value={form.type} onChange={handleChange}
                         placeholder="Roteador, AP, Switch..." className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Marca</label>
                  <input name="brand" value={form.brand} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Modelo</label>
                  <input name="model" value={form.model} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">MAC</label>
                  <input name="mac_address" value={form.mac_address} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Data da compra</label>
                  <input type="date" name="purchase_date" value={form.purchase_date} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" name="purchase_value" value={form.purchase_value} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Nota fiscal</label>
                  <input name="invoice_number" value={form.invoice_number} onChange={handleChange} className={inputCls} />
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
              <button onClick={handleSave} disabled={saving}
                      className="flex-1 bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Ceder ---- */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
             onClick={() => setAssignTarget(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-spotnicik-primary mb-1">Ceder Equipamento</h3>
            <p className="text-xs font-mono text-gray-500 mb-4">{assignTarget.serial_number}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Regime *</label>
                <select
                  value={assignForm.regime}
                  onChange={(e) => setAssignForm((p) => ({ ...p, regime: e.target.value }))}
                  className={inputCls}
                >
                  {Object.entries(REGIME_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {assignForm.regime === 'rental' && (
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Valor mensal (R$)</label>
                  <input
                    type="number" step="0.01" value={assignForm.monthly_value}
                    onChange={(e) => setAssignForm((p) => ({ ...p, monthly_value: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              )}

              {assignForm.regime !== 'internal' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-spotnicik-dark mb-1">Empresa</label>
                    <select
                      value={assignForm.company_id}
                      onChange={(e) => setAssignForm((p) => ({ ...p, company_id: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">Selecione...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-spotnicik-dark mb-1">Contrato (opcional)</label>
                    <select
                      value={assignForm.contract_id}
                      onChange={(e) => setAssignForm((p) => ({ ...p, contract_id: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">Nenhum</option>
                      {contracts
                        .filter((ct) => !assignForm.company_id || ct.company_id === assignForm.company_id)
                        .map((ct) => (
                          <option key={ct.id} value={ct.id}>{ct.contract_number}</option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Local</label>
                <select
                  value={assignForm.location_id}
                  onChange={(e) => setAssignForm((p) => ({ ...p, location_id: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Selecione...</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Data da cessão *</label>
                  <input
                    type="date" value={assignForm.assigned_at}
                    onChange={(e) => setAssignForm((p) => ({ ...p, assigned_at: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Instalado por</label>
                  <input
                    value={assignForm.installed_by}
                    onChange={(e) => setAssignForm((p) => ({ ...p, installed_by: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Observações</label>
                <textarea
                  value={assignForm.notes} rows={2}
                  onChange={(e) => setAssignForm((p) => ({ ...p, notes: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button onClick={() => setAssignTarget(null)}
                      className="flex-1 bg-gray-200 text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-gray-300 transition">
                Cancelar
              </button>
              <button onClick={handleAssign} disabled={processing}
                      className="flex-1 bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                {processing ? 'Processando...' : 'Confirmar cessão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Devolver ---- */}
      {returnTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
             onClick={() => setReturnTarget(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-spotnicik-primary mb-1">Registrar Devolução</h3>
            <p className="text-xs font-mono text-gray-500 mb-4">{returnTarget.serial_number}</p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Data *</label>
                  <input
                    type="date" value={returnForm.returned_at}
                    onChange={(e) => setReturnForm((p) => ({ ...p, returned_at: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Recebido por</label>
                  <input
                    value={returnForm.received_by}
                    onChange={(e) => setReturnForm((p) => ({ ...p, received_by: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Condição do equipamento</label>
                <input
                  value={returnForm.return_condition}
                  onChange={(e) => setReturnForm((p) => ({ ...p, return_condition: e.target.value }))}
                  placeholder="Bom estado, avariado, sem fonte..."
                  className={inputCls}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox" checked={returnForm.to_maintenance}
                  onChange={(e) => setReturnForm((p) => ({ ...p, to_maintenance: e.target.checked }))}
                />
                Enviar direto para manutenção (em vez de voltar ao estoque)
              </label>

              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Observações</label>
                <textarea
                  value={returnForm.notes} rows={2}
                  onChange={(e) => setReturnForm((p) => ({ ...p, notes: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-5">
              <button onClick={() => setReturnTarget(null)}
                      className="flex-1 bg-gray-200 text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-gray-300 transition">
                Cancelar
              </button>
              <button onClick={handleReturn} disabled={processing}
                      className="flex-1 bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition">
                {processing ? 'Processando...' : 'Confirmar devolução'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Ficha completa ---- */}
      {detail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
             onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-spotnicik-primary font-mono">
                  {detail.equipment.serial_number}
                </h3>
                <p className="text-sm text-spotnicik-dark">
                  {[detail.equipment.type, detail.equipment.brand, detail.equipment.model]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-sm">
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${(STATUS_INFO[detail.equipment.status] || STATUS_INFO.stock).cls}`}>
                  {(STATUS_INFO[detail.equipment.status] || STATUS_INFO.stock).label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Compra</p>
                <p className="text-spotnicik-dark">{fmtDate(detail.equipment.purchase_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Valor</p>
                <p className="text-spotnicik-dark">
                  {detail.equipment.purchase_value
                    ? `R$ ${Number(detail.equipment.purchase_value).toFixed(2)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Nota fiscal</p>
                <p className="text-spotnicik-dark">{detail.equipment.invoice_number || '—'}</p>
              </div>
            </div>

            {/* Cessões */}
            <div className="mb-5">
              <h4 className="font-semibold text-spotnicik-dark mb-2">
                Cessões ({detail.assignments.length})
              </h4>
              {detail.assignments.length === 0 ? (
                <p className="text-sm text-gray-400">Nunca foi cedido.</p>
              ) : (
                <div className="space-y-2">
                  {detail.assignments.map((a) => (
                    <div key={a.id} className={`rounded-lg px-3 py-2 text-sm ${a.returned_at ? 'bg-gray-50' : 'bg-green-50 border border-green-200'}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-medium text-spotnicik-dark">
                            {REGIME_LABEL[a.regime] || a.regime}
                          </span>
                          {a.companies && (
                            <span className="text-gray-600"> · {a.companies.trade_name || a.companies.legal_name}</span>
                          )}
                          {a.locations && <span className="text-gray-600"> · {a.locations.name}</span>}
                          {a.contracts && (
                            <span className="text-xs font-mono text-gray-400"> ({a.contracts.contract_number})</span>
                          )}
                        </div>
                        {!a.returned_at && (
                          <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full shrink-0">Ativa</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {fmtDate(a.assigned_at)} → {a.returned_at ? fmtDate(a.returned_at) : 'em curso'}
                        {a.regime === 'rental' && Number(a.monthly_value) > 0 &&
                          ` · R$ ${Number(a.monthly_value).toFixed(2)}/mês`}
                        {a.return_condition && ` · ${a.return_condition}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Histórico */}
            <div className="border-t pt-4">
              <h4 className="font-semibold text-spotnicik-dark mb-2">
                Histórico de Movimentação ({detail.movements.length})
              </h4>
              {detail.movements.length === 0 ? (
                <p className="text-sm text-gray-400">Sem movimentações registradas.</p>
              ) : (
                <div className="space-y-2">
                  {detail.movements.map((m) => (
                    <div key={m.id} className="flex gap-3 text-sm border-l-2 border-spotnicik-cyan pl-3">
                      <div className="flex-1">
                        <div className="font-medium text-spotnicik-dark">
                          {MOVEMENT_LABEL[m.movement_type] || m.movement_type}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(m.occurred_at).toLocaleString('pt-BR')}
                          {m.from_status && m.to_status && ` · ${m.from_status} → ${m.to_status}`}
                          {m.performed_by && ` · ${m.performed_by}`}
                        </div>
                        {(m.companies || m.locations) && (
                          <div className="text-xs text-gray-500">
                            {m.companies?.trade_name || m.companies?.legal_name}
                            {m.locations && ` · ${m.locations.name}`}
                          </div>
                        )}
                        {m.notes && <div className="text-xs text-gray-600 mt-0.5">{m.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {detail.equipment.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 mb-1">Observações</p>
                <p className="text-sm text-spotnicik-dark">{detail.equipment.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
