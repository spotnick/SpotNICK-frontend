import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const TYPE_LABEL = {
  saas_plan: 'Plano SaaS',
  setup_fee: 'Taxa de Instalação',
  internet: 'Internet',
  addon: 'Adicional',
  equipment: 'Equipamento',
  service: 'Serviço',
};

const CATEGORY_LABEL = {
  spotnick_saas: 'SpotNICK SaaS',
  internet: 'Internet',
  public_ip: 'IP Público',
  equipment: 'Equipamento',
  support: 'Suporte',
  other: 'Outro',
};

const CYCLE_LABEL = {
  monthly: '/mês',
  yearly: '/ano',
  one_time: 'única',
};

// Tradução dos recursos para exibição legível
const FEATURE_LABEL = {
  max_locations: 'Locais',
  max_concurrent_users: 'Usuários simultâneos',
  portal_customization: 'Personalização do portal',
  advertising: 'Publicidade',
  campaigns: 'Campanhas',
  content_filter: 'Filtro de conteúdo',
  reports: 'Relatórios',
  data_retention: 'Retenção de dados',
  support: 'Suporte',
  pricing_note: 'Observação de preço',
};

const FEATURE_VALUE = {
  true: 'Sim', false: 'Não', null: 'Ilimitado',
  logo: 'Logo', logo_colors: 'Logo + cores', full: 'Completa', white_label: 'White-label',
  basic: 'Básico', intermediate: 'Intermediário', full_export: 'Completo + exportação',
  full_api: 'Completo + API', extended: 'Estendida', segmented: 'Segmentada',
  credits: 'Créditos avulsos', included_limited: 'Incluso (limitado)',
  included_extended: 'Incluso (ampliado)',
  email: 'E-mail', email_chat: 'E-mail + chat', priority: 'Prioritário',
  dedicated_sla: 'Dedicado + SLA',
};

const EMPTY_FORM = {
  code: '', name: '', description: '', type: 'saas_plan',
  service_category: 'spotnick_saas', base_price: '', billing_cycle: 'monthly',
  features: '{}', is_active: true,
};

function formatFeatureValue(v) {
  if (v === null) return FEATURE_VALUE.null;
  if (typeof v === 'boolean') return FEATURE_VALUE[String(v)];
  if (typeof v === 'number') return String(v);
  return FEATURE_VALUE[v] || String(v);
}

export default function AdminProducts({ isPlatformAdmin }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadProducts = useCallback(async (includeInactive) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/products', {
        params: includeInactive ? { include_inactive: 'true' } : {},
      });
      setProducts(data.products || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProducts(showInactive); }, [loadProducts, showInactive]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      code: p.code, name: p.name, description: p.description || '',
      type: p.type, service_category: p.service_category,
      base_price: String(p.base_price), billing_cycle: p.billing_cycle || 'monthly',
      features: JSON.stringify(p.features || {}, null, 2),
      is_active: p.is_active,
    });
    setEditingId(p.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      let features;
      try {
        features = JSON.parse(form.features || '{}');
      } catch {
        setFormError('O campo de recursos não é um JSON válido.');
        setSaving(false);
        return;
      }

      const payload = {
        ...form,
        base_price: Number(form.base_price) || 0,
        features,
      };

      if (editingId) {
        delete payload.code; // código não muda depois de criado
        await api.patch(`/api/admin/products/${editingId}`, payload);
      } else {
        await api.post('/api/admin/products', payload);
      }

      setShowForm(false);
      await loadProducts(showInactive);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (p) => {
    if (!window.confirm(
      `Desativar "${p.name}"? Ele deixa de aparecer para novos contratos, mas continua nos contratos existentes.`
    )) return;
    try {
      const { data } = await api.delete(`/api/admin/products/${p.id}`);
      alert(data.message);
      await loadProducts(showInactive);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao desativar.');
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-spotnicik-primary';

  const plans = products.filter((p) => p.type === 'saas_plan');
  const others = products.filter((p) => p.type !== 'saas_plan');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary">Produtos e Planos</h2>
          <p className="text-xs text-gray-500 mt-1">
            Catálogo do que pode ser contratado. Novos produtos não exigem alteração no sistema.
          </p>
        </div>
        {isPlatformAdmin && (
          <button
            onClick={openCreate}
            className="bg-spotnicik-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Novo Produto
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-600 mb-4 cursor-pointer">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        Mostrar produtos desativados
      </label>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <>
          {/* Planos SaaS em cards */}
          {plans.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-spotnicik-dark mb-3">Planos SpotNICK</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className={`bg-white rounded-lg shadow p-4 flex flex-col ${!p.is_active ? 'opacity-50' : ''}`}
                  >
                    <div className="mb-2">
                      <div className="font-bold text-spotnicik-dark">{p.name}</div>
                      <div className="text-[11px] font-mono text-gray-400">{p.code}</div>
                    </div>

                    <div className="mb-3">
                      {Number(p.base_price) > 0 ? (
                        <span className="text-2xl font-bold text-spotnicik-primary">
                          R$ {Number(p.base_price).toFixed(2)}
                          <span className="text-xs font-normal text-gray-400">
                            {CYCLE_LABEL[p.billing_cycle] || ''}
                          </span>
                        </span>
                      ) : (
                        <span className="text-lg font-bold text-spotnicik-primary">Sob consulta</span>
                      )}
                    </div>

                    {p.description && (
                      <p className="text-xs text-gray-500 mb-3">{p.description}</p>
                    )}

                    <div className="space-y-1 text-xs text-spotnicik-dark flex-1">
                      {Object.entries(p.features || {})
                        .filter(([k]) => k !== 'pricing_note')
                        .map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-2">
                            <span className="text-gray-500">{FEATURE_LABEL[k] || k}</span>
                            <span className="font-medium text-right">{formatFeatureValue(v)}</span>
                          </div>
                        ))}
                    </div>

                    {isPlatformAdmin && (
                      <div className="flex gap-2 mt-4 pt-3 border-t">
                        <button
                          onClick={() => openEdit(p)}
                          className="flex-1 text-xs px-2 py-1.5 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light transition"
                        >
                          Editar
                        </button>
                        {p.is_active && (
                          <button
                            onClick={() => handleDeactivate(p)}
                            className="text-xs px-2 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                          >
                            Desativar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Demais produtos em tabela */}
          {others.length > 0 && (
            <div>
              <h3 className="font-semibold text-spotnicik-dark mb-3">Serviços e Adicionais</h3>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-spotnicik-light">
                      <tr>
                        <th className="text-left px-4 py-2">Produto</th>
                        <th className="text-left px-4 py-2">Tipo</th>
                        <th className="text-left px-4 py-2">Categoria</th>
                        <th className="text-left px-4 py-2">Preço</th>
                        {isPlatformAdmin && <th className="text-right px-4 py-2">Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {others.map((p) => (
                        <tr key={p.id} className={`border-t border-gray-100 ${!p.is_active ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-spotnicik-dark">{p.name}</div>
                            <div className="text-[11px] font-mono text-gray-400">{p.code}</div>
                            {p.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{TYPE_LABEL[p.type] || p.type}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {CATEGORY_LABEL[p.service_category] || p.service_category}
                          </td>
                          <td className="px-4 py-3">
                            {Number(p.base_price) > 0 ? (
                              <span className="font-medium text-spotnicik-primary">
                                R$ {Number(p.base_price).toFixed(2)}
                                <span className="text-xs font-normal text-gray-400">
                                  {CYCLE_LABEL[p.billing_cycle] || ''}
                                </span>
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                {p.features?.pricing_note || 'Sob consulta'}
                              </span>
                            )}
                          </td>
                          {isPlatformAdmin && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => openEdit(p)}
                                  className="text-xs px-3 py-1.5 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light transition"
                                >
                                  Editar
                                </button>
                                {p.is_active && (
                                  <button
                                    onClick={() => handleDeactivate(p)}
                                    className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                                  >
                                    Desativar
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {products.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
              Nenhum produto cadastrado.
            </div>
          )}
        </>
      )}

      {/* ---- Formulário ---- */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-spotnicik-primary mb-4">
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </h3>

            {formError && (
              <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{formError}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Código *</label>
                  <input
                    name="code" value={form.code} onChange={handleChange}
                    disabled={!!editingId}
                    placeholder="SPOT_BUSINESS"
                    className={`${inputCls} font-mono ${editingId ? 'bg-gray-100' : ''}`}
                  />
                  {editingId && (
                    <p className="text-[11px] text-gray-400 mt-1">O código não pode ser alterado.</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Nome *</label>
                  <input name="name" value={form.name} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Descrição</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={2} className={inputCls} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Tipo *</label>
                  <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                    Categoria de Serviço *
                  </label>
                  <select name="service_category" value={form.service_category} onChange={handleChange} className={inputCls}>
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Define a regra de "um contrato ativo por local + serviço".
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                    Preço base (R$) *
                  </label>
                  <input
                    type="number" step="0.01" min="0"
                    name="base_price" value={form.base_price} onChange={handleChange}
                    className={inputCls}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Use 0 para "sob consulta".</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Ciclo de cobrança</label>
                  <select name="billing_cycle" value={form.billing_cycle} onChange={handleChange} className={inputCls}>
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                    <option value="one_time">Cobrança única</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                  Recursos (JSON)
                </label>
                <textarea
                  name="features" value={form.features} onChange={handleChange} rows={8}
                  className={`${inputCls} font-mono text-xs`}
                  placeholder='{"max_locations": 3, "support": "email_chat"}'
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Define limites e recursos do plano. Campos livres — não exige alteração no sistema.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                Produto ativo (disponível para novos contratos)
              </label>
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
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
