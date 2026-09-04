import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import AdminUsers from './AdminUsers';
import AdminLocations from './AdminLocations';
import AdminAccessPoints from './AdminAccessPoints';
import AdminMikrotikRouters from './AdminMikrotikRouters';
import ConsumptionDashboard from './ConsumptionDashboard';
import SmsBalanceCard from './SmsBalanceCard';
import LogExtraction from './LogExtraction';
import AuditHistory from './AuditHistory';
import LegalRequests from './LegalRequests';
import DataSubjectRequests from './DataSubjectRequests';
import Campanhas from './Campanhas';
import SystemStatsCard from './SystemStatsCard';
import Infraestrutura from './Infraestrutura';
import AdminCompanies from './AdminCompanies';
import AdminProducts from './AdminProducts';
import AdminContracts from './AdminContracts';
import AdminEquipment from './AdminEquipment';

// Menus temáticos. `ownerOnly` no item = só o dono vê;
// um menu some sozinho quando nenhum item dele está disponível.
const MENUS = [
  {
    id: 'comercial',
    label: 'Comercial',
    items: [
      { tab: 'companies', label: 'Empresas' },
      { tab: 'products',  label: 'Produtos' },
      { tab: 'contracts', label: 'Contratos' },
    ],
  },
  {
    id: 'operacao',
    label: 'Operação',
    items: [
      { tab: 'locations', label: 'Locais' },
      { tab: 'routers',   label: 'Roteadores' },
      { tab: 'aps',       label: 'Access Points' },
      { tab: 'equipment', label: 'Equipamentos' },
    ],
  },
  {
    id: 'pessoas',
    label: 'Pessoas',
    items: [
      { tab: 'users',     label: 'Usuários', ownerOnly: true },
      { tab: 'campanhas', label: 'Campanhas' },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      { tab: 'consumption', label: 'Consumo' },
      { tab: 'logs',        label: 'Registros', ownerOnly: true },
      { tab: 'audit',       label: 'Histórico de Auditoria', ownerOnly: true },
      { tab: 'legal',       label: 'Requisições', ownerOnly: true },
      { tab: 'titulares',   label: 'Solicitações de Titulares', ownerOnly: true },
      { tab: 'infra',       label: 'Infraestrutura', ownerOnly: true },
    ],
  },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('locations');
  const [openMenu, setOpenMenu] = useState(null);
  const navRef = useRef(null);

  const [access, setAccess] = useState(null); // { isOwner, locationIds } | null (carregando) | false (sem acesso)
  const [accessLoading, setAccessLoading] = useState(true);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      try {
        const { data } = await api.get('/api/admin/my-access');
        setAccess(data);
      } catch {
        setAccess(false); // sem acesso admin (backend já barrou)
      } finally {
        setAccessLoading(false);
      }
    })();
  }, [loading, user]);

  // Fecha o menu ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenu(null); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  if (loading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-spotnicik-light">
        <div className="w-10 h-10 border-4 border-spotnicik-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isOwner = !!access?.isOwner;
  const isAllowed = !!access; // owner OU location_admin (o backend já validou)

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-spotnicik-light px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-spotnicik-dark mb-2">Acesso restrito</h1>
          <p className="text-gray-600 mb-6">Esta área é exclusiva para administradores.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-spotnicik-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Filtra os itens que este administrador pode ver
  const visibleMenus = MENUS
    .map((m) => ({ ...m, items: m.items.filter((i) => !i.ownerOnly || isOwner) }))
    .filter((m) => m.items.length > 0);

  // Rótulo da aba atual, para o indicador de posição
  const currentItem = visibleMenus
    .flatMap((m) => m.items.map((i) => ({ ...i, menuLabel: m.label })))
    .find((i) => i.tab === tab);

  const selectTab = (t) => {
    setTab(t);
    setOpenMenu(null);
  };

  return (
    <div className="min-h-screen bg-spotnicik-light">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-spotnicik-primary">SpotNICK</h1>
            <span className="text-xs bg-spotnicik-dark text-white px-2 py-1 rounded">
              {isOwner ? 'ADMIN' : 'ADMIN DE LOCAL'}
            </span>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-spotnicik-cyan hover:underline"
          >
            ← Voltar ao app
          </button>
        </div>
      </header>

      {/* Cards de visão geral — apenas para o dono */}
      {isOwner && (
        <div className="max-w-7xl mx-auto px-4 pt-4 flex flex-wrap gap-3">
          <SystemStatsCard />
          <SmsBalanceCard />
        </div>
      )}

      {/* Navegação agrupada por tema */}
      <nav className="bg-white border-b" ref={navRef}>
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 flex-wrap">
          {visibleMenus.map((menu) => {
            const hasActive = menu.items.some((i) => i.tab === tab);
            const isOpen = openMenu === menu.id;
            return (
              <div key={menu.id} className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(isOpen ? null : menu.id);
                  }}
                  className={`py-4 px-4 font-medium transition flex items-center gap-1.5 ${
                    hasActive
                      ? 'text-spotnicik-primary border-b-2 border-spotnicik-primary'
                      : 'text-spotnicik-dark hover:text-spotnicik-primary'
                  }`}
                >
                  {menu.label}
                  <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {isOpen && (
                  <div
                    className="absolute left-0 top-full bg-white border border-gray-200 rounded-b-lg shadow-lg py-1 z-30 min-w-[180px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {menu.items.map((item) => (
                      <button
                        key={item.tab}
                        onClick={() => selectTab(item.tab)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition ${
                          tab === item.tab
                            ? 'bg-spotnicik-light text-spotnicik-primary font-medium'
                            : 'text-spotnicik-dark hover:bg-spotnicik-light'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Indicador de onde você está */}
          {currentItem && (
            <span className="ml-auto text-xs text-gray-400 py-4 hidden md:block">
              {currentItem.menuLabel} › <strong className="text-spotnicik-dark">{currentItem.label}</strong>
            </span>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === 'users' && isOwner && <AdminUsers />}
        {tab === 'locations' && <AdminLocations isOwner={isOwner} />}
        {tab === 'routers' && <AdminMikrotikRouters />}
        {tab === 'aps' && <AdminAccessPoints />}
        {tab === 'consumption' && <ConsumptionDashboard />}
        {tab === 'logs' && isOwner && (
          <LogExtraction onOpenHistory={() => setTab('audit')} />
        )}
        {tab === 'legal' && isOwner && <LegalRequests />}
        {tab === 'titulares' && isOwner && <DataSubjectRequests />}
        {tab === 'audit' && isOwner && (
          <AuditHistory onBack={() => setTab('logs')} />
        )}
        {tab === 'campanhas' && <Campanhas isOwner={isOwner} />}
        {tab === 'infra' && isOwner && <Infraestrutura />}
        {tab === 'companies' && <AdminCompanies isPlatformAdmin={isOwner} />}
        {tab === 'products' && <AdminProducts isPlatformAdmin={isOwner} />}
        {tab === 'contracts' && <AdminContracts isPlatformAdmin={isOwner} />}
        {tab === 'equipment' && <AdminEquipment isPlatformAdmin={isOwner} />}
      </main>
    </div>
  );
}
