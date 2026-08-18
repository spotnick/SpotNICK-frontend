import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { isValidCPF, formatCPF } from '../utils/cpf';
import PasswordInput from './PasswordInput';

const WIFI_CTX_KEY = 'spotnick_wifi_ctx';

export default function Register() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    confirmPassword: '',
  });
  const [verificationMethod, setVerificationMethod] = useState('sms');
  const [cpfError, setCpfError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, error } = useAuth();
  const navigate = useNavigate();

  const wifiContext = {
    location: searchParams.get('location'),
    linkLoginOnly: searchParams.get('link-login-only'),
    linkOrig: searchParams.get('link-orig'),
    mac: searchParams.get('mac'),
  };
  const cameFromWifi = !!wifiContext.linkLoginOnly;

  // Rede de segurança: garante que o contexto esteja salvo assim que
  // a tela carrega, para sobreviver a recarregamentos posteriores
  // (ex: usuário sai para ler o SMS e o navegador recarrega a aba).
  useEffect(() => {
    if (cameFromWifi) {
      sessionStorage.setItem(WIFI_CTX_KEY, JSON.stringify(wifiContext));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameFromWifi]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'cpf') {
      const masked = formatCPF(value);
      setForm((prev) => ({ ...prev, cpf: masked }));
      const digits = masked.replace(/\D/g, '');
      if (digits.length === 11) {
        setCpfError(isValidCPF(masked) ? '' : 'CPF inválido. Verifique os números.');
      } else {
        setCpfError('');
      }
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidCPF(form.cpf)) {
      setCpfError('CPF inválido. Verifique os números.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      alert('Senhas não conferem!');
      return;
    }

    if (verificationMethod === 'sms' && !form.phone.trim()) {
      alert('Telefone é obrigatório para verificação por SMS.');
      return;
    }

    if (!termsAccepted) {
      alert('É necessário aceitar os Termos de Uso e a Política de Privacidade para se cadastrar.');
      return;
    }

    setLoading(true);
    const result = await register(
      form.name,
      form.email,
      form.phone,
      form.cpf.replace(/\D/g, ''),
      form.password,
      verificationMethod,
      termsAccepted,
      marketingConsent
    );
    setLoading(false);

    if (result.success) {
      if (result.data?.verification_method === 'sms') {
        navigate('/verify-sms', {
          state: { email: result.data.email, wifiContext: cameFromWifi ? wifiContext : null },
        });
      } else {
        alert('Cadastro realizado! Verifique seu email para ativar a conta.');
        if (cameFromWifi) {
          navigate(
            `/wifi?location=${encodeURIComponent(wifiContext.location || '')}&link-login-only=${encodeURIComponent(wifiContext.linkLoginOnly || '')}&link-orig=${encodeURIComponent(wifiContext.linkOrig || '')}&mac=${encodeURIComponent(wifiContext.mac || '')}`
          );
        } else {
          navigate('/login');
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-spotnicik-light flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-spotnicik-primary">SpotNICK</h1>
          <p className="text-spotnicik-dark mt-2">Criar Conta</p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              Nome
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-spotnicik-dark mb-1">
                Telefone {verificationMethod === 'sms' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                placeholder="11999999999"
                required={verificationMethod === 'sms'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-spotnicik-dark mb-1">
                CPF
              </label>
              <input
                type="text"
                name="cpf"
                value={form.cpf}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  cpfError
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 focus:ring-spotnicik-primary'
                }`}
                placeholder="123.456.789-01"
                maxLength={14}
                required
              />
            </div>
          </div>
          {cpfError && (
            <p className="text-red-600 text-xs -mt-2">{cpfError}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              Senha
            </label>
            <PasswordInput
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-spotnicik-dark mt-1">
              Mínimo 8 caracteres, com ao menos um número e um caractere especial
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              Confirmar Senha
            </label>
            <PasswordInput
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-2">
              Como você quer verificar sua conta?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVerificationMethod('email')}
                className={`py-2 rounded-lg border-2 font-medium transition ${
                  verificationMethod === 'email'
                    ? 'border-spotnicik-primary bg-spotnicik-light text-spotnicik-primary'
                    : 'border-gray-300 text-spotnicik-dark hover:border-spotnicik-cyan'
                }`}
              >
                📧 Email
              </button>
              <button
                type="button"
                onClick={() => setVerificationMethod('sms')}
                className={`py-2 rounded-lg border-2 font-medium transition ${
                  verificationMethod === 'sms'
                    ? 'border-spotnicik-primary bg-spotnicik-light text-spotnicik-primary'
                    : 'border-gray-300 text-spotnicik-dark hover:border-spotnicik-cyan'
                }`}
              >
                📱 SMS
              </button>
            </div>
            {verificationMethod === 'sms' && (
              <p className="text-xs text-gray-500 mt-2">
                Enviaremos um código de 6 dígitos por SMS para o telefone informado.
              </p>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 mt-0.5"
                required
              />
              <span className="text-sm text-spotnicik-dark">
                Li e aceito os{' '}
                <Link to="/termos" target="_blank" className="text-spotnicik-cyan hover:underline">
                  Termos de Uso e a Política de Privacidade
                </Link>
                . <span className="text-red-500">*</span>
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="w-4 h-4 mt-0.5"
              />
              <span className="text-sm text-gray-600">
                Quero receber novidades, promoções e comunicações do SpotNICK por e-mail e/ou SMS.
                Você pode alterar isso a qualquer momento no seu perfil.{' '}
                <span className="text-gray-400">(opcional)</span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !!cpfError}
            className="w-full bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-spotnicik-dark">
            Já tem conta?{' '}
            <Link to="/login" className="text-spotnicik-cyan font-medium hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
