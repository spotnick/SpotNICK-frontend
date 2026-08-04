import { useState } from 'react';
import api from '../services/api';

export default function Pagamentos() {
  const [type, setType] = useState('hourly');
  const [billingType, setBillingType] = useState('PIX');
  const [quantity, setQuantity] = useState(1);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState('');

  const pricing = {
    hourly: { label: 'Por Hora', value: 1.00 },
    daily: { label: 'Por Dia', value: 5.00 },
    monthly: { label: 'Por Mês', value: 20.00 },
  };

  const handleEstimate = async () => {
    try {
      const { data } = await api.post('/api/payments/estimate', {
        type,
        hours: type === 'hourly' ? quantity : 1,
        days: type === 'daily' ? quantity : 1,
        months: type === 'monthly' ? quantity : 1,
      });
      setEstimate(data);
    } catch (err) {
      alert('Erro ao calcular: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/api/payments/checkout', {
        type,
        billing_type: billingType,
        hours: type === 'hourly' ? quantity : 1,
        days: type === 'daily' ? quantity : 1,
        months: type === 'monthly' ? quantity : 1,
      });
      setSuccess(data);
    } catch (err) {
      alert('Erro ao processar pagamento: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold text-spotnicik-primary mb-4">✅ Cobrança Criada!</h2>
        <p className="text-spotnicik-dark mb-6">
          Valor: <strong>R$ {Number(success.value).toFixed(2)}</strong>
        </p>

        {success.billing_type === 'PIX' && (
          <div className="bg-spotnicik-light p-6 rounded-lg mb-6">
            {success.pix_qr_code && (
              <img
                src={`data:image/png;base64,${success.pix_qr_code}`}
                alt="QR Code PIX"
                className="w-48 h-48 mx-auto mb-4"
              />
            )}
            {success.pix_copy && (
              <>
                <p className="text-sm text-spotnicik-dark mb-2">PIX copia e cola:</p>
                <code className="text-xs bg-white p-3 rounded block break-all mb-3">
                  {success.pix_copy}
                </code>
                <button
                  onClick={() => copyToClipboard(success.pix_copy, 'pix')}
                  className="w-full bg-spotnicik-cyan text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-cyan-400 transition"
                >
                  {copied === 'pix' ? '✓ Copiado!' : 'Copiar código PIX'}
                </button>
              </>
            )}
          </div>
        )}

        {success.billing_type === 'BOLETO' && (
          <div className="bg-spotnicik-light p-6 rounded-lg mb-6">
            {success.boleto_url && (
              <a
                href={success.boleto_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-spotnicik-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition mb-4"
              >
                📄 Abrir / Imprimir Boleto (PDF)
              </a>
            )}
            {success.boleto_line && (
              <>
                <p className="text-sm text-spotnicik-dark mb-2">Linha digitável:</p>
                <code className="text-xs bg-white p-3 rounded block break-all mb-3">
                  {success.boleto_line}
                </code>
                <button
                  onClick={() => copyToClipboard(success.boleto_line, 'boleto')}
                  className="w-full bg-spotnicik-cyan text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-cyan-400 transition"
                >
                  {copied === 'boleto' ? '✓ Copiado!' : 'Copiar linha digitável'}
                </button>
              </>
            )}
          </div>
        )}

        {success.billing_type === 'CREDIT_CARD' && success.invoice_url && (
          <div className="bg-spotnicik-light p-6 rounded-lg mb-6">
            <a
              href={success.invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-spotnicik-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              💳 Pagar com Cartão
            </a>
          </div>
        )}

        <button
          onClick={() => { setSuccess(null); setEstimate(null); }}
          className="w-full bg-gray-200 text-spotnicik-dark py-2 rounded-lg font-medium hover:bg-gray-300 transition"
        >
          Fazer outro pagamento
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-spotnicik-primary mb-6">Planos de WiFi</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {Object.entries(pricing).map(([key, { label, value }]) => (
          <button
            key={key}
            onClick={() => setType(key)}
            className={`p-4 rounded-lg border-2 transition ${
              type === key
                ? 'border-spotnicik-primary bg-spotnicik-light'
                : 'border-gray-300 hover:border-spotnicik-cyan'
            }`}
          >
            <div className="font-semibold text-spotnicik-dark text-sm">{label}</div>
            <div className="text-spotnicik-primary font-bold">R$ {value.toFixed(2)}</div>
          </button>
        ))}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-spotnicik-dark mb-2">
          Quantidade
        </label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spotnicik-primary"
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-spotnicik-dark mb-2">
          Forma de Pagamento
        </label>
        <div className="grid grid-cols-3 gap-4">
          {['PIX', 'BOLETO', 'CREDIT_CARD'].map((method) => (
            <button
              key={method}
              onClick={() => setBillingType(method)}
              className={`p-3 rounded-lg border-2 transition ${
                billingType === method
                  ? 'border-spotnicik-cyan bg-spotnicik-light'
                  : 'border-gray-300'
              }`}
            >
              {method === 'CREDIT_CARD' ? 'Cartão' : method}
            </button>
          ))}
        </div>
      </div>

      {estimate && (
        <div className="bg-spotnicik-light p-4 rounded-lg mb-6">
          <p className="text-sm text-spotnicik-dark">
            <strong>Valor Total:</strong> R$ {Number(estimate.total).toFixed(2)}
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleEstimate}
          className="flex-1 px-4 py-2 bg-spotnicik-cyan text-spotnicik-dark rounded-lg font-medium hover:bg-cyan-400 transition"
        >
          Calcular
        </button>
        <button
          onClick={handleCheckout}
          disabled={loading || !estimate}
          className="flex-1 px-4 py-2 bg-spotnicik-primary text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? 'Processando...' : 'Pagar Agora'}
        </button>
      </div>
    </div>
  );
}
