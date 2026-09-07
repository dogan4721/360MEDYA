import React, { useState } from 'react';
import { Gift, Sparkles, ChevronRight, CheckCircle2, Percent, ArrowRight, X } from 'lucide-react';

interface GiftPromoBannerProps {
  onOrderClick: () => void;
}

export const GiftPromoBanner: React.FC<GiftPromoBannerProps> = ({ onOrderClick }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <aside aria-label="360 Medya Hediye Kampanyası" className="relative overflow-hidden bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-700 text-white shadow-lg border-b border-white/15">
      {/* Subtle celebratory background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          
          {/* Left: Gift Graphic & Main Promo Text */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-center sm:justify-start">
            {/* Animated Gift Badge */}
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-inner animate-pulse">
                <Gift className="w-6 h-6 text-amber-300 drop-shadow" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-300"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className="bg-amber-400 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-slate-950" />
                  ÖZEL HEDİYE
                </span>
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white drop-shadow-sm">
                  360 Medya'da Tüm Servislerde <span className="underline decoration-amber-300 decoration-2 underline-offset-2 text-amber-200">%10 İndirim</span> Başladı!
                </span>
              </div>
              <p className="text-xs text-rose-100/90 hidden md:block mt-0.5 font-medium">
                Tüm sosyal medya servislerinde siparişlerinizde %10 hediye indirimli fiyatlar sepette otomatik uygulanır.
              </p>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-semibold text-white transition backdrop-blur-sm"
            >
              {showDetails ? 'Kapat' : 'Kampanya Detayı'}
            </button>
            <button
              type="button"
              onClick={onOrderClick}
              className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition shadow-md shadow-amber-500/20 active:scale-95 flex items-center gap-1.5"
            >
              <span>İndirimli Sipariş Ver</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Campaign Details Box */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="bg-white/10 rounded-xl p-2.5 border border-white/15 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-bold">Kupon Kodu Gerekmez</strong>
                <span className="text-rose-100 text-[11px]">Sipariş formundaki tüm fiyatlar doğrudan %10 indirimli olarak hesaplanır.</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 border border-white/15 flex items-start gap-2">
              <Percent className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-bold">Tüm Platformlarda Geçerli</strong>
                <span className="text-rose-100 text-[11px]">Instagram, TikTok, YouTube, Twitter, Telegram dahil 2.600+ serviste geçerlidir.</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 border border-white/15 flex items-start gap-2">
              <Gift className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white font-bold">Kişisel Bakiye Tasarrufu</strong>
                <span className="text-rose-100 text-[11px]">Bakiyenizden daima %10 indirimli net tutar düşülür.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
