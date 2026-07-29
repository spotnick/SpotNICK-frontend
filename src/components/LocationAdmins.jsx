import { useState, useEffect } from 'react';
import api from '../services/api';

export default function LocationAdmins({ locationId }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/admin/locations/${locationId}/admins`);
      setAdmins(data.admins || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar administradores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const handleAdd = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setAdding(true);
    setError(null);
    try {
      // Busca o usuário pelo email exato
      const { data: searchData } = await api.get('/api/admin/users', {
        params: { search: trimmed, limit: 5 },
      });
      const match = (searchData.users || []).find((u) => u.email.toLowerCase() === trimmed);

      if (!match) {
        setError('Nenhum usuário encontrado com esse email. Ele precisa ter uma conta no SpotNICK primeiro.');
        return;
      }

      if (admins.some((a) => a.id === match.id)) {
        setError('Este usuário já administra este local.');
        return;
      }

      await api.post(`/api/admin/users/${match.id}/make-location-admin`, { location_id: locationId });
      setEmail('');
      await loadAdmins();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao adicionar administrador.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remover este administrador do local?')) return;
    try {
      await api.delete(`/api/admin/users/${userId}/location-admin/${locationId}`);
      await loadAdmins();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover administrador.');
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-spotnicik-dark mb-1">Administradores deste local</p>
      <p className="text-xs text-gray-500 mb-3">
        Pessoas com acesso apenas a este local no painel (não podem ver outros locais, usuários globais ou o saldo SMS).
      </p>

      {loading ? (
        <div className="text-center py-3">
          <div className="w-5 h-5 border-2 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {admins.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhum administrador atribuído ainda.</p>
          ) : (
            admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-spotnicik-light rounded-lg px-3 py-2">
                <div>
                  <div className="text-sm text-spotnicik-dark font-medium">{a.name}</div>
                  <div className="text-xs text-gray-500">{a.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(a.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remover
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-100 text-red-700 text-xs p-2 rounded-lg mb-2">{error}</div>
      )}

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAdd(e);
            }
          }}
          placeholder="email@exemplo.com"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="text-sm px-4 py-2 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
        >
          {adding ? '...' : '+ Adicionar'}
        </button>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        A pessoa precisa já ter uma conta no SpotNICK (cadastro normal) antes de ser adicionada aqui.
      </p>
    </div>
  );
}
