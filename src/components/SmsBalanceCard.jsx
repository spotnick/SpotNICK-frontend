import { useState, useEffect } from 'react';
import api from '../services/api';

export default function SmsBalanceCard() {
  const [saldo, setSaldo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/sms-balance');
      setSaldo(data.saldo);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao consultar saldo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase">Saldo SMS</p>
        {loading ? (
          <div className="mt-1 w-5 h-5 border-2 border-spotnicik-primary border-t-transparent rounded-full animate-spin"></div>
        ) : error ? (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        ) : (
          <p className="text-2xl font-bold text-spotnicik-primary mt-1">
            {saldo != null ? saldo : '—'}
            <span className="text-sm font-normal text-gray-400 ml-1">créditos</span>
          </p>
        )}
      </div>
      <button
        onClick={loadBalance}
        disabled={loading}
        className="text-xs text-spotnicik-cyan hover:underline disabled:opacity-50"
      >
        Atualizar
      </button>
    </div>
  );
}
