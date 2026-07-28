import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

// Formata bytes crus (ex: 340672) para "332.9 KB"
function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Formata minutos de saldo para exibição amigável (ex: "2h 30min", "45min", "3 dias")
function formatBalance(minutes) {
  const m = Number(minutes) || 0;
  if (m < 60) return `${m}min`;
  if (m < 1440) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}min` : `${h}h`;
  }
  const days = Math.floor(m / 1440);
  const remH = Math.floor((m % 1440) / 60);
  return remH > 0 ? `${days}d ${remH}h` : `${days} dia${days > 1 ? 's' : ''}`;
}

export default function StatusWifi() {
  const [searchParams] = useSearchParams();

  const username = searchParams.get('username') || '';
  const ip = searchParams.get('ip') || '';
  const bytesIn = searchParams.get('bytes-in') || '0';
  const bytesOut = searchParams.get('bytes-out') || '0';
  const sessionTimeLeft = searchParams.get('session-time-left') || '';
  const uptime = searchParams.get('uptime') || '';
  const logoutUrl = searchParams.get('logout') || '';
  const locationSlug = searchParams.get('location') || '';

  const [plan, setPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [ad, setAd] = useState(null);

  // Busca a publicidade do local (se houver)
  useEffect(() => {
    if (!locationSlug) return;
    (async () => {
      try {
        const { data } = await api.get('/api/portal/location-ad', {
          params: { location: locationSlug },
        });
        if (data?.show_ads && data?.banner_url) {
          setAd({ bannerUrl: data.banner_url, linkUrl: data.link_url });
        }
      } catch { /* sem anúncio, tudo bem */ }
    })();
  }, [locationSlug]);

  useEffect(() => {
    if (!username) {
      setLoadingPlan(false);
      return;
    }
    (async () => {
      try {
        const { data } = await api.get('/api/portal/active-plan', {
          params: { email: username },
        });
        setPlan(data.found ? data : null);
      } catch {
        setPlan(null);
      } finally {
        setLoadingPlan(false);
      }
    })();
  }, [username]);

  const handleNavigate = () => {
    // O usuário já está liberado para navegar (autenticado no HotSpot).
    // Mandamos para um site neutro — spotnick.app.br exigiria login no
    // app, o que não faz sentido aqui (o usuário é um convidado do WiFi).
    window.location.href = 'https://www.google.com';
  };

  const handleLogout = () => {
    if (logoutUrl) {
      window.location.href = logoutUrl;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotnicik-primary to-spotnicik-dark flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Cabeçalho com identidade SpotNICK */}
        <div className="bg-spotnicik-primary px-6 py-5 text-center">
          <h1 className="text-2xl font-bold text-white">SpotNICK</h1>
          <p className="text-blue-100 text-sm mt-0.5">Você está conectado! 🎉</p>
        </div>

        <div className="px-6 py-6">
          {username && (
            <p className="text-center text-spotnicik-dark mb-5">
              Olá, <strong>{username}</strong>!
            </p>
          )}

          {/* Dados da sessão atual */}
          <div className="bg-spotnicik-light rounded-xl p-4 mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase mb-3">Sessão atual</h2>
            <div className="space-y-2 text-sm">
              {ip && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Endereço IP</span>
                  <span className="text-spotnicik-dark font-medium">{ip}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Download / Upload</span>
                <span className="text-spotnicik-dark font-medium">
                  {formatBytes(bytesOut)} / {formatBytes(bytesIn)}
                </span>
              </div>
              {uptime && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tempo conectado</span>
                  <span className="text-spotnicik-dark font-medium">{uptime}</span>
                </div>
              )}
              {sessionTimeLeft && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tempo restante</span>
                  <span className="text-spotnicik-dark font-medium">{sessionTimeLeft}</span>
                </div>
              )}
            </div>
          </div>

          {/* Plano / pacotes ativos */}
          {loadingPlan ? (
            <div className="text-center py-3">
              <div className="w-6 h-6 border-2 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : plan ? (
            <div className="bg-spotnicik-light rounded-xl p-4 mb-5">
              <h2 className="text-xs font-semibold text-gray-500 uppercase mb-3">Seu saldo</h2>
              <div className="text-center">
                {plan.balance_minutes > 0 ? (
                  <>
                    <div className="text-3xl font-bold text-spotnicik-primary">
                      {formatBalance(plan.balance_minutes)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">de acesso disponível</div>
                  </>
                ) : (
                  <p className="text-gray-500 py-2">
                    Sem saldo ativo.<br />
                    <span className="text-xs">Adquira um pacote para continuar navegando.</span>
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {/* Publicidade do local (banner responsivo, se configurado) */}
          {ad && (
            <div className="mb-5">
              {ad.linkUrl ? (
                <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={ad.bannerUrl}
                    alt="Publicidade"
                    className="w-full rounded-xl"
                    style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                  />
                </a>
              ) : (
                <img
                  src={ad.bannerUrl}
                  alt="Publicidade"
                  className="w-full rounded-xl"
                  style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                />
              )}
            </div>
          )}

          {/* Ações */}
          <button
            onClick={handleNavigate}
            className="w-full bg-spotnicik-primary text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition mb-3"
          >
            🌐 Navegar na internet
          </button>

          {logoutUrl && (
            <button
              onClick={handleLogout}
              className="w-full bg-white border border-gray-300 text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition"
            >
              Desconectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
