import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Percent, 
  Sparkles, 
  Wallet, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Check, 
  Info, 
  ShieldCheck, 
  Settings, 
  Clock, 
  ChevronRight,
  HelpCircle,
  ExternalLink,
  Flame,
  Award
} from 'lucide-react';
import { Campaign } from '../types';
import { getCampaigns, DEFAULT_INITIAL_CAMPAIGNS } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface CampaignsPageProps {
  onOrderClick: () => void;
  onDepositClick: () => void;
  onServicesClick: () => void;
  onAdminClick?: () => void;
}

export function CampaignsPage({
  onOrderClick,
  onDepositClick,
  onServicesClick,
  onAdminClick
}: CampaignsPageProps) {
  const { isAdmin } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEFAULT_INITIAL_CAMPAIGNS);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'deposit' | 'order' | 'special'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        // If user is admin, show all; otherwise show active
        const data = await getCampaigns(false);
        if (mounted && data && data.length > 0) {
          setCampaigns(data);
        }
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAction = (camp: Campaign) => {
    if (camp.targetTab === 'deposit') {
      onDepositClick();
    } else if (camp.targetTab === 'services') {
      onServicesClick();
    } else {
      onOrderClick();
    }
  };

  const displayCampaigns = campaigns.filter((c) => {
    // Regular users only see active
    if (!isAdmin && !c.isActive) return false;
    if (selectedCategory === 'all') return true;
    return c.category === selectedCategory;
  });

  const getCampaignIcon = (type?: string) => {
    switch (type) {
      case 'wallet':
        return <Wallet className="w-6 h-6" />;
      case 'percent':
        return <Percent className="w-6 h-6" />;
      case 'sparkles':
        return <Sparkles className="w-6 h-6" />;
      case 'zap':
        return <Zap className="w-6 h-6" />;
      case 'gift':
      default:
        return <Gift className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 sm:p-12 text-white shadow-xl">
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider mb-4">
            <Flame className="w-4 h-4 text-rose-400" />
            <span>360 Medya Fırsat & Kampanyalar</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Sosyal Medyada Zirveye Çıkarken <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-indigo-300">
              Ekstra Bakiye & İndirim Kazanın!
            </span>
          </h1>

          <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed">
            360 Medya'da her bakiye yüklemenizde <strong className="text-emerald-400 font-bold">%5 ilave hediye bakiye</strong>, tüm sosyal medya servislerinde anında <strong className="text-rose-400 font-bold">%10 net indirim</strong> ve garantili servislerde 30 gün boyunca tek tıkla ücretsiz telafi avantajından yararlanın.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onDepositClick}
              className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition active:scale-98"
            >
              <Wallet className="w-4 h-4" />
              <span>+%5 Ekstra Bakiye Yükle</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOrderClick}
              className="px-5 py-3 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition"
            >
              <Gift className="w-4 h-4 text-rose-400" />
              <span>%10 İndirimle Sipariş Ver</span>
            </button>

            {isAdmin && onAdminClick && (
              <button
                onClick={onAdminClick}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition"
              >
                <Settings className="w-4 h-4" />
                <span>Kampanyaları Yönet</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Highlights Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-8 border-t border-slate-800/80">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="text-emerald-400 font-black text-xl sm:text-2xl">+%5</div>
            <div className="text-[11px] text-slate-300 font-medium mt-0.5">Bakiye Yükleme Bonusu</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="text-rose-400 font-black text-xl sm:text-2xl">%10</div>
            <div className="text-[11px] text-slate-300 font-medium mt-0.5">Tüm Servislerde İndirim</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="text-indigo-400 font-black text-xl sm:text-2xl">30 Gün</div>
            <div className="text-[11px] text-slate-300 font-medium mt-0.5">Telafi (Refill) Güvencesi</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
            <div className="text-amber-400 font-black text-xl sm:text-2xl">7/24</div>
            <div className="text-[11px] text-slate-300 font-medium mt-0.5">Otomatik Hızlı Başlatma</div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Tüm Fırsatlar ({campaigns.length})
          </button>
          <button
            onClick={() => setSelectedCategory('deposit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'deposit'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Bakiye Bonusları (%5)</span>
          </button>
          <button
            onClick={() => setSelectedCategory('order')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'order'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Servis İndirimleri (%10)</span>
          </button>
          <button
            onClick={() => setSelectedCategory('special')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'special'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Özel Avantajlar</span>
          </button>
        </div>

        {isAdmin && onAdminClick && (
          <button
            onClick={onAdminClick}
            className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Admin Paneli Kampanya Düzenleyici</span>
          </button>
        )}
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayCampaigns.map((camp) => {
          const isDepositBonus = camp.category === 'deposit' || camp.bonusPercent;
          const isOrderDiscount = camp.category === 'order' || camp.discountPercent;

          return (
            <div
              key={camp.id}
              className={`rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md bg-white ${
                !camp.isActive ? 'opacity-70 border-dashed border-amber-300 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Card Top Accent Banner */}
                <div className={`p-5 bg-gradient-to-r ${camp.gradient || 'from-indigo-600 to-purple-600'} text-white relative overflow-hidden`}>
                  <div className="absolute right-2 top-2 opacity-15">
                    {getCampaignIcon(camp.iconType)}
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-xs border border-white/25 text-white shadow-xs">
                      {camp.badge || (isDepositBonus ? '+%5 BONUS' : isOrderDiscount ? '%10 İNDİRİM' : 'ÖZEL FIRSAT')}
                    </span>
                    {!camp.isActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950">
                        Taslak / Pasif
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-lg leading-snug drop-shadow-xs">
                    {camp.title}
                  </h3>

                  {camp.subtitle && (
                    <p className="text-white/80 text-xs mt-1 leading-relaxed">
                      {camp.subtitle}
                    </p>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4">
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {camp.description}
                  </p>

                  {/* Highlight Calculation for Deposit or Discount */}
                  {camp.bonusPercent && (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-xs space-y-1">
                      <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Otomatik %5 Bakiye Bonusu</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 leading-normal">
                        100 ₺ yüklemeye <strong>105 ₺</strong>, 500 ₺ yüklemeye <strong>525 ₺</strong>, 1.000 ₺ yüklemeye <strong>1.050 ₺</strong> cüzdan bakiyesi!
                      </p>
                    </div>
                  )}

                  {camp.discountPercent && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs space-y-1">
                      <div className="font-bold text-rose-800 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-rose-600" />
                        <span>Tüm Servislerde Anında %10 İndirim</span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-normal">
                        Sepette ve sipariş formunda liste fiyatı üzerinden net %10 indirimli fiyat uygulanır.
                      </p>
                    </div>
                  )}

                  {/* Promo Code Strip if available */}
                  {camp.code && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">
                        Promosyon Kodu: <strong className="font-mono text-slate-800 font-bold">{camp.code}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(camp.code!)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 transition"
                      >
                        {copiedCode === camp.code ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Kopyalandı</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Kopyala</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Terms / Bullet points */}
                  {camp.terms && camp.terms.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Kampanya Koşulları:
                      </p>
                      <ul className="space-y-1">
                        {camp.terms.map((t, idx) => (
                          <li key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={() => handleAction(camp)}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-xs active:scale-98 ${
                    isDepositBonus
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : isOrderDiscount
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  <span>{camp.buttonText || 'Fırsattan Yararlan'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* How to Benefit (3 Step Guide) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Kolay 3 Adım
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">
            360 Medya Kampanyalarından Nasıl Yararlanabilirsiniz?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Hiçbir karmaşık işlem yapmadan, 360 Medya panelinin ayrıcalıklı dünyasından hemen faydalanın.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 relative">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-3 shadow-xs">
              1
            </div>
            <h3 className="font-bold text-sm text-slate-900">Bakiye Yükleyin (+%5 Bonus)</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Banka Havalesi veya 7/24 FAST ile hesabınıza bakiye yükleyin. Admin onayında yatırdığınız tutarın %5'i otomatik hediye olarak cüzdanınıza yansır.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 relative">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white font-black text-sm flex items-center justify-center mb-3 shadow-xs">
              2
            </div>
            <h3 className="font-bold text-sm text-slate-900">Servisinizi Seçin (%10 İndirim)</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Instagram, TikTok, YouTube veya dilediğiniz platformdaki 2.600+ servisimizden birini seçin. %10 indirim otomatik sepete uygulanır.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 relative">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center mb-3 shadow-xs">
              3
            </div>
            <h3 className="font-bold text-sm text-slate-900">30 Gün Güvenceyle Takip Edin</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Siparişiniz saniyeler içinde anında API üzerinden başlatılır. Garantili servislerde olası düşüşlerde 30 gün tek tıkla ücretsiz telafi talep edin.
            </p>
          </div>
        </div>
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border border-indigo-800/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-base text-white">7/24 Güvenli & Şeffaf Sosyal Medya Hizmeti</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              360 Medya'da tüm kampanyalar koşulsuz ve şeffaf olarak uygulanır. Bakiyeniz ve siparişleriniz güvencemiz altındadır.
            </p>
          </div>
        </div>
        <button
          onClick={onDepositClick}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition whitespace-nowrap shadow-lg shadow-emerald-500/20 shrink-0"
        >
          Hemen Bakiye Yükle (+%5 Bonus)
        </button>
      </div>

    </div>
  );
}
