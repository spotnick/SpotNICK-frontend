import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const CHANNEL_LABEL = { email: '📧 E-mail', sms: '📱 SMS', both: '📧📱 E-mail + SMS' };

export default function Campanhas({ isOwner }) {
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ channel: 'email', subject: '', message: '', location_id: '' });
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const [locationInfo, setLocationInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const [showBuy, setShowBuy] = useState(false);
  const [buyForm, setBuyForm] = useState({ credit_type: 'campaign_email_credits', quantity: 100, billing_type: 'PIX' });
  const [buying, setBuying] = useState(false);
  const [buyResult, setBuyResult] = useState(null);
  const [buyError, setBuyError] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/admin/locations');
        setLocations(data.locations || []);
        if (!isOwner && data.locations?.length === 1) {
          setForm((prev) => ({ ...prev, location_id: data.locations[0].id }));
        }
      } catch { /* ignora */ }
    })();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/api/admin/campaigns');
      setHistory(data.campaigns || []);
    } catch { /* ignora */ }
  }, []);

  const loadLocationInfo = useCallback(async (locationId) => {
    if (!locationId || isOwner) { setLocationInfo(null); return; }
    setLoadingInfo(true);
    try {
      const { data } = await api.get(`/api/admin/locations/${locationId}/campaign-credits`);
      setLocationInfo(data);
    } catch {
      setLocationInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  }, [isOwner]);

  useEffect(() => {
    loadLocationInfo(form.location_id);
  }, [form.location_id, loadLocationInfo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setPreview(null);
    setResult(null);
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setError(null);
    try {
      const { data } = await api.post('/api/admin/campaigns/preview', {
        location_id: form.location_id || null,
      });
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao calcular alcance.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSend = async () => {
    if (!preview) {
      alert('Calcule o alcance antes de enviar.');
      return;
    }
    if (!window.confirm(
      `Confirma o envio para ${preview.total} usuário(s)? Esta ação não pode ser desfeita.`
    )) return;

    setSending(true);
    setError(null);
    try {
      const { data } = await api.post('/api/admin/campaigns', {
        channel: form.channel,
        subject: form.subject || null,
        message: form.message,
        location_id: form.location_id || null,
      });
      setResult(data);
      setForm({ channel: 'email', subject: '', message: '', location_id: form.location_id });
      setPreview(null);
      await loadHistory();
      await loadLocationInfo(form.location_id);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar campanha.');
    } finally {
      setSending(false);
    }
  };

  const handleBuyChange = (e) => {
    const { name, value } = e.target;
    setBuyForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBuy = async () => {
    setBuying(true);
    setBuyError(null);
    try {
      const { data } = await api.post('/api/admin/campaigns/buy-credits', {
        credit_type: buyForm.credit_type,
        quantity: Number(buyForm.quantity),
        billing_type: buyForm.billing_type,
        location_id: form.location_id,
      });
      setBuyResult(data);
    } catch (err) {
      setBuyError(err.response?.data?.error || 'Erro ao gerar cobrança.');
    } finally {
      setBuying(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const closeBuy = () => {
    setShowBuy(false);
    setBuyResult(null);
    setBuyError(null);
    loadLocationInfo(form.location_id);
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '-');

  const locationSelected = !!form.location_id;
  const featureBlocked = !isOwner && locationSelected && locationInfo && !locationInfo.campaigns_enabled;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-spotnicik-primary mb-2">Campanhas</h2>
      <p className="text-xs text-gray-500 mb-6">
        Envio de e-mail e/ou SMS apenas para usuários que autorizaram comunicações no cadastro (consentimento LGPD).
      </p>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">Canal</label>
            <select
              name="channel" value={form.channel} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
            >
              <option value="email">📧 Somente e-mail</option>
              <option value="sms">📱 Somente SMS</option>
              <option value="both">📧📱 E-mail + SMS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              Local {!isOwner && <span className="text-red-500">*</span>}
            </label>
            <select
              name="location_id" value={form.location_id} onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
            >
              {isOwner && <option value="">Todos os locais</option>}
              {!isOwner && <option value="">Selecione...</option>}
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!isOwner && locationSelected && !loadingInfo && locationInfo?.campaigns_enabled && (
          <div className="flex items-center justify-between bg-spotnicik-light p-3 rounded-lg mb-4 text-sm">
            <div className="text-spotnicik-dark">
              Saldo: <strong>{locationInfo.campaign_email_credits}</strong> créditos de e-mail ・{' '}
              <strong>{locationInfo.campaign_sms_credits}</strong> créditos de SMS
            </div>
            <button
              onClick={() => setShowBuy(true)}
              className="text-spotnicik-primary font-medium hover:underline whitespace-nowrap ml-3"
            >
              + Comprar créditos
            </button>
          </div>
        )}

        {featureBlocked && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-4 rounded-lg mb-4">
            Este local ainda não tem acesso à função de Campanhas. Fale com o responsável do sistema para liberar.
          </div>
        )}

        <fieldset disabled={featureBlocked} className={featureBlocked ? 'opacity-50 pointer-events-none' : ''}>
          {(form.channel === 'email' || form.channel === 'both') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-spotnicik-dark mb-1">Assunto do e-mail</label>
              <input
                type="text" name="subject" value={form.subject} onChange={handleChange}
                placeholder="Ex: Novidades no seu Wi-Fi favorito!"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-spotnicik-dark mb-1">
              Mensagem
              {(form.channel === 'sms' || form.channel === 'both') && (
                <span className="text-xs text-gray-400 font-normal ml-2">
                  (SMS: sem acentos, até 300 caracteres — cortado automaticamente)
                </span>
              )}
            </label>
            <textarea
              name="message" value={form.message} onChange={handleChange} rows={5}
              placeholder="Escreva a mensagem da campanha..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
            />
          </div>

          {error && <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg mb-4">{error}</div>}

          {preview && (
            <div className="bg-spotnicik-light p-4 rounded-lg mb-4 text-sm text-spotnicik-dark">
              <strong>{preview.total}</strong> usuário(s) seriam alcançados
              {form.channel !== 'sms' && <> — {preview.withEmail} com e-mail</>}
              {form.channel !== 'email' && <> — {preview.withPhone} com telefone</>}
              {preview.credits && (
                <div className="text-xs text-gray-500 mt-1">
                  Saldo disponível: {preview.credits.email} e-mail(s), {preview.credits.sms} SMS
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="bg-green-100 text-green-700 text-sm p-4 rounded-lg mb-4">
              ✅ Campanha enviada! {result.sentEmail} e-mail(s), {result.sentSms} SMS enviado(s)
              {result.failed > 0 && <>, {result.failed} falha(s)</>}.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={previewing || !form.message.trim() || (!isOwner && !form.location_id)}
              className="flex-1 bg-spotnicik-cyan text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-cyan-400 disabled:opacity-50 transition"
            >
              {previewing ? 'Calculando...' : 'Calcular alcance'}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !preview}
              className="flex-1 bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {sending ? 'Enviando...' : 'Enviar campanha'}
            </button>
          </div>
        </fieldset>
      </div>

      <h3 className="text-lg font-bold text-spotnicik-dark mb-3">Histórico</h3>
      {history.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma campanha enviada ainda.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-spotnicik-light">
              <tr>
                <th className="text-left px-3 py-2">Data</th>
                <th className="text-left px-3 py-2">Canal</th>
                <th className="text-left px-3 py-2">Local</th>
                <th className="text-left px-3 py-2">Assunto/Mensagem</th>
                <th className="text-left px-3 py-2">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{formatDate(c.created_at)}</td>
                  <td className="px-3 py-2">{CHANNEL_LABEL[c.channel]}</td>
                  <td className="px-3 py-2">{c.locations?.name || 'Todos'}</td>
                  <td className="px-3 py-2 max-w-xs truncate" title={c.subject || c.message}>
                    {c.subject || c.message}
                  </td>
                  <td className="px-3 py-2">
                    {c.sent_email_count > 0 && <>{c.sent_email_count} e-mail(s) </>}
                    {c.sent_sms_count > 0 && <>{c.sent_sms_count} SMS </>}
                    {c.failed_count > 0 && <span className="text-red-500">{c.failed_count} falha(s)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showBuy && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50 py-8"
          onClick={closeBuy}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-spotnicik-primary">Comprar Créditos</h3>
              <button onClick={closeBuy} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>

            {!buyResult ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-spotnicik-dark mb-1">Tipo de crédito</label>
                  <select
                    name="credit_type" value={buyForm.credit_type} onChange={handleBuyChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                  >
                    <option value="campaign_email_credits">📧 Créditos de E-mail</option>
                    <option value="campaign_sms_credits">📱 Créditos de SMS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-spotnicik-dark mb-1">Quantidade</label>
                  <input
                    type="number" name="quantity" min="1" value={buyForm.quantity} onChange={handleBuyChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-spotnicik-dark mb-1">Forma de pagamento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['PIX', 'BOLETO', 'CREDIT_CARD'].map((method) => (
                      <button
                        key={method} type="button"
                        onClick={() => setBuyForm((prev) => ({ ...prev, billing_type: method }))}
                        className={`p-2 text-xs rounded-lg border-2 transition ${
                          buyForm.billing_type === method
                            ? 'border-spotnicik-cyan bg-spotnicik-light'
                            : 'border-gray-300'
                        }`}
                      >
                        {method === 'CREDIT_CARD' ? 'Cartão' : method}
                      </button>
                    ))}
                  </div>
                </div>

                {buyError && <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg">{buyError}</div>}

                <button
                  onClick={handleBuy}
                  disabled={buying}
                  className="w-full bg-spotnicik-primary text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {buying ? 'Gerando cobrança...' : 'Gerar cobrança'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-spotnicik-dark mb-4">
                  Valor: <strong>R$ {Number(buyResult.value).toFixed(2)}</strong> — o crédito é liberado
                  automaticamente assim que o pagamento for confirmado.
                </p>

                {buyResult.pix_qr_code && (
                  <div className="bg-spotnicik-light p-4 rounded-lg mb-4 text-center">
                    <img src={`data:image/png;base64,${buyResult.pix_qr_code}`} alt="QR Code PIX" className="w-40 h-40 mx-auto mb-3" />
                    <code className="text-xs bg-white p-2 rounded block break-all mb-2">{buyResult.pix_copy}</code>
                    <button
                      onClick={() => copyToClipboard(buyResult.pix_copy, 'pix')}
                      className="w-full bg-spotnicik-cyan text-spotnicik-dark py-2 rounded-lg text-sm font-medium hover:bg-cyan-400 transition"
                    >
                      {copied === 'pix' ? '✓ Copiado!' : 'Copiar código PIX'}
                    </button>
                  </div>
                )}

                {buyResult.boleto_line && (
                  <div className="bg-spotnicik-light p-4 rounded-lg mb-4">
                    {buyResult.boleto_url && (
                      <a href={buyResult.boleto_url} target="_blank" rel="noopener noreferrer"
                        className="block w-full bg-spotnicik-primary text-white py-2 rounded-lg text-sm font-medium text-center hover:bg-blue-700 transition mb-2">
                        Abrir Boleto (PDF)
                      </a>
                    )}
                    <code className="text-xs bg-white p-2 rounded block break-all mb-2">{buyResult.boleto_line}</code>
                    <button
                      onClick={() => copyToClipboard(buyResult.boleto_line, 'boleto')}
                      className="w-full bg-spotnicik-cyan text-spotnicik-dark py-2 rounded-lg text-sm font-medium hover:bg-cyan-400 transition"
                    >
                      {copied === 'boleto' ? '✓ Copiado!' : 'Copiar linha digitável'}
                    </button>
                  </div>
                )}

                {buyResult.invoice_url && !buyResult.pix_qr_code && !buyResult.boleto_line && (
                  <a href={buyResult.invoice_url} target="_blank" rel="noopener noreferrer"
                    className="block w-full bg-spotnicik-primary text-white py-3 rounded-lg font-medium text-center hover:bg-blue-700 transition mb-4">
                    💳 Pagar com Cartão
                  </a>
                )}

                <button
                  onClick={closeBuy}
                  className="w-full bg-gray-200 text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
