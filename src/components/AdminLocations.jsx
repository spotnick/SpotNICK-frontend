import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import LocationPicker from './LocationPicker';
import ContentFilters from './ContentFilters';
import LocationAdmins from './LocationAdmins';

const BILLING_LABELS = {
  free: 'Grátis',
  paid: 'Pago',
  free_then_paid: 'Grátis, depois pago',
};

const MAX_BANNER_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_BANNER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const emptyForm = {
  name: '',
  billing_mode: 'free',
  free_minutes: 0,
  show_ads: false,
  speed_limit: '',
  session_timeout: '',
  data_quota_mb: '',
  address: '',
  latitude: null,
  longitude: null,
};

export default function AdminLocations({ isOwner }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Estado da publicidade
  const [bannerUrl, setBannerUrl] = useState(null);
  const [adLink, setAdLink] = useState('');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState(null);

  // Acesso à função de Campanhas (só o dono controla)
  const [campaignsEnabled, setCampaignsEnabled] = useState(false);
  const [savingCampaignsAccess, setSavingCampaignsAccess] = useState(false);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/locations');
      setLocations(data.locations || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar locais.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setBannerUrl(null);
    setAdLink('');
    setBannerError(null);
    setShowForm(true);
  };

  const openEdit = (loc) => {
    setEditing(loc);
    setForm({
      name: loc.name,
      billing_mode: loc.billing_mode,
      free_minutes: loc.free_minutes || 0,
      show_ads: loc.show_ads || false,
      speed_limit: loc.speed_limit || '',
      session_timeout: loc.session_timeout || '',
      data_quota_mb: loc.data_quota_mb || '',
      address: loc.address || '',
      latitude: loc.latitude ?? null,
      longitude: loc.longitude ?? null,
    });
    setBannerUrl(loc.ad_config?.banner_url || null);
    setAdLink(loc.ad_config?.link_url || '');
    setBannerError(null);
    setCampaignsEnabled(!!loc.campaigns_enabled);
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleLocationPick = ({ latitude, longitude, address }) => {
    setForm((prev) => ({
      ...prev,
      latitude,
      longitude,
      address: address !== null ? address : prev.address,
    }));
  };

  const handleBannerFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerError(null);

    // Validação no frontend (revalidada no backend)
    if (!ALLOWED_BANNER_TYPES.includes(file.type)) {
      setBannerError('Formato inválido. Use JPG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_BANNER_SIZE) {
      setBannerError('Imagem muito grande. Máximo 2 MB.');
      return;
    }

    setUploadingBanner(true);
    try {
      const fd = new FormData();
      fd.append('banner', file);
      const { data } = await api.post(
        `/api/admin/locations/${editing.id}/banner`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setBannerUrl(data.banner_url);
    } catch (err) {
      setBannerError(err.response?.data?.error || 'Erro ao enviar imagem.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSaveAdLink = async () => {
    try {
      await api.patch(`/api/admin/locations/${editing.id}/ad-link`, { link_url: adLink || null });
    } catch (err) {
      setBannerError('Erro ao salvar o link.');
    }
  };

  const handleRemoveBanner = async () => {
    if (!window.confirm('Remover o banner deste local?')) return;
    try {
      await api.delete(`/api/admin/locations/${editing.id}/banner`);
      setBannerUrl(null);
    } catch (err) {
      setBannerError('Erro ao remover banner.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        billing_mode: form.billing_mode,
        free_minutes: form.billing_mode === 'free_then_paid' ? Number(form.free_minutes) : 0,
        show_ads: form.show_ads,
        speed_limit: form.speed_limit.trim() || null,
        session_timeout: form.session_timeout ? Number(form.session_timeout) : null,
        data_quota_mb: form.data_quota_mb ? Number(form.data_quota_mb) : null,
        address: form.address || null,
        latitude: form.latitude,
        longitude: form.longitude,
      };
      if (editing) {
        await api.patch(`/api/admin/locations/${editing.id}`, payload);
        // Salva o link do anúncio junto (se houver banner)
        if (form.show_ads) await handleSaveAdLink();
      } else {
        await api.post('/api/admin/locations', payload);
      }
      setShowForm(false);
      await loadLocations();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar local.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (loc) => {
    try {
      await api.patch(`/api/admin/locations/${loc.id}`, { is_active: !loc.is_active });
      await loadLocations();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar status.');
    }
  };

  const handleToggleCampaigns = async () => {
    const novoValor = !campaignsEnabled;
    setSavingCampaignsAccess(true);
    try {
      await api.patch(`/api/admin/locations/${editing.id}/campaigns-access`, { enabled: novoValor });
      setCampaignsEnabled(novoValor);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar acesso.');
    } finally {
      setSavingCampaignsAccess(false);
    }
  };

  const handleDelete = async (loc) => {
    if (!window.confirm(`Excluir o local "${loc.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/api/admin/locations/${loc.id}`);
      await loadLocations();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir local.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-spotnicik-primary">Gestão de Locais</h2>
        {isOwner && (
          <button
            onClick={openCreate}
            className="bg-spotnicik-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            + Novo Local
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : locations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-spotnicik-dark">
          Nenhum local cadastrado.
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <div key={loc.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-spotnicik-dark">{loc.name}</span>
                    {loc.is_active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativo</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Inativo</span>
                    )}
                    {loc.latitude != null && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📍 No mapa</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>Cobrança: <strong>{BILLING_LABELS[loc.billing_mode]}</strong>
                      {loc.billing_mode === 'free_then_paid' && ` (${loc.free_minutes} min grátis)`}
                    </span>
                    <span>Publicidade: <strong>{loc.show_ads ? 'Sim' : 'Não'}</strong></span>
                    <span className="text-gray-400">/{loc.slug}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(loc)}
                    className="text-sm px-3 py-1.5 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Editar
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => toggleActive(loc)}
                        className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
                      >
                        {loc.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleDelete(loc)}
                        className="text-sm px-3 py-1.5 border border-red-400 text-red-600 rounded-lg font-medium hover:bg-red-50 transition"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário (modal) */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-spotnicik-primary mb-4">
              {editing ? 'Editar Local' : 'Novo Local'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-spotnicik-dark mb-1">Nome</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                  placeholder="Ex: Café Central"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-spotnicik-dark mb-1">Modo de Cobrança</label>
                <select
                  name="billing_mode"
                  value={form.billing_mode}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                >
                  <option value="free">Grátis (só cadastro)</option>
                  <option value="paid">Pago</option>
                  <option value="free_then_paid">Grátis por X minutos, depois pago</option>
                </select>
              </div>

              {form.billing_mode === 'free_then_paid' && (
                <div>
                  <label className="block text-sm font-medium text-spotnicik-dark mb-1">Minutos grátis</label>
                  <input
                    type="number"
                    name="free_minutes"
                    min="0"
                    value={form.free_minutes}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                  />
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-spotnicik-dark mb-3">Limites de rede (opcional)</p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-spotnicik-dark mb-1">Velocidade (up/down)</label>
                    <input
                      type="text"
                      name="speed_limit"
                      value={form.speed_limit}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                      placeholder="5M/10M"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-spotnicik-dark mb-1">Sessão (segundos)</label>
                    <input
                      type="number"
                      name="session_timeout"
                      min="0"
                      value={form.session_timeout}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                      placeholder="3600"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">Quota de dados (MB por sessão)</label>
                  <input
                    type="number"
                    name="data_quota_mb"
                    min="0"
                    value={form.data_quota_mb}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                    placeholder="500 (vazio = ilimitado)"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <LocationPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onChange={handleLocationPick}
                />
                <div className="mt-2">
                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                    Endereço (opcional, exibido para o usuário)
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                    placeholder="Rua Exemplo, 123 - Centro"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="show_ads"
                  id="show_ads"
                  checked={form.show_ads}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <label htmlFor="show_ads" className="text-sm text-spotnicik-dark">
                  Exibir publicidade após o login
                </label>
              </div>

              {/* Seção de publicidade — só ao editar (precisa do ID do local) e com show_ads ligado */}
              {form.show_ads && editing && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-spotnicik-dark mb-3">Banner de publicidade</p>

                  {bannerUrl && (
                    <div className="mb-3">
                      <img
                        src={bannerUrl}
                        alt="Banner atual"
                        className="w-full rounded-lg border border-gray-200"
                        style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveBanner}
                        className="mt-2 text-xs text-red-600 hover:underline"
                      >
                        Remover banner
                      </button>
                    </div>
                  )}

                  <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                    {bannerUrl ? 'Trocar imagem' : 'Enviar imagem'} (JPG, PNG ou WebP · máx. 2 MB · ideal 16:9)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleBannerFile}
                    disabled={uploadingBanner}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-spotnicik-primary file:text-white file:font-medium hover:file:bg-blue-700 file:cursor-pointer"
                  />
                  {uploadingBanner && (
                    <p className="text-xs text-gray-500 mt-1">Enviando imagem...</p>
                  )}
                  {bannerError && (
                    <p className="text-xs text-red-600 mt-1">{bannerError}</p>
                  )}

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-spotnicik-dark mb-1">
                      Link ao clicar no banner (opcional)
                    </label>
                    <input
                      type="url"
                      value={adLink}
                      onChange={(e) => setAdLink(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                      placeholder="https://sua-loja.com/promocao"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      O link é salvo junto ao clicar em "Salvar".
                    </p>
                  </div>
                </div>
              )}

              {/* Filtro de conteúdo (NextDNS) — só ao editar (precisa do ID) */}
              {editing && (
                <div className="border-t pt-4">
                  <ContentFilters
                    locationId={editing.id}
                    initialFilters={editing.content_filters || {}}
                  />
                </div>
              )}
              {/* Administradores do local — apenas o dono pode gerenciar */}
              {editing && isOwner && (
                <div className="border-t pt-4">
                  <LocationAdmins locationId={editing.id} />
                </div>
              )}

              {/* Acesso à função de Campanhas — apenas o dono controla */}
              {editing && isOwner && (
                <div className="border-t pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-spotnicik-dark">Função de Campanhas</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Permite que o admin deste local envie campanhas de e-mail/SMS (créditos comprados
                        separadamente por ele, sem custo pra você).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleCampaigns}
                      disabled={savingCampaignsAccess}
                      className={`shrink-0 relative w-12 h-6 rounded-full transition ${
                        campaignsEnabled ? 'bg-spotnicik-primary' : 'bg-gray-300'
                      } disabled:opacity-50`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          campaignsEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
              {form.show_ads && !editing && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500">
                    💡 Salve o local primeiro. Depois, edite-o para enviar o banner de publicidade.
                  </p>
                </div>
              )}

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
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
