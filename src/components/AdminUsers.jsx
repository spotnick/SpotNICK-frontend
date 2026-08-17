import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const formatCPF = (cpf) => {
  const c = String(cpf || '').replace(/\D/g, '');
  if (c.length !== 11) return cpf || '-';
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [offset, setOffset] = useState(0);
  const LIMIT = 20;

  // Edição de dados
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', cpf: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  const loadUsers = useCallback(async (searchTerm, off) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/users', {
        params: { search: searchTerm, limit: LIMIT, offset: off },
      });
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers('', 0);
  }, [loadUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setOffset(0);
    loadUsers(search, 0);
  };

  const toggleBlock = async (user) => {
    setBusy(user.id);
    try {
      const action = user.is_blocked ? 'unblock' : 'block';
      await api.post(`/api/admin/users/${user.id}/${action}`);
      await loadUsers(search, offset);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar status.');
    } finally {
      setBusy(null);
    }
  };

  const resendVerification = async (user) => {
    setBusy(user.id);
    try {
      await api.post(`/api/admin/users/${user.id}/resend-verification`);
      alert('Verificação reenviada com sucesso.');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao reenviar verificação.');
    } finally {
      setBusy(null);
    }
  };

  const setRole = async (user, newRole) => {
    const acao = newRole === 'owner' ? 'promover a DONO' : 'remover de DONO';
    if (!window.confirm(`Tem certeza que deseja ${acao} o usuário "${user.name}"?`)) return;
    setBusy(user.id);
    try {
      await api.post(`/api/admin/users/${user.id}/set-role`, { role: newRole });
      await loadUsers(search, offset);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar papel.');
    } finally {
      setBusy(null);
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      cpf: user.cpf || '',
    });
    setEditError(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    setEditError(null);
    try {
      await api.patch(`/api/admin/users/${editingUser.id}`, editForm);
      setEditingUser(null);
      await loadUsers(search, offset);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Erro ao salvar dados.');
    } finally {
      setSavingEdit(false);
    }
  };

  const changePage = (newOffset) => {
    setOffset(newOffset);
    loadUsers(search, newOffset);
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-spotnicik-primary mb-6">Gestão de Usuários</h2>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, email, CPF ou telefone..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
        />
        <button
          type="submit"
          className="bg-spotnicik-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Buscar
        </button>
      </form>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-spotnicik-dark">Carregando...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
          Nenhum usuário encontrado.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-spotnicik-light">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-spotnicik-dark">Nome</th>
                    <th className="text-left px-4 py-3 font-semibold text-spotnicik-dark">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-spotnicik-dark">CPF</th>
                    <th className="text-left px-4 py-3 font-semibold text-spotnicik-dark">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-spotnicik-dark">Cadastro</th>
                    <th className="text-right px-4 py-3 font-semibold text-spotnicik-dark">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <div className="font-medium text-spotnicik-dark">{u.name}</div>
                        {u.role === 'owner' && (
                          <span className="text-xs bg-spotnicik-primary text-white px-2 py-0.5 rounded-full">Dono</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {u.email}
                        {!u.email_verified && (
                          <span className="ml-1 text-xs text-yellow-600">(não verif.)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatCPF(u.cpf)}</td>
                      <td className="px-4 py-3">
                        {u.is_blocked ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Bloqueado</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end flex-wrap">
                          <button
                            onClick={() => openEdit(u)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium transition bg-white border border-spotnicik-primary text-spotnicik-primary hover:bg-spotnicik-light"
                          >
                            Editar
                          </button>
                          {!u.email_verified && (
                            <button
                              onClick={() => resendVerification(u)}
                              disabled={busy === u.id}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 bg-white border border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                              title="Reenvia pelo método de verificação escolhido no cadastro"
                            >
                              {busy === u.id ? '...' : 'Reenviar verificação'}
                            </button>
                          )}
                          {u.role === 'owner' ? (
                            <button
                              onClick={() => setRole(u, 'user')}
                              disabled={busy === u.id}
                              className="text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 bg-white border border-gray-400 text-gray-600 hover:bg-gray-50"
                            >
                              {busy === u.id ? '...' : 'Remover Dono'}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setRole(u, 'owner')}
                                disabled={busy === u.id}
                                className="text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 bg-spotnicik-primary text-white hover:bg-blue-700"
                              >
                                {busy === u.id ? '...' : 'Tornar Dono'}
                              </button>
                              <button
                                onClick={() => toggleBlock(u)}
                                disabled={busy === u.id}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 ${
                                  u.is_blocked
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-white border border-red-400 text-red-600 hover:bg-red-50'
                                }`}
                              >
                                {busy === u.id
                                  ? '...'
                                  : u.is_blocked
                                  ? 'Desbloquear'
                                  : 'Bloquear'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-500">
              Mostrando {offset + 1}–{Math.min(offset + LIMIT, total)} de {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => changePage(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Anterior
              </button>
              <button
                onClick={() => changePage(offset + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Próximo
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de edição */}
      {editingUser && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-spotnicik-primary mb-4">Editar Usuário</h3>

            {editError && (
              <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{editError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-spotnicik-dark mb-1">Nome</label>
                <input
                  type="text" name="name" value={editForm.name} onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-spotnicik-dark mb-1">E-mail</label>
                <input
                  type="email" name="email" value={editForm.email} onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-spotnicik-dark mb-1">Telefone</label>
                <input
                  type="text" name="phone" value={editForm.phone} onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-spotnicik-dark mb-1">CPF</label>
                <input
                  type="text" name="cpf" value={editForm.cpf} onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-gray-200 text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {savingEdit ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
