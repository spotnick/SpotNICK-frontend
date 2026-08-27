import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const STATUS_INFO = {
  prospect:  { label: 'Prospect',     cls: 'bg-gray-100 text-gray-700' },
  trial:     { label: 'Trial',        cls: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Ativo',        cls: 'bg-green-100 text-green-700' },
  suspended: { label: 'Suspenso',     cls: 'bg-yellow-100 text-yellow-700' },
  overdue:   { label: 'Inadimplente', cls: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'Cancelado',    cls: 'bg-red-100 text-red-700' },
  expired:   { label: 'Expirado',     cls: 'bg-red-100 text-red-700' },
};

const ROLE_LABEL = {
  legal: 'Legal',
  financeiro: 'Financeiro',
  tecnico: 'Técnico',
  administrativo: 'Administrativo',
};

const EMPTY_FORM = {
  person_type: 'PJ', legal_name: '', trade_name: '', document: '',
  state_registration: '', city_registration: '', email: '', phone: '',
  address_street: '', address_number: '', address_complement: '',
  address_district: '', address_city: '', address_state: '', address_zip: '',
  commercial_status: 'prospect', notes: '',
};

const EMPTY_CONTACT = {
  name: '', email: '', phone: '', document: '', position: '', roles: [],
};

function formatDoc(doc) {
  const d = String(doc || '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc || '-';
}

export default function AdminCompanies({ isPlatformAdmin }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);
  const [editingContactId, setEditingContactId] = useState(null);
  const [savingContact, setSavingContact] = useState(false);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/companies');
      setCompanies(data.companies || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar empresas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  // Busca o registro COMPLETO antes de abrir a edição.
  // A listagem devolve só um subconjunto dos campos (nome, documento,
  // cidade...), então montar o formulário a partir dela deixaria
  // inscrição estadual, endereço e observações vazios — e o salvamento
  // apagaria esses dados no banco.
  const openEdit = async (c) => {
    setFormError(null);
    try {
      const { data } = await api.get(`/api/admin/companies/${c.id}`);
      setForm({ ...EMPTY_FORM, ...data.company });
    } catch {
      // Se a busca falhar, usa o que a listagem tem (melhor que nada,
      // mas avisa para não apagar dados sem querer)
      setForm({ ...EMPTY_FORM, ...c });
      setFormError('Não foi possível carregar todos os campos. Revise antes de salvar.');
    }
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        await api.patch(`/api/admin/companies/${editingId}`, form);
      } else {
        await api.post('/api/admin/companies', form);
      }
      setShowForm(false);
      await loadCompanies();
      if (detail?.company?.id === editingId) await openDetail(editingId);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar empresa.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Excluir a empresa "${c.legal_name}"? Esta ação preserva o histórico, mas remove a empresa das listagens.`)) return;
    try {
      await api.delete(`/api/admin/companies/${c.id}`);
      await loadCompanies();
      if (detail?.company?.id === c.id) setDetail(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir empresa.');
    }
  };

  const openDetail = async (id) => {
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/api/admin/companies/${id}`);
      setDetail(data);
      setContactForm(EMPTY_CONTACT);
      setEditingContactId(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao carregar detalhes.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleContactRole = (role) => {
    setContactForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleSaveContact = async () => {
    if (!contactForm.name.trim()) { alert('Informe o nome.'); return; }
    if (contactForm.roles.length === 0) { alert('Selecione ao menos um papel.'); return; }

    setSavingContact(true);
    try {
      if (editingContactId) {
        await api.patch(`/api/admin/contacts/${editingContactId}`, contactForm);
      } else {
        await api.post(`/api/admin/companies/${detail.company.id}/contacts`, contactForm);
      }
      setContactForm(EMPTY_CONTACT);
      setEditingContactId(null);
      await openDetail(detail.company.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar responsável.');
    } finally {
      setSavingContact(false);
    }
  };

  const editContact = (c) => {
    setContactForm({
      name: c.name || '', email: c.email || '', phone: c.phone || '',
      document: c.document || '', position: c.position || '', roles: c.roles || [],
    });
    setEditingContactId(c.id);
  };

  const removeContact = async (c) => {
    if (!window.confirm(`Remover ${c.name} dos responsáveis?`)) return;
    try {
      await api.delete(`/api/admin/contacts/${c.id}`);
      await openDetail(detail.company.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover.');
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-spotnicik-primary';

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary">Empresas</h2>
          <p className="text-xs text-gray-500 mt-1">
            Clientes que contratam o SpotNICK, seus responsáveis e locais.
          </p>
        </div>
        {isPlatformAdmin && (
          <button
            onClick={openCreate}
            className="bg-spotnicik-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Nova Empresa
          </button>
        )}
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : companies.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
          Nenhuma empresa cadastrada.
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => {
            const st = STATUS_INFO[c.commercial_status] || STATUS_INFO.prospect;
            return (
              <div key={c.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-spotnicik-dark">
                        {c.trade_name || c.legal_name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                      {c.is_internal && (
                        <span className="text-xs bg-spotnicik-dark text-white px-2 py-0.5 rounded-full">
                          Operação Própria
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{c.person_type === 'PJ' ? 'CNPJ' : 'CPF'}: {formatDoc(c.document)}</span>
                      {c.address_city && <span>📍 {c.address_city}/{c.address_state}</span>}
                      <span>{c.locations_count} local(is)</span>
                      {c.email && <span>{c.email}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDetail(c.id)}
                      className="text-sm px-3 py-1.5 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                      Detalhes
                    </button>
                    <button
                      onClick={() => openEdit(c)}
                      className="text-sm px-3 py-1.5 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light transition"
                    >
                      Editar
                    </button>
                    {isPlatformAdmin && !c.is_internal && (
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-sm px-3 py-1.5 border border-red-400 text-red-600 rounded-lg font-medium hover:bg-red-50 transition"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Formulário de empresa ---- */}
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
              {editingId ? 'Editar Empresa' : 'Nova Empresa'}
            </h3>

            {formError && (
              <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{formError}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Tipo *</label>
                  <select
                    name="person_type" value={form.person_type} onChange={handleChange}
                    disabled={!isPlatformAdmin} className={inputCls}
                  >
                    <option value="PJ">Pessoa Jurídica</option>
                    <option value="PF">Pessoa Física</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                    {form.person_type === 'PJ' ? 'Razão Social *' : 'Nome Completo *'}
                  </label>
                  <input
                    name="legal_name" value={form.legal_name} onChange={handleChange}
                    disabled={!isPlatformAdmin} className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Nome Fantasia</label>
                  <input name="trade_name" value={form.trade_name} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                    {form.person_type === 'PJ' ? 'CNPJ *' : 'CPF *'}
                  </label>
                  <input
                    name="document" value={form.document} onChange={handleChange}
                    disabled={!isPlatformAdmin} className={inputCls}
                  />
                </div>
              </div>

              {isPlatformAdmin && form.person_type === 'PJ' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-spotnicik-dark mb-1">Inscrição Estadual</label>
                    <input name="state_registration" value={form.state_registration} onChange={handleChange} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-spotnicik-dark mb-1">Inscrição Municipal</label>
                    <input name="city_registration" value={form.city_registration} onChange={handleChange} className={inputCls} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">E-mail</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Telefone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-spotnicik-dark mb-2">Endereço</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <input name="address_street" value={form.address_street} onChange={handleChange} placeholder="Rua" className={inputCls} />
                  </div>
                  <input name="address_number" value={form.address_number} onChange={handleChange} placeholder="Número" className={inputCls} />
                  <input name="address_complement" value={form.address_complement} onChange={handleChange} placeholder="Complemento" className={inputCls} />
                  <input name="address_district" value={form.address_district} onChange={handleChange} placeholder="Bairro" className={inputCls} />
                  <input name="address_city" value={form.address_city} onChange={handleChange} placeholder="Cidade" className={inputCls} />
                  <input name="address_state" value={form.address_state} onChange={handleChange} placeholder="UF" maxLength={2} className={inputCls} />
                  <input name="address_zip" value={form.address_zip} onChange={handleChange} placeholder="CEP" className={inputCls} />
                </div>
              </div>

              {isPlatformAdmin && (
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Status Comercial</label>
                  <select name="commercial_status" value={form.commercial_status} onChange={handleChange} className={inputCls}>
                    {Object.entries(STATUS_INFO).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-spotnicik-dark mb-1">Observações</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className={inputCls} />
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
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Detalhes: responsáveis e locais ---- */}
      {detail && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-spotnicik-primary">
                  {detail.company.trade_name || detail.company.legal_name}
                </h3>
                <p className="text-xs text-gray-500">
                  {detail.company.legal_name} · {formatDoc(detail.company.document)}
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
                {/* Locais */}
                <div className="mb-6">
                  <h4 className="font-semibold text-spotnicik-dark mb-2">
                    Locais ({detail.locations.length})
                  </h4>
                  {detail.locations.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum local vinculado.</p>
                  ) : (
                    <div className="space-y-1">
                      {detail.locations.map((l) => (
                        <div key={l.id} className="flex items-center justify-between bg-spotnicik-light rounded px-3 py-2 text-sm">
                          <span className="text-spotnicik-dark">{l.name}</span>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500">
                              {l.operation_mode === 'saas_b2b' ? 'SaaS B2B' : 'Operação B2C'}
                            </span>
                            {!l.is_active && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inativo</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Responsáveis */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-spotnicik-dark mb-2">
                    Responsáveis ({detail.contacts.length})
                  </h4>

                  {detail.contacts.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {detail.contacts.map((c) => (
                        <div key={c.id} className="flex items-start justify-between bg-spotnicik-light rounded-lg px-3 py-2">
                          <div className="text-sm">
                            <div className="font-medium text-spotnicik-dark">{c.name}</div>
                            <div className="text-xs text-gray-500">
                              {[c.position, c.email, c.phone].filter(Boolean).join(' · ') || '—'}
                            </div>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {(c.roles || []).map((r) => (
                                <span key={r} className="text-[11px] bg-spotnicik-primary text-white px-2 py-0.5 rounded-full">
                                  {ROLE_LABEL[r] || r}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 text-xs shrink-0 ml-2">
                            <button onClick={() => editContact(c)} className="text-spotnicik-primary hover:underline">Editar</button>
                            <button onClick={() => removeContact(c)} className="text-red-600 hover:underline">Remover</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulário de responsável */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-spotnicik-dark mb-2">
                      {editingContactId ? 'Editar responsável' : 'Adicionar responsável'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                      <input name="name" value={contactForm.name} onChange={handleContactChange} placeholder="Nome *" className={inputCls} />
                      <input name="position" value={contactForm.position} onChange={handleContactChange} placeholder="Cargo" className={inputCls} />
                      <input type="email" name="email" value={contactForm.email} onChange={handleContactChange} placeholder="E-mail" className={inputCls} />
                      <input name="phone" value={contactForm.phone} onChange={handleContactChange} placeholder="Telefone" className={inputCls} />
                      <input name="document" value={contactForm.document} onChange={handleContactChange} placeholder="CPF" className={inputCls} />
                    </div>

                    <p className="text-xs text-spotnicik-dark mb-1">Papéis * (pode marcar mais de um)</p>
                    <div className="flex gap-3 flex-wrap mb-3">
                      {Object.entries(ROLE_LABEL).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={contactForm.roles.includes(key)}
                            onChange={() => toggleContactRole(key)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      {editingContactId && (
                        <button
                          onClick={() => { setContactForm(EMPTY_CONTACT); setEditingContactId(null); }}
                          className="text-sm px-4 py-2 bg-gray-200 text-spotnicik-dark rounded-lg font-medium hover:bg-gray-300 transition"
                        >
                          Cancelar
                        </button>
                      )}
                      <button
                        onClick={handleSaveContact} disabled={savingContact}
                        className="text-sm px-4 py-2 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                      >
                        {savingContact ? 'Salvando...' : editingContactId ? 'Salvar' : '+ Adicionar'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
