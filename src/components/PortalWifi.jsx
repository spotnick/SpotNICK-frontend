import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

const WIFI_CTX_KEY = 'spotnick_wifi_ctx';

export default function PortalWifi() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentRequired, setPaymentRequired] = useState(null);
  const formRef = useRef(null);
  const [radiusCreds, setRadiusCreds] = useState(null);

  const locationSlug = searchParams.get('location');
  const linkLoginOnly = searchParams.get('link-login-only');
  const linkOrig = searchParams.get('link-orig');
  const mac = searchParams.get('mac');

  const missingMikrotikParams = !linkLoginOnly || !locationSlug;

  // Assim que chegamos com parâmetros válidos do Mikrotik, guardamos
  // como rede de segurança no sessionStorage — sobrevive a recarregamentos
  // de página (ex: usuário sai para ler o SMS e o navegador recarrega a aba).
  useEffect(() => {
    if (!missingMikrotikParams) {
      sessionStorage.setItem(
        WIFI_CTX_KEY,
        JSON.stringify({ location: locationSlug, linkLoginOnly, linkOrig, mac })
      );
    }
  }, [missingMikrotikParams, locationSlug, linkLoginOnly, linkOrig, mac]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setPaymentRequired(null);
    setLoading(true);

    try {
      const { data } = await api.post('/api/portal/login', {
        email,
        password,
        location_slug: locationSlug,
      });

      setRadiusCreds({
        username: data.radius_username,
        password: data.radius_password,
      });
    } catch (err) {
      const resp = err.response?.data;
      if (err.response?.status === 402) {
        setPaymentRequired(resp);
      } else {
        setError(resp?.error || 'Não foi possível entrar. Tente novamente.');
      }
      setLoading(false);
    }
  };

  // Monta a URL preservando o contexto do HotSpot — sem isso a pessoa
  // verifica a conta mas não consegue voltar para conectar.
  const withWifiCtx = (path) =>
    `${path}?location=${encodeURIComponent(locationSlug || '')}` +
    `&link-login-only=${encodeURIComponent(linkLoginOnly || '')}` +
    `&link-orig=${encodeURIComponent(linkOrig || '')}` +
    `&mac=${encodeURIComponent(mac || '')}`;

  // Conta não verificada tem uma solução específica — destacamos ela
  const needsVerification = error && /verific/i.test(error);

  useEffect(() => {
    if (radiusCreds && formRef.current) {
      // Liberação concluída: o contexto já cumpriu seu papel, pode limpar.
      sessionStorage.removeItem(WIFI_CTX_KEY);
      formRef.current.submit();
    }
  }, [radiusCreds]);

  if (missingMikrotikParams) {
    return (
      <div className="min-h-screen bg-spotnicik-dark flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-bold text-spotnicik-primary mb-2">SpotNICK WiFi</h1>
          <p className="text-gray-600 text-sm">
            Esta página deve ser acessada a partir da rede WiFi de um local parceiro SpotNICK.
          </p>
        </div>
      </div>
    );
  }

  if (radiusCreds) {
    return (
      <div className="min-h-screen bg-spotnicik-dark flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-spotnicik-dark font-medium">Conectando você ao WiFi...</p>
        </div>
        <form ref={formRef} action={linkLoginOnly} method="post" style={{ display: 'none' }}>
          <input type="hidden" name="username" value={radiusCreds.username} />
          <input type="hidden" name="password" value={radiusCreds.password} />
        </form>
      </div>
    );
  }

  if (paymentRequired) {
    return (
      <div className="min-h-screen bg-spotnicik-dark flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">💳</div>
          <h1 className="text-lg font-bold text-spotnicik-dark mb-2">
            Acesso pago em {paymentRequired.location?.name}
          </h1>
          <p className="text-gray-600 text-sm mb-6">{paymentRequired.error}</p>
          <a
            href="https://spotnick.app.br/dashboard"
            className="block w-full bg-spotnicik-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Comprar acesso
          </a>
          <button
            onClick={() => setPaymentRequired(null)}
            className="mt-3 text-sm text-gray-500 hover:underline"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotnicik-dark flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-spotnicik-primary">SpotNICK WiFi</h1>
          <p className="text-gray-500 text-sm mt-1">Entre com sua conta para acessar a internet</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">
            {error}
            {needsVerification && (
              <div className="mt-3 flex flex-col gap-2">
                <a
                  href={withWifiCtx('/verify-sms') + `&email=${encodeURIComponent(email)}`}
                  className="block w-full bg-spotnicik-primary text-white text-center py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Verificar por SMS
                </a>
                <a
                  href={withWifiCtx('/resend-verification')}
                  className="text-center text-xs text-red-700 underline"
                >
                  Prefiro receber por e-mail
                </a>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.94 10.94 0 0112 20C5 20 1 12 1 12a21.8 21.8 0 015.06-6.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a21.8 21.8 0 01-3.22 4.44M14.12 14.12a3 3 0 11-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-spotnicik-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Entrando...' : 'Entrar e conectar'}
          </button>
        </form>

        <div className="text-center text-xs text-gray-400 mt-6 space-y-1.5">
          <p>
            Ainda não tem conta?{' '}
            <a href={withWifiCtx('/register')} className="text-spotnicik-primary hover:underline">
              Cadastre-se
            </a>
          </p>
          <p>
            Não verificou sua conta?{' '}
            <a href={withWifiCtx('/verify-sms')} className="text-spotnicik-primary hover:underline">
              Verificar agora
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
