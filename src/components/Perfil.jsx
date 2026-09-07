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

  // Edição dos dados cadastrais. E-mail permanece fora: alterá-lo
  // exige tratar vínculos de autenticação, contabilização e cobrança
  // que ainda não têm fluxo próprio.
  const [editando, setEditando] = useState(false);
  const [dados, setDados] = useState({ name: '', phone: '', cpf: '' });
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [errosCampo, setErrosCampo] = useState({});
  const [exportando, setExportando] = useState(false);

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

  const abrirEdicao = () => {
    setDados({
      name: user?.name || '',
      phone: user?.phone || '',
      cpf: user?.cpf || '',
    });
    setErrosCampo({});
    setMessage(null);
    setEditando(true);
  };

  const salvarDados = async () => {
    setSalvandoDados(true);
    setErrosCampo({});
    setMessage(null);
    try {
      const payload = {};
      if (dados.name !== (user?.name || '')) payload.name = dados.name;
      if (dados.phone !== (user?.phone || '')) payload.phone = dados.phone;
      if (dados.cpf !== (user?.cpf || '')) payload.cpf = dados.cpf;

      if (Object.keys(payload).length === 0) {
        setEditando(false);
        return;
      }

      const { data } = await api.patch('/api/auth/profile', payload);
      setMessage({ type: 'success', text: data.message || 'Dados atualizados.' });
      setEditando(false);
      if (onUserRefresh) onUserRefresh();
    } catch (err) {
      const resp = err.response?.data;
      // O backend devolve os erros por campo quando a validação falha
      if (resp?.campos) setErrosCampo(resp.campos);
      setMessage({ type: 'error', text: resp?.error || 'Erro ao atualizar dados.' });
    } finally {
      setSalvandoDados(false);
    }
  };

  const exportarMeusDados = async () => {
    setExportando(true);
    setMessage(null);
    try {
      const { data } = await api.post('/api/auth/my-data');

      // Gera o arquivo no navegador — o conteúdo já veio da API
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-spotnick-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({
        type: 'success',
        text: `Seus dados foram baixados. Protocolo de atendimento: ${data.protocolo}`,
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Erro ao exportar seus dados.',
      });
    } finally {
      setExportando(false);
    }
  };

  const inputCls = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary';
  const inputErroCls = 'w-full px-4 py-2 border border-red-400 bg-red-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {/* Informacoes do Usuario */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-spotnicik-primary">Meus Dados</h2>
          {!editando && (
            <button
              onClick={abrirEdicao}
              className="text-sm px-3 py-1.5 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light transition"
            >
              Editar
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">Nome</label>
            <input
              type="text"
              value={editando ? dados.name : (user?.name || '')}
              onChange={(e) => setDados({ ...dados, name: e.target.value })}
              disabled={!editando}
              className={editando ? (errosCampo.name ? inputErroCls : inputCls) : 'w-full px-4 py-2 bg-spotnicik-light text-spotnicik-dark rounded-lg'}
            />
            {errosCampo.name && <p className="text-xs text-red-600 mt-1">{errosCampo.name}</p>}
          </div>

          {/* E-mail permanece somente leitura — ver nota abaixo */}
          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">E-mail</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2 bg-spotnicik-light text-spotnicik-dark rounded-lg"
            />
            {editando && (
              <p className="text-xs text-gray-500 mt-1">
                A alteração de e-mail não está disponível no momento. Entre em contato
                com o suporte se precisar atualizá-lo.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">Telefone</label>
            <input
              type="tel"
              value={editando ? dados.phone : (user?.phone || 'Não informado')}
              onChange={(e) => setDados({ ...dados, phone: e.target.value })}
              disabled={!editando}
              placeholder="(00) 00000-0000"
              className={editando ? (errosCampo.phone ? inputErroCls : inputCls) : 'w-full px-4 py-2 bg-spotnicik-light text-spotnicik-dark rounded-lg'}
            />
            {errosCampo.phone && <p className="text-xs text-red-600 mt-1">{errosCampo.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">CPF</label>
            <input
              type="text"
              value={editando ? dados.cpf : (user?.cpf || 'Não informado')}
              onChange={(e) => setDados({ ...dados, cpf: e.target.value })}
              disabled={!editando}
              placeholder="000.000.000-00"
              className={editando ? (errosCampo.cpf ? inputErroCls : inputCls) : 'w-full px-4 py-2 bg-spotnicik-light text-spotnicik-dark rounded-lg'}
            />
            {errosCampo.cpf && <p className="text-xs text-red-600 mt-1">{errosCampo.cpf}</p>}
          </div>

          {editando && (
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setEditando(false); setErrosCampo({}); }}
                disabled={salvandoDados}
                className="flex-1 bg-gray-200 text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={salvarDados}
                disabled={salvandoDados}
                className="flex-1 bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {salvandoDados ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}

          {message && (
            <div className={`text-sm p-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Direito de acesso (LGPD) */}
        <div className="border-t mt-6 pt-5">
          <h3 className="text-sm font-semibold text-spotnicik-dark mb-1">
            Baixar meus dados
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Obtenha uma cópia dos seus dados pessoais: cadastro, consentimentos,
            histórico de conexão dentro do prazo de guarda, cobranças e créditos.
          </p>
          <button
            onClick={exportarMeusDados}
            disabled={exportando}
            className="text-sm px-4 py-2 border border-spotnicik-primary text-spotnicik-primary rounded-lg font-medium hover:bg-spotnicik-light disabled:opacity-50 transition"
          >
            {exportando ? 'Preparando...' : 'Baixar meus dados'}
          </button>
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
