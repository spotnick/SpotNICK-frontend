import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ROLE_LABEL = {
  platform_owner: 'Dono da Plataforma',
  platform_support: 'Suporte da Plataforma',
  company_admin: 'Admin da Empresa',
  location_admin: 'Admin de Local',
  financeiro: 'Financeiro',
  tecnico: 'Técnico',
  operador: 'Operador',
};

const SCOPE_LABEL = {
  platform: 'Plataforma',
  company: 'Empresa',
  location: 'Local',
};

// Quais papéis fazem sentido em cada escopo
const ROLES_BY_SCOPE = {
  platform: ['platform_owner', 'platform_support'],
  company: ['company_admin', 'financeiro', 'tecnico', 'operador'],
  location: ['location_admin', 'tecnico', 'operador'],
};

const EMPTY_FORM = {
  name: '', email: '', phone: '', password: '', company_id: '',
};

export default function AdminAdmins({ isPlatformAdmin, currentAdminId }) {
  const [admins, setAdmins] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/admin-users');
      setAdmins(data.admins || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar administradores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  useEffect(() => {
    (async () => {
      try {
        const [c, l] = await Promise.all([
          api.get('/api/admin/companies'),
          api.get('/api/admin/locations'),
        ]);
        setCompanies(c.data.companies || []);
        setLocations(l.data.locations || []);
      } catch { /* ignora */ }
    })();
  }, []);

  // Fecha o menu de ações ao clicar em qualquer outro lugar
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openMenuId]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setRoles([{ scope_type: isPlatformAdmin ? 'company' : 'location', role: '', location_id: '' }]);
    setEditingId(null);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (a) => {
    setForm({
      name: a.name, email: a.email, phone: a.phone || '',
      password: '', company_id: a.company_id || '',
    });
    setRoles(a.roles.map((r) => ({
      scope_type: r.scope_type, role: r.role, location_id: r.location_id || '',
    })));
    setEditingId(a.id);
    setFormError(null);
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addRole = () => {
    setRoles((prev) => [...prev, { scope_type: 'location', role: '', location_id: '' }]);
  };

  const updateRole = (idx, field, value) => {
    setRoles((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, [field]: value };
      // Ao trocar o escopo, limpa o papel (as opções mudam)
      if (field === 'scope_type') {
        updated.role = '';
        updated.location_id = '';
      }
      return updated;
    }));
  };

  const removeRole = (idx) => {
    setRoles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError('Informe o nome.'); return; }
    if (!form.email.trim()) { setFormError('Informe o e-mail.'); return; }
    if (!editingId && form.password.length < 8) {
      setFormError('A senha precisa de ao menos 8 caracteres.');
      return;
    }
    if (roles.length === 0) { setFormError('Adicione ao menos um papel.'); return; }
    if (roles.some((r) => !r.role)) { setFormError('Todos os papéis precisam ser escolhidos.'); return; }
    if (roles.some((r) => r.scope_type === 'location' && !r.location_id)) {
      setFormError('Papéis de local precisam ter um local selecionado.');
      return;
    }

    const hasCompanyScope = roles.some((r) => r.scope_type === 'company');
    if (hasCompanyScope && !form.company_id) {
      setFormError('Papéis de empresa exigem selecionar a empresa.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone || null,
        company_id: form.company_id || null,
        roles: roles.map((r) => ({
          role: r.role,
          scope_type: r.scope_type,
          location_id: r.scope_type === 'location' ? r.location_id : null,
        })),
      };
      if (form.password) payload.password = form.password;

      if (editingId) {
        await api.patch(`/api/admin/admin-users/${editingId}`, payload);
      } else {
        await api.post('/api/admin/admin-users', payload);
      }

      setShowForm(false);
      await loadAdmins();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Erro ao salvar administrador.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (a) => {
    const action = a.is_active ? 'desativar' : 'reativar';
    if (!window.confirm(`Confirma ${action} o acesso de ${a.name}?`)) return;
    try {
      await api.patch(`/api/admin/admin-users/${a.id}`, { is_active: !a.is_active });
      await loadAdmins();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar status.');
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(
      `Remover o acesso administrativo de ${a.name}? As sessões ativas dele serão encerradas.`
    )) return;
    try {
      await api.delete(`/api/admin/admin-users/${a.id}`);
      await loadAdmins();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover.');
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-spotnicik-primary';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary">Administradores</h2>
          <p className="text-xs text-gray-500 mt-1">
            Quem acessa o painel e com qual alcance. Diferente dos usuários de Wi-Fi.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-spotnicik-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          + Novo Administrador
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : admins.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
          Nenhum administrador cadastrado.
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((a) => (
            <div key={a.id} className={`bg-white rounded-lg shadow p-4 ${!a.is_active ? 'opacity-60' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-spotnicik-dark">{a.name}</span>
                    {a.is_platform && (
                      <span className="text-xs bg-spotnicik-dark text-white px-2 py-0.5 rounded-full">
                        Plataforma
                      </span>
                    )}
                    {!a.is_active && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Desativado
                      </span>
                    )}
                    {a.id === currentAdminId && (
                      <span className="text-xs bg-spotnicik-cyan text-spotnicik-dark px-2 py-0.5 rounded-full">
                        Você
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    {a.email}
                    {a.company_name && ` · ${a.company_name}`}
                    {a.last_login_at && ` · último acesso ${new Date(a.last_login_at).toLocaleDateString('pt-BR')}`}
                  </div>

                  <div className="flex gap-1 mt-2 flex-wrap">
                    {a.roles.map((r, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-spotnicik-light text-spotnicik-dark px-2 py-0.5 rounded-full"
                        title={`Escopo: ${SCOPE_LABEL[r.scope_type] || r.scope_type}`}
                      >
                        {ROLE_LABEL[r.role] || r.role}
                        {r.location_name && ` (${r.location_name})`}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 items-center shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="text-sm px-3 py-1.5 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light transition"
                  >
                    Editar
                  </button>

                  {a.id !== currentAdminId && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === a.id ? null : a.id);
                        }}
                        className="text-sm px-2.5 py-1.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                        title="Mais ações"
                      >
                        &#8942;
                      </button>

                      {openMenuId === a.id && (
                        <div
                          className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[180px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setOpenMenuId(null); toggleActive(a); }}
                            className={`w-full text-left px-4 py-2 text-sm transition ${
                              a.is_active
                                ? 'text-spotnicik-dark hover:bg-spotnicik-light'
                                : 'text-green-700 hover:bg-green-50'
                            }`}
                          >
                            {a.is_active ? 'Desativar acesso' : 'Reativar acesso'}
                          </button>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={() => { setOpenMenuId(null); handleDelete(a); }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                          >
                            Remover administrador
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
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
              {editingId ? 'Editar Administrador' : 'Novo Administrador'}
            </h3>

            {formError && (
              <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{formError}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Nome *</label>
                  <input name="name" value={form.name} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">E-mail *</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Telefone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                    Senha {editingId ? '(deixe vazio para manter)' : '*'}
                  </label>
                  <input
                    type="password" name="password" value={form.password} onChange={handleChange}
                    placeholder={editingId ? 'Manter atual' : 'Mínimo 8 caracteres'}
                    className={inputCls}
                  />
                </div>
              </div>

              {isPlatformAdmin && (
                <div>
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                    Empresa (deixe vazio para equipe da plataforma)
                  </label>
                  <select name="company_id" value={form.company_id} onChange={handleChange} className={inputCls}>
                    <option value="">— Equipe SpotNICK (plataforma) —</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.trade_name || c.legal_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Papéis */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold text-spotnicik-dark">Papéis e Alcance *</p>
                  <button
                    onClick={addRole}
                    className="text-xs px-3 py-1.5 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light transition"
                  >
                    + Adicionar papel
                  </button>
                </div>

                {roles.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum papel. Adicione ao menos um.</p>
                ) : (
                  <div className="space-y-2">
                    {roles.map((r, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                        <div className="col-span-12 md:col-span-3">
                          <select
                            value={r.scope_type}
                            onChange={(e) => updateRole(idx, 'scope_type', e.target.value)}
                            className={inputCls}
                          >
                            {isPlatformAdmin && <option value="platform">Plataforma</option>}
                            <option value="company">Empresa</option>
                            <option value="location">Local</option>
                          </select>
                        </div>

                        <div className={`col-span-12 ${r.scope_type === 'location' ? 'md:col-span-4' : 'md:col-span-8'}`}>
                          <select
                            value={r.role}
                            onChange={(e) => updateRole(idx, 'role', e.target.value)}
                            className={inputCls}
                          >
                            <option value="">Papel...</option>
                            {(ROLES_BY_SCOPE[r.scope_type] || []).map((role) => (
                              <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                            ))}
                          </select>
                        </div>

                        {r.scope_type === 'location' && (
                          <div className="col-span-10 md:col-span-4">
                            <select
                              value={r.location_id}
                              onChange={(e) => updateRole(idx, 'location_id', e.target.value)}
                              className={inputCls}
                            >
                              <option value="">Local...</option>
                              {locations.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="col-span-2 md:col-span-1 text-right">
                          <button
                            onClick={() => removeRole(idx)}
                            className="text-red-600 hover:text-red-800 text-lg leading-none"
                            title="Remover papel"
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[11px] text-gray-400 mt-2">
                  Plataforma = acesso total ao sistema. Empresa = todos os locais da empresa.
                  Local = apenas o local escolhido.
                </p>
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
    </div>
  );
}
