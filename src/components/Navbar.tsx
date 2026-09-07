import React, { useState } from 'react';
import { 
  Zap, 
  ShoppingBag, 
  ListOrdered, 
  Search, 
  Layers, 
  HelpCircle, 
  RefreshCw, 
  Wallet,
  ShieldCheck,
  ExternalLink,
  Plus,
  User as UserIcon,
  LogIn,
  LogOut,
  Shield,
  ChevronDown,
  Gift
} from 'lucide-react';
import { BalanceInfo } from '../types';
import { formatTRY } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  apiBalance: BalanceInfo | null;
  apiBalanceLoading: boolean;
  refreshApiBalance: () => void;
  ordersCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  apiBalance,
  apiBalanceLoading,
  refreshApiBalance,
  ordersCount,
}) => {
  const { user, userProfile, isAdmin, logout, openAuthModal, openDepositModal } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none" 
            onClick={() => setActiveTab('order')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-rose-500 flex items-center justify-center shadow-lg shadow-purple-500/20 ring-2 ring-white/10">
              <span className="font-black text-lg tracking-tighter text-white">360</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xl font-black tracking-tight text-white font-sans">
                  360 <span className="text-rose-500">MEDYA</span>
                </span>
                <span className="bg-rose-500/20 text-rose-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-500/30 uppercase tracking-wider">
                  SMM
                </span>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/30 font-mono tracking-wide">
                  @DOĞAN BAŞBOĞA
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Sosyal Medya Bayilik & Sipariş Portalı</p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('order')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                activeTab === 'order'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Yeni Sipariş</span>
            </button>

            {/* Orders and Status are only visible when user is logged in */}
            {user && (
              <>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all relative ${
                    activeTab === 'orders'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>Siparişlerim</span>
                  {ordersCount > 0 && (
                    <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {ordersCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('status')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                    activeTab === 'status'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Durum Sorgula</span>
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('services')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                activeTab === 'services'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Servis & Fiyatlar</span>
            </button>

            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all relative ${
                activeTab === 'campaigns'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Gift className="w-4 h-4 text-rose-400" />
              <span>Kampanyalar</span>
              <span className="bg-rose-500/30 text-rose-300 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase border border-rose-500/40">
                +%5
              </span>
            </button>

            <button
              onClick={() => setActiveTab('faq')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all ${
                activeTab === 'faq'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Rehber & SSS</span>
            </button>
          </nav>

          {/* Right Action: User Balance & Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                {/* Personal User Balance Pill */}
                <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 sm:p-1.5 shadow-sm">
                  <div className="flex items-center gap-2 px-2 py-0.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">
                        Bakiyeniz
                      </div>
                      <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono tracking-tight">
                        {formatTRY(userProfile?.balance ?? 0)}
                      </div>
                    </div>
                  </div>

                  {/* Top-up Button */}
                  <button
                    onClick={openDepositModal}
                    className="ml-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                    title="Bakiye Yükle"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Yükle</span>
                  </button>
                </div>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
                  >
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold uppercase">
                      {userProfile?.displayName ? userProfile.displayName.charAt(0) : user.email?.charAt(0) || 'U'}
                    </div>
                    <span className="hidden md:inline max-w-[100px] truncate">
                      {userProfile?.displayName || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isUserMenuOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-slate-800">
                        <p className="text-xs font-bold text-white truncate">
                          {userProfile?.displayName || 'Kullanıcı'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        {isAdmin && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            YÖNETİCİ HESABI
                          </span>
                        )}
                      </div>

                      <button
                        onClick={openDepositModal}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-emerald-400 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Bakiye Yükle</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('orders')}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>Siparişlerim</span>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => setActiveTab('admin')}
                          className="w-full px-4 py-2 text-left text-xs font-medium text-amber-300 hover:bg-slate-800 flex items-center gap-2"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Yönetici Paneli</span>
                        </button>
                      )}

                      <div className="border-t border-slate-800 my-1" />

                      <button
                        onClick={() => logout()}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-rose-400 hover:bg-slate-800 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Çıkış Yap</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Guest: Sign in / Register Button */
              <button
                onClick={() => openAuthModal('login')}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-blue-500/20"
              >
                <LogIn className="w-4 h-4" />
                <span>Giriş Yap / Kayıt Ol</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2.5 border-t border-slate-800 text-xs overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('order')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'order' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            Yeni Sipariş
          </button>
          {user && (
            <>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap relative ${
                  activeTab === 'orders' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                Siparişlerim {ordersCount > 0 ? `(${ordersCount})` : ''}
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
                  activeTab === 'status' ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                Durum
              </button>
            </>
          )}
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'services' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            Servisler
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'campaigns' ? 'bg-rose-600 text-white' : 'text-rose-400'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Kampanyalar</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
              activeTab === 'faq' ? 'bg-blue-600 text-white' : 'text-slate-400'
            }`}
          >
            SSS
          </button>
        </div>
      </div>
    </header>
  );
};
