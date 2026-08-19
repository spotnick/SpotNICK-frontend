import { useState, useEffect } from 'react';
import api from '../services/api';

function ServiceCard({ title, status, children }) {
  const statusColor = status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  const statusLabel = status === 'ok' ? 'Operacional' : 'Erro';
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-spotnicik-dark">{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ percent }) {
  const color = percent > 85 ? 'bg-red-500' : percent > 60 ? 'bg-yellow-500' : 'bg-spotnicik-primary';
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
    </div>
  );
}

export default function Infraestrutura() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/admin/infra-status');
      setData(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-spotnicik-primary">Infraestrutura</h2>
          <p className="text-xs text-gray-500 mt-1">Monitoramento dos serviços que sustentam o SpotNICK.</p>
        </div>
        <button onClick={load} disabled={loading} className="text-sm text-spotnicik-cyan hover:underline disabled:opacity-50">
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

      {loading && !data ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supabase */}
          <ServiceCard title="Supabase (Banco de Dados)" status={data.supabase?.status}>
            {data.supabase?.status === 'ok' ? (
              <>
                <p className="text-2xl font-bold text-spotnicik-dark">
                  {data.supabase.used_mb} <span className="text-sm font-normal text-gray-400">MB de {data.supabase.limit_mb} MB</span>
                </p>
                <ProgressBar percent={data.supabase.percent} />
                <p className="text-xs text-gray-400 mt-1">{data.supabase.percent}% utilizado</p>
              </>
            ) : (
              <p className="text-sm text-red-600">{data.supabase?.error}</p>
            )}
          </ServiceCard>

          {/* SMS */}
          <ServiceCard title="GTI SMS" status={data.sms?.status}>
            {data.sms?.status === 'ok' ? (
              <>
                <p className="text-2xl font-bold text-spotnicik-dark">
                  {data.sms.saldo ?? '—'} <span className="text-sm font-normal text-gray-400">créditos</span>
                </p>
                {data.sms.expira_em && (
                  <p className="text-xs text-gray-400 mt-1">Expira em {data.sms.expira_em}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-red-600">{data.sms?.error}</p>
            )}
          </ServiceCard>

          {/* Resend */}
          <ServiceCard title="Resend (E-mail)" status={data.resend?.status}>
            {data.resend?.status === 'ok' ? (
              <>
                <p className="text-sm text-spotnicik-dark">Domínio: <strong>{data.resend.dominio}</strong></p>
                <p className="text-xs mt-1">
                  {data.resend.verificado ? (
                    <span className="text-green-600">✓ Verificado</span>
                  ) : (
                    <span className="text-red-600">✗ Não verificado</span>
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm text-red-600">{data.resend?.error}</p>
            )}
          </ServiceCard>

          {/* Asaas */}
          <ServiceCard title="Asaas (Pagamentos)" status={data.asaas?.status}>
            {data.asaas?.status === 'ok' ? (
              <p className="text-sm text-green-600">✓ Integração conectada normalmente</p>
            ) : (
              <p className="text-sm text-red-600">{data.asaas?.error}</p>
            )}
          </ServiceCard>

          {/* NextDNS */}
          <ServiceCard title="NextDNS (Filtro de Conteúdo)" status={data.nextdns?.status}>
            {data.nextdns?.status === 'ok' ? (
              <>
                <p className="text-sm text-spotnicik-dark">{data.nextdns.perfis} local(is) com filtro ativo</p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.nextdns.consultas.toLocaleString('pt-BR')} consultas, {data.nextdns.bloqueadas.toLocaleString('pt-BR')} bloqueadas
                </p>
              </>
            ) : (
              <p className="text-sm text-red-600">{data.nextdns?.error}</p>
            )}
          </ServiceCard>

          {/* Crons */}
          <div className="bg-white rounded-lg shadow p-5 md:col-span-2">
            <h3 className="font-semibold text-spotnicik-dark mb-3">Rotinas Agendadas (Crons)</h3>
            {(!data.crons || data.crons.length === 0) ? (
              <p className="text-sm text-gray-400">Nenhum registro ainda — aguarde a próxima execução de cada rotina.</p>
            ) : (
              <div className="space-y-2">
                {data.crons.map((c) => {
                  const minutesSince = (Date.now() - new Date(c.last_run_at).getTime()) / 60000;
                  const isStale = minutesSince > 180; // mais de 3h sem rodar
                  return (
                    <div key={c.job_name} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                      <span className="text-spotnicik-dark font-mono text-xs">{c.job_name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          c.last_status === 'success' && !isStale ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {isStale ? 'atrasado' : c.last_status === 'success' ? 'ok' : 'erro'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(c.last_run_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Placeholders da Fase 2 */}
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-5 flex items-center justify-center">
            <p className="text-sm text-gray-400 text-center">Railway (deploy/uso)<br />— em breve —</p>
          </div>
          {/* Railway */}
          <ServiceCard title="Railway (Backend)" status={data.railway?.status}>
            {data.railway?.status === 'ok' ? (
              <>
                <p className="text-sm text-spotnicik-dark">
                  <strong>{data.railway.serviceName}</strong>{' '}
                  <span className={data.railway.deployStatus === 'SUCCESS' ? 'text-green-600' : 'text-yellow-600'}>
                    ({data.railway.deployStatus})
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(data.railway.deployedAt).toLocaleString('pt-BR')}
                </p>
              </>
            ) : (
              <p className="text-sm text-red-600">{data.railway?.error}</p>
            )}
          </ServiceCard>

          {/* GitHub */}
          <div className="bg-white rounded-lg shadow p-5 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-spotnicik-dark">GitHub (Repositórios)</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                data.github?.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {data.github?.status === 'ok' ? 'Operacional' : 'Erro'}
              </span>
            </div>
            {data.github?.status === 'ok' ? (
              <div className="space-y-3">
                {data.github.repos.map((r) => (
                  <a
                    key={r.name}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border-l-2 border-spotnicik-cyan pl-3 hover:bg-spotnicik-light rounded-r transition"
                  >
                    <p className="text-xs font-semibold text-spotnicik-dark">{r.name}</p>
                    <p className="text-sm text-gray-700 truncate">{r.message}</p>
                    <p className="text-xs text-gray-400">
                      {r.author} · {new Date(r.date).toLocaleString('pt-BR')}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-red-600">{data.github?.error}</p>
            )}
          </div>

          {/* Placeholders da Fase 2 restantes */}
          {/* Vercel */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-spotnicik-dark">Vercel (Frontend)</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                data.vercel?.status === 'ok' && data.vercel?.readyState === 'READY'
                  ? 'bg-green-100 text-green-700'
                  : data.vercel?.status === 'ok'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {data.vercel?.status === 'ok' ? data.vercel.readyState : 'Erro'}
              </span>
            </div>
            {data.vercel?.status === 'ok' ? (
              <a href={data.vercel.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-spotnicik-light rounded p-1 -m-1 transition">
                <p className="text-sm text-gray-700 truncate">{data.vercel.message || 'Sem mensagem de commit'}</p>
                <p className="text-xs text-gray-400">
                  {data.vercel.author} · {new Date(data.vercel.createdAt).toLocaleString('pt-BR')}
                </p>
              </a>
            ) : (
              <p className="text-sm text-red-600">{data.vercel?.error}</p>
            )}
          </div>

          {/* Placeholder restante */}
          {/* DigitalOcean */}
          <ServiceCard title="DigitalOcean (VPS FreeRADIUS)" status={data.digitalocean?.status}>
            {data.digitalocean?.status === 'ok' ? (
              <>
                <p className="text-sm text-spotnicik-dark">
                  <strong>{data.digitalocean.name}</strong>{' '}
                  <span className={data.digitalocean.droplet_status === 'active' ? 'text-green-600' : 'text-red-600'}>
                    ({data.digitalocean.droplet_status})
                  </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.digitalocean.vcpus} vCPU · {data.digitalocean.memory_mb}MB RAM · {data.digitalocean.disk_gb}GB disco
                </p>
                <p className="text-xs text-gray-400">{data.digitalocean.region}</p>
              </>
            ) : (
              <p className="text-sm text-red-600">{data.digitalocean?.error}</p>
            )}
          </ServiceCard>
        </div>
      )}
    </div>
  );
}
