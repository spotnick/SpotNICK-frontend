import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const STATUS_INFO = {
  online:  { label: 'Online',  classes: 'bg-green-100 text-green-700' },
  offline: { label: 'Offline', classes: 'bg-red-100 text-red-700' },
  never:   { label: 'Nunca conectou', classes: 'bg-gray-100 text-gray-600' },
};

const ROUTER_TYPE_LABEL = {
  wifi_direct: '📶 WiFi próprio',
  ethernet_ap: '🔌 Ethernet → AP externo',
};

// Considera "online" se o heartbeat chegou nos últimos 10 minutos
function getStatus(lastHeartbeatAt) {
  if (!lastHeartbeatAt) return 'never';
  const minutesSince = (Date.now() - new Date(lastHeartbeatAt).getTime()) / 60000;
  return minutesSince <= 10 ? 'online' : 'offline';
}

export default function AdminMikrotikRouters() {
  const [routers, setRouters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filterLocation, setFilterLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ location_id: '', name: '', router_type: 'wifi_direct', ethernet_port: 'ether2' });
  const [saving, setSaving] = useState(false);
  const [scriptModal, setScriptModal] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/admin/locations');
        setLocations(data.locations || []);
      } catch { /* ignora */ }
    })();
  }, []);

  const loadRouters = useCallback(async (locId) => {
    setLoading(true);
    setError(null);
    try {
      const params = locId ? { location_id: locId } : {};
      const { data } = await api.get('/api/admin/mikrotik-routers', { params });
      setRouters(data.routers || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar roteadores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRouters(filterLocation);
  }, [loadRouters, filterLocation]);

  const openCreate = () => {
    setForm({ location_id: filterLocation || (locations[0]?.id || ''), name: '', router_type: 'wifi_direct', ethernet_port: 'ether2' });
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location_id || !form.name.trim()) {
      alert('Preencha o local e o nome do roteador.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/api/admin/mikrotik-routers', form);
      setShowForm(false);
      await loadRouters(filterLocation);
      setScriptModal({ name: data.router.name, script: data.script });
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao cadastrar roteador.');
    } finally {
      setSaving(false);
    }
  };

  const openScript = async (routerItem) => {
    try {
      const { data } = await api.get(`/api/admin/mikrotik-routers/${routerItem.id}/script`);
      setScriptModal({ name: routerItem.name, script: data.script });
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao obter o script.');
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptModal.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (routerItem) => {
    if (!window.confirm(`Remover o roteador "${routerItem.name}"? Ele deixará de autenticar no RADIUS.`)) return;
    try {
      await api.delete(`/api/admin/mikrotik-routers/${routerItem.id}`);
      await loadRouters(filterLocation);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover.');
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString('pt-BR') : '-';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-spotnicik-primary">Roteadores Mikrotik</h2>
        <div className="flex gap-2">
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
          >
            <option value="">Todos os locais</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button
            onClick={openCreate}
            disabled={locations.length === 0}
            className="bg-spotnicik-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition whitespace-nowrap"
          >
            + Novo Roteador
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : routers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
          Nenhum roteador cadastrado.
        </div>
      ) : (
        <div className="space-y-3">
          {routers.map((r) => {
            const status = getStatus(r.last_heartbeat_at);
            const st = STATUS_INFO[status];
            return (
              <div key={r.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-spotnicik-dark">{r.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${st.classes}`}>{st.label}</span>
                      {!r.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {r.locations?.name && <span>📍 {r.locations.name}</span>}
                      <span>{ROUTER_TYPE_LABEL[r.router_type] || ROUTER_TYPE_LABEL.wifi_direct}</span>
                      {r.current_ip && <span>IP: {r.current_ip}</span>}
                      <span>Último sinal: {formatDate(r.last_heartbeat_at)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openScript(r)}
                      className="text-sm px-3 py-1.5 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                      Ver script
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="text-sm px-3 py-1.5 border border-red-400 text-red-600 rounded-lg font-medium hover:bg-red-50 transition"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulário de cadastro */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-spotnicik-primary mb-4">Novo Roteador</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-spotnicik-dark mb-1">Local *</label>
                <select
                  name="location_id"
                  value={form.location_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                  required
                >
                  <option value="">Selecione...</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-spotnicik-dark mb-1">Nome do Roteador *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                  placeholder="Roteador Principal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-spotnicik-dark mb-2">Como o WiFi é distribuído? *</label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      form.router_type === 'wifi_direct'
                        ? 'border-spotnicik-primary bg-spotnicik-light'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="router_type"
                      value="wifi_direct"
                      checked={form.router_type === 'wifi_direct'}
                      onChange={handleChange}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium text-spotnicik-dark">📶 WiFi próprio deste roteador</div>
                      <div className="text-xs text-gray-500">O HotSpot roda direto na interface WiFi do Mikrotik.</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      form.router_type === 'ethernet_ap'
                        ? 'border-spotnicik-primary bg-spotnicik-light'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="router_type"
                      value="ethernet_ap"
                      checked={form.router_type === 'ethernet_ap'}
                      onChange={handleChange}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium text-spotnicik-dark">🔌 Ethernet → Access Point externo</div>
                      <div className="text-xs text-gray-500">
                        Este Mikrotik só gerencia o HotSpot; a distribuição sem fio é feita
                        por um AP externo (de terceiros).
                      </div>
                    </div>
                  </label>
                </div>

                {form.router_type === 'ethernet_ap' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                      Porta Ethernet de saída
                    </label>
                    <input
                      type="text"
                      name="ethernet_port"
                      value={form.ethernet_port}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                      placeholder="ether2"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Varia por equipamento: ether2, sfp2, combo1... Confira em <code>/interface print</code> no Mikrotik.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {saving ? 'Criando...' : 'Criar e gerar script'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal do script */}
      {scriptModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
          onClick={() => setScriptModal(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-spotnicik-primary">
                Script — {scriptModal.name}
              </h3>
              <button
                onClick={() => setScriptModal(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-3">
              Cole estas linhas no <strong>New Terminal</strong> do Winbox, no roteador do local correspondente.
              O Mikrotik vai baixar e executar o restante do provisionamento sozinho — não é preciso colar
              nenhum outro comando.
            </p>

            <pre className="bg-spotnicik-dark text-green-400 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
              {scriptModal.script}
            </pre>

            <button
              onClick={handleCopyScript}
              className="mt-4 w-full bg-spotnicik-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              {copied ? '✓ Copiado!' : '📋 Copiar comandos'}
            </button>

            <p className="text-xs text-gray-400 mt-3 text-center">
              O provisionamento completo leva alguns segundos (baixa certificado e configura tudo).
              Aguarde a mensagem final antes de fechar o terminal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
