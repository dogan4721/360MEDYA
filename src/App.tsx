import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { OrderForm } from './components/OrderForm';
import { OrdersList } from './components/OrdersList';
import { StatusChecker } from './components/StatusChecker';
import { ServicesCatalog } from './components/ServicesCatalog';
import { FaqSection } from './components/FaqSection';
import { AuthModal } from './components/AuthModal';
import { DepositModal } from './components/DepositModal';
import { AdminPanel } from './components/AdminPanel';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { CampaignsPage } from './components/CampaignsPage';
import { BalanceInfo, LocalOrder, Service } from './types';
import { fetchBalance, fetchServices, getSavedOrders, saveOrders } from './utils/api';
import { INITIAL_SERVICES } from './data/initialServices';
import { Loader2, RefreshCw, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { isAdmin, openDepositModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'order' | 'orders' | 'status' | 'services' | 'faq' | 'admin' | 'campaigns'>('order');
  
  // TurkPaneli Data - Instant initial services for zero blank-screen delay
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesSyncing, setServicesSyncing] = useState(true);
  const [servicesCount, setServicesCount] = useState<number>(INITIAL_SERVICES.length);

  // Orders
  const [orders, setOrders] = useState<LocalOrder[]>([]);

  // Preselected service for OrderForm
  const [preselectedServiceId, setPreselectedServiceId] = useState<number | null>(null);

  // Initial Data Fetch
  const loadInitialData = async () => {
    setBalanceLoading(true);

    // Fetch Balance
    try {
      const b = await fetchBalance();
      if (b && (b.balance !== undefined || b.balance !== null)) {
        setBalance(b);
      }
    } catch (e: any) {
      console.warn('Balance load note:', e);
    } finally {
      setBalanceLoading(false);
    }

    // Fetch Full Services in background
    setServicesSyncing(true);
    try {
      const liveServices = await fetchServices();
      if (Array.isArray(liveServices) && liveServices.length > 0) {
        setServices(liveServices);
        setServicesCount(liveServices.length);
      }
    } catch (e: any) {
      console.warn('Background services sync note:', e);
    } finally {
      setServicesSyncing(false);
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Save orders to local storage whenever they change
  const handleUpdateOrders = (newOrders: LocalOrder[]) => {
    setOrders(newOrders);
    saveOrders(newOrders);
  };

  const handleOrderCreated = (newOrder: LocalOrder) => {
    const updated = [newOrder, ...orders];
    handleUpdateOrders(updated);
    // Refresh balance after placing order
    fetchBalance().then(setBalance).catch(console.error);
  };

  const handleSelectServiceToOrder = (serviceId: number) => {
    setPreselectedServiceId(serviceId);
    setActiveTab('order');
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => setActiveTab(tab as any)}
        apiBalance={balance}
        apiBalanceLoading={balanceLoading}
        refreshApiBalance={async () => {
          setBalanceLoading(true);
          try {
            const b = await fetchBalance();
            setBalance(b);
          } finally {
            setBalanceLoading(false);
          }
        }}
        ordersCount={orders.length}
      />

      {/* Sync Status Banner when pulling full 2600+ catalog */}
      {servicesSyncing && (
        <div className="bg-blue-600/10 border-b border-blue-200 px-4 py-1.5 text-xs text-blue-800 flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>360 Medya: 2.600+ güncel servis ve anlık fiyatlar eşitleniyor...</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'order' && (
          <OrderForm
            services={services}
            balance={balance}
            onOrderCreated={handleOrderCreated}
            preselectedServiceId={preselectedServiceId}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersList
            orders={orders}
            onUpdateOrders={handleUpdateOrders}
            onNavigateToOrder={() => setActiveTab('order')}
          />
        )}

        {activeTab === 'status' && <StatusChecker />}

        {activeTab === 'services' && (
          <ServicesCatalog
            services={services}
            onSelectServiceToOrder={handleSelectServiceToOrder}
          />
        )}

        {activeTab === 'campaigns' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
            <CampaignsPage
              onOrderClick={() => {
                setActiveTab('order');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onDepositClick={() => {
                openDepositModal();
              }}
              onServicesClick={() => {
                setActiveTab('services');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onAdminClick={isAdmin ? () => {
                setActiveTab('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } : undefined}
            />
          </div>
        )}

        {activeTab === 'faq' && <FaqSection />}

        {activeTab === 'admin' && isAdmin && <AdminPanel />}
      </main>

      {/* Floating WhatsApp Support Button */}
      <FloatingWhatsApp />

      {/* User Auth & Deposit Modals */}
      <AuthModal />
      <DepositModal />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-10 mt-12 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-800">
            
            {/* Col 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-black text-lg">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-xs text-white">360</span>
                <span>360 <span className="text-rose-500">MEDYA</span></span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Sosyal medya takipçi, beğeni, izlenme ve etkileşim bayilik paneli.
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono font-bold text-xs">
                  <span>Yönetici:</span>
                  <span className="text-white font-black">@DOĞAN BAŞBOĞA</span>
                </span>
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <h4 className="text-white font-bold mb-3 text-sm">Hızlı Menü</h4>
              <ul className="space-y-2">
                <li><button onClick={() => setActiveTab('order')} className="hover:text-white transition">Hızlı Sipariş Oluştur</button></li>
                <li><button onClick={() => { setActiveTab('campaigns'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-rose-400 text-rose-300 font-bold transition flex items-center gap-1"><span>🎁 Kampanyalar (+%5 Bonus)</span></button></li>
                <li><button onClick={() => setActiveTab('orders')} className="hover:text-white transition">Siparişlerim & Takip</button></li>
                <li><button onClick={() => setActiveTab('status')} className="hover:text-white transition">Sipariş Durumu Sorgula</button></li>
                <li><button onClick={() => setActiveTab('services')} className="hover:text-white transition">Servis & Fiyat Listesi</button></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <h4 className="text-white font-bold mb-3 text-sm">Desteklenen Platformlar</h4>
              <ul className="space-y-2">
                <li>Instagram Takipçi, Beğeni & Keşfet</li>
                <li>TikTok Takipçi, Canlı Yayın & Beğeni</li>
                <li>YouTube Abone, İzlenme & Beğeni</li>
                <li>Twitter (X) Takipçi, Retweet & Beğeni</li>
                <li>Telegram Kanal & Grup Üyeleri</li>
              </ul>
            </div>

            {/* Col 4 */}
            <div>
              <h4 className="text-white font-bold mb-3 text-sm">Güvenlik & Garanti</h4>
              <p className="text-slate-400 leading-relaxed mb-3">
                Tüm işlemler 256-bit SSL şifreleme ile korunur. Asla hesap şifresi istenmez.
              </p>
              <div className="flex items-center gap-1 text-slate-300 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>%100 Şifresiz & Güvenli Gönderim</span>
              </div>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <span>© {new Date().getFullYear()} 360 Medya. Tüm hakları saklıdır.</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-slate-300 font-medium">Sistem Yöneticisi: <strong className="text-blue-400 font-bold">@DOĞAN BAŞBOĞA</strong></span>
            </div>
            <div className="flex items-center gap-4">
              <span>Gizlilik Politikası</span>
              <span>Kullanım Koşulları</span>
              <span>İletişim & Destek</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
