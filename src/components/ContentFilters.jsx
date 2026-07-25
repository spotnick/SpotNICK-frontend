import { useState } from 'react';
import api from '../services/api';

// Categorias oferecidas — a chave bate com o CATEGORY_MAP do backend
const CATEGORIES = [
  { key: 'adult', label: 'Conteúdo adulto', icon: '🔞', desc: 'Pornografia e conteúdo sexual' },
  { key: 'streaming', label: 'Streaming de vídeo', icon: '🎬', desc: 'Netflix, YouTube pesado, etc.' },
  { key: 'social', label: 'Redes sociais', icon: '📱', desc: 'Facebook, Instagram, TikTok...' },
  { key: 'gaming', label: 'Jogos', icon: '🎮', desc: 'Plataformas e sites de jogos' },
  { key: 'gambling', label: 'Apostas', icon: '🎰', desc: 'Cassinos e jogos de azar' },
  { key: 'piracy', label: 'Pirataria', icon: '⬇️', desc: 'Torrents e downloads ilegais' },
  { key: 'dating', label: 'Namoro', icon: '💘', desc: 'Sites e apps de relacionamento' },
];

const EXTRAS = [
  { key: 'safeSearch', label: 'Busca segura (SafeSearch)', desc: 'Força filtro seguro no Google/Bing' },
  { key: 'youtubeRestricted', label: 'YouTube modo restrito', desc: 'Oculta conteúdo adulto no YouTube' },
];

export default function ContentFilters({ locationId, initialFilters }) {
  const [filters, setFilters] = useState(initialFilters || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const toggle = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleApply = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/admin/locations/${locationId}/content-filters`, { filters });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao aplicar filtros.');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      <p className="text-sm font-medium text-spotnicik-dark mb-1">Filtro de conteúdo</p>
      <p className="text-xs text-gray-500 mb-3">
        Marque as categorias a <strong>bloquear</strong> neste local. O filtro vale para todos os dispositivos conectados.
      </p>

      {error && (
        <div className="bg-red-100 text-red-700 text-xs p-2 rounded-lg mb-3">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-2 mb-3">
        {CATEGORIES.map((cat) => (
          <label
            key={cat.key}
            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${
              filters[cat.key]
                ? 'border-spotnicik-primary bg-spotnicik-light'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={!!filters[cat.key]}
              onChange={() => toggle(cat.key)}
              className="w-4 h-4"
            />
            <span className="text-lg">{cat.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-spotnicik-dark">{cat.label}</div>
              <div className="text-xs text-gray-400">{cat.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="border-t pt-3 mb-3 space-y-2">
        {EXTRAS.map((ex) => (
          <label key={ex.key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!filters[ex.key]}
              onChange={() => toggle(ex.key)}
              className="w-4 h-4"
            />
            <div>
              <div className="text-sm text-spotnicik-dark">{ex.label}</div>
              <div className="text-xs text-gray-400">{ex.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={handleApply}
        disabled={saving}
        className="w-full bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {saving
          ? 'Aplicando...'
          : saved
          ? '✓ Filtros aplicados!'
          : `Aplicar filtros${activeCount > 0 ? ` (${activeCount} ativo${activeCount > 1 ? 's' : ''})` : ''}`}
      </button>
      <p className="text-[11px] text-gray-400 mt-2 text-center">
        Os filtros são aplicados na nuvem e valem imediatamente para novas conexões.
      </p>
    </div>
  );
}
