import { useState } from 'react';
import api from '../services/api';
import PasswordInput from './PasswordInput';

export default function Perfil({ user, onUserRefresh }) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [marketingConsent, setMarketingConsent] = useState(!!user?.marketing_consent);
  const [savingConsent, setSavingConsent] = useState(false);

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Senhas não conferem!' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/request-password-reset', {
        email: user?.email,
      });
      setMessage({
        type: 'success',
        text: 'Email de reset enviado! Verifique sua caixa de entrada.',
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Erro ao solicitar reset',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMarketing = async () => {
    const novoValor = !marketingConsent;
    setSavingConsent(true);
    try {
      await api.patch('/api/auth/marketing-consent', { marketing_consent: novoValor });
      setMarketingConsent(novoValor);
      if (onUserRefresh) await onUserRefresh(); // mantém o "user" global em sincronia
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar preferência.');
    } finally {
      setSavingConsent(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {/* Informacoes do Usuario */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-spotnicik-primary mb-6">Meus Dados</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              Nome
            </label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="w-full px-4 py-2 bg-spotnicik-light text-spotnicik-dark rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              E-mail
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2 bg-spotnicik-light text-spotnicik-dark rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              Telefone
            </label>
            <input
              type="tel"
              value={user?.phone || 'N/A'}
              disabled
              className="w-full px-4 py-2 bg-spotnicik-light text-spotnicik-dark rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              CPF
            </label>
            <input
              type="text"
              value={user?.cpf || 'N/A'}
              disabled
              className="w-full px-4 py-2 bg-spotnicik-light text-spotnicik-dark rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              Status
            </label>
            <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
              ✅ Verificado
            </div>
          </div>
        </div>
      </div>

      {/* Preferências de Comunicação (LGPD) */}
      <div className="bg-white rounded-lg shadow-lg p-8 md:col-span-2">
        <h2 className="text-2xl font-bold text-spotnicik-primary mb-4">Preferências de Comunicação</h2>
        <div className="flex items-start justify-between gap-4 p-4 bg-spotnicik-light rounded-lg">
          <div>
            <p className="text-sm font-medium text-spotnicik-dark">
              Receber novidades e promoções por e-mail/SMS
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Você pode ativar ou desativar isso a qualquer momento. Não afeta o uso normal do Wi-Fi.
            </p>
          </div>
          <button
            onClick={handleToggleMarketing}
            disabled={savingConsent}
            className={`shrink-0 relative w-12 h-6 rounded-full transition ${
              marketingConsent ? 'bg-spotnicik-primary' : 'bg-gray-300'
            } disabled:opacity-50`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                marketingConsent ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Veja mais em nossos{' '}
          <a href="/termos" target="_blank" className="text-spotnicik-cyan hover:underline">
            Termos de Uso e Política de Privacidade
          </a>.
        </p>
      </div>

      {/* Reset de Senha */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-spotnicik-primary mb-6">Segurança</h2>

        {message && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              Nova Senha
            </label>
            <PasswordInput
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-spotnicik-dark mt-1">
              Mínimo 8 caracteres, com números e caracteres especiais
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              Confirmar Senha
            </label>
            <PasswordInput
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Enviando...' : 'Resetar Senha'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-spotnicik-light rounded-lg">
          <p className="text-xs text-spotnicik-dark">
            <strong>ℹ️ Dica:</strong> Você receberá um email com instruções para redefinir sua senha. O link expira em 1 hora.
          </p>
        </div>
      </div>
    </div>
  );
}
