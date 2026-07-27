import { useState, useEffect } from 'react';
import api from '../services/api';

// Converte minutos numa exibição amigável (ex: "2h 30min", "9d 10h")
function formatBalance(minutes) {
  const m = Number(minutes) || 0;
  if (m <= 0) return '0min';
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

function formatExpiry(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const exp = new Date(dateStr);
  const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'expira hoje';
  if (days === 1) return 'expira amanhã';
  return `expira em ${days} dias`;
}

export default function SaldoCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/api/portal/my-balance');
        setData(data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-spotnicik-primary">
        <h3 className="text-spotnicik-dark font-semibold text-sm uppercase">Seu Saldo</h3>
        <div className="mt-4 flex justify-center">
          <div className="w-6 h-6 border-2 border-spotnicik-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const balance = data?.balance_minutes || 0;
  const consumed = data?.consumed_minutes || 0;
  const expiry = formatExpiry(data?.next_expiry);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-spotnicik-primary">
      <h3 className="text-spotnicik-dark font-semibold text-sm uppercase">Seu Saldo</h3>
      {balance > 0 ? (
        <>
          <p className="text-3xl font-bold text-spotnicik-primary mt-2">{formatBalance(balance)}</p>
          <p className="text-spotnicik-dark text-xs mt-1">de acesso disponível</p>
          {expiry && (
            <p className="text-xs text-yellow-600 mt-2">⏳ {expiry}</p>
          )}
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-400 mt-2">Sem saldo</p>
          <p className="text-spotnicik-dark text-xs mt-1">Compre um pacote para navegar</p>
        </>
      )}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Já utilizado: <strong className="text-spotnicik-dark">{formatBalance(consumed)}</strong>
        </p>
      </div>
    </div>
  );
}
