import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  RotateCcw, 
  XCircle, 
  HelpCircle,
  ExternalLink,
  Flame,
  Sparkles,
  Info,
  ShieldCheck,
  Check,
  Wallet,
  LogIn,
  Plus,
  Gift,
  Percent
} from 'lucide-react';
import { Service, BalanceInfo, PlatformType, LocalOrder } from '../types';
import { detectPlatform, formatTRY, submitOrder } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { deductBalanceAndSaveOrder } from '../lib/firebase';

interface OrderFormProps {
  services: Service[];
  balance: BalanceInfo | null;
  onOrderCreated: (newOrder: LocalOrder) => void;
  preselectedServiceId?: number | null;
}

const PLATFORMS: { id: PlatformType; label: string; icon: string; color: string }[] = [
  { id: 'ALL', label: 'Tüm Servisler', icon: '⚡', color: 'bg-slate-700 text-white' },
  { id: 'Instagram', label: 'Instagram', icon: '📸', color: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' },
  { id: 'TikTok', label: 'TikTok', icon: '🎵', color: 'bg-slate-900 text-white' },
  { id: 'YouTube', label: 'YouTube', icon: '▶️', color: 'bg-red-600 text-white' },
  { id: 'Twitter', label: 'Twitter (X)', icon: '𝕏', color: 'bg-neutral-800 text-white' },
  { id: 'Telegram', label: 'Telegram', icon: '✈️', color: 'bg-sky-500 text-white' },
  { id: 'Facebook', label: 'Facebook', icon: '👥', color: 'bg-blue-700 text-white' },
  { id: 'Spotify', label: 'Spotify', icon: '🎧', color: 'bg-emerald-600 text-white' },
];

export const OrderForm: React.FC<OrderFormProps> = ({
  services,
  balance,
  onOrderCreated,
  preselectedServiceId,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('ALL');
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  // Form Fields
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [comments, setComments] = useState('');
  const [usernames, setUsernames] = useState('');
  const [keywords, setKeywords] = useState('');
  const [answerNumber, setAnswerNumber] = useState('1');

  // States
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<{ id: number; cost: number; serviceName: string } | null>(null);

  // If a preselected service ID is passed from the catalog
  useEffect(() => {
    if (preselectedServiceId && services.length > 0) {
      const found = services.find((s) => s.service === preselectedServiceId);
      if (found) {
        setSelectedCategory(found.category);
        setSelectedServiceId(found.service);
        setQuantity(found.min || 1000);
        const platform = detectPlatform(found.category, found.name);
        setSelectedPlatform(platform);
      }
    }
  }, [preselectedServiceId, services]);

  // Filter services by platform
  const platformServices = useMemo(() => {
    if (selectedPlatform === 'ALL') return services;
    return services.filter((s) => detectPlatform(s.category, s.name) === selectedPlatform);
  }, [services, selectedPlatform]);

  // Unique categories for current platform
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    platformServices.forEach((s) => {
      map.set(s.category, (map.get(s.category) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [platformServices]);

  // Set default category when categories change
  useEffect(() => {
    if (categories.length > 0) {
      const exists = categories.some((c) => c.name === selectedCategory);
      if (!exists) {
        setSelectedCategory(categories[0].name);
      }
    } else {
      setSelectedCategory('');
    }
  }, [categories]);

  // Services in selected category
  const categoryServices = useMemo(() => {
    if (!selectedCategory) return [];
    return platformServices.filter((s) => s.category === selectedCategory);
  }, [platformServices, selectedCategory]);

  // Set default service when categoryServices change
  useEffect(() => {
    if (categoryServices.length > 0) {
      const exists = categoryServices.some((s) => s.service === selectedServiceId);
      if (!exists) {
        setSelectedServiceId(categoryServices[0].service);
        setQuantity(categoryServices[0].min || 100);
      }
    } else {
      setSelectedServiceId(null);
    }
  }, [categoryServices]);

  // Currently selected service object
  const currentService = useMemo(() => {
    return services.find((s) => s.service === selectedServiceId) || null;
  }, [services, selectedServiceId]);

  // Auto update quantity when comments change for custom comments
  useEffect(() => {
    if (currentService?.type === 'Custom Comments' || currentService?.type === 'Custom Comments Package') {
      const lines = comments.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        setQuantity(lines.length);
      }
    }
  }, [comments, currentService]);

  // Original cost calculation
  const originalCost = useMemo(() => {
    if (!currentService) return 0;
    const ratePer1000 = parseFloat(currentService.rate) || 0;
    if (currentService.type === 'Package' || currentService.type === 'Custom Comments Package') {
      return ratePer1000;
    }
    return (quantity / 1000) * ratePer1000;
  }, [currentService, quantity]);

  // Special Gift Promo: 10% Discount on all services!
  const discountRate = 0.10;
  const calculatedCost = useMemo(() => {
    return originalCost * (1 - discountRate);
  }, [originalCost]);

  const savingsAmount = useMemo(() => {
    return originalCost * discountRate;
  }, [originalCost]);

  // Auth and Firestore Balance
  const { user, userProfile, openAuthModal, openDepositModal } = useAuth();
  const userBalanceNum = user ? (userProfile?.balance ?? 0) : 0;
  const hasSufficientBalance = Boolean(user && userBalanceNum >= calculatedCost);

  // Placeholder recommendation based on detected platform
  const linkPlaceholder = useMemo(() => {
    if (!currentService) return 'https://...';
    const p = detectPlatform(currentService.category, currentService.name);
    switch (p) {
      case 'Instagram':
        return 'https://www.instagram.com/kullanici_adi veya gönderi linki';
      case 'TikTok':
        return 'https://www.tiktok.com/@kullanici veya video linki';
      case 'YouTube':
        return 'https://www.youtube.com/watch?v=... veya kanal linki';
      case 'Twitter':
        return 'https://twitter.com/kullanici veya tweet linki';
      case 'Telegram':
        return 'https://t.me/kanal_adi';
      case 'Spotify':
        return 'https://open.spotify.com/track/...';
      default:
        return 'Bağlantı linkini (URL) yapıştırın';
    }
  }, [currentService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessOrder(null);

    // 1. Check User Authentication
    if (!user) {
      setErrorMessage('Sipariş vermek ve bakiyenizden düşülmesi için lütfen önce giriş yapınız veya kayıt olunuz.');
      openAuthModal('login');
      return;
    }

    if (!currentService) {
      setErrorMessage('Lütfen geçerli bir servis seçin.');
      return;
    }

    if (!link.trim()) {
      setErrorMessage('Lütfen hedef bağlantı (link / kullanıcı adı) girin.');
      return;
    }

    if (currentService.type !== 'Package' && (quantity < currentService.min || quantity > currentService.max)) {
      setErrorMessage(`Miktar, bu servis için minimum ${currentService.min} ve maksimum ${currentService.max} arasında olmalıdır.`);
      return;
    }

    // 2. Check Sufficient User Balance in Firestore
    if (calculatedCost > userBalanceNum) {
      setErrorMessage(`Yetersiz bakiye. Bu sipariş için ${formatTRY(calculatedCost)} gerekiyor, mevcut bakiyeniz ${formatTRY(userBalanceNum)}. Lütfen bakiye yükleyiniz.`);
      openDepositModal();
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, any> = {
        service: currentService.service,
        link: link.trim(),
      };

      if (currentService.type !== 'Package') {
        payload.quantity = quantity;
      }

      if (comments.trim() && (currentService.type === 'Custom Comments' || currentService.type === 'Custom Comments Package')) {
        payload.comments = comments;
      }

      if (usernames.trim() && currentService.type === 'Mentions') {
        payload.usernames = usernames;
      }

      if (keywords.trim() && currentService.type === 'SEO') {
        payload.keywords = keywords;
      }

      if (answerNumber && currentService.type === 'Poll') {
        payload.answer_number = answerNumber;
      }

      // 3. Send order to TurkPaneli API v2
      const res = await submitOrder(payload);

      // 4. Deduct Firestore balance and save order to Firestore
      await deductBalanceAndSaveOrder(user.uid, user.email || '', {
        apiOrderId: res.order,
        serviceId: currentService.service,
        serviceName: currentService.name,
        category: currentService.category,
        link: link.trim(),
        quantity: quantity,
        charge: calculatedCost,
        status: 'In progress',
        remains: String(quantity),
        startCount: '0',
        currency: 'TRY',
        refillEligible: !!currentService.refill,
        cancelEligible: !!currentService.cancel
      });

      const localOrder: LocalOrder = {
        orderId: res.order,
        serviceId: currentService.service,
        serviceName: currentService.name,
        category: currentService.category,
        link: link.trim(),
        quantity: quantity,
        cost: calculatedCost,
        createdAt: new Date().toISOString(),
        status: 'In progress',
        currency: 'TRY',
        refillEligible: !!currentService.refill,
        cancelEligible: !!currentService.cancel,
      };

      onOrderCreated(localOrder);

      setSuccessOrder({
        id: res.order,
        cost: calculatedCost,
        serviceName: currentService.name,
      });

      // Reset fields
      setLink('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Sipariş iletilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6">
      
      {/* Title section */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-2">
            <span>Yetkili Sağlayıcı & Destek:</span>
            <strong className="text-slate-900 font-mono font-black">@DOĞAN BAŞBOĞA</strong>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-7 h-7 text-blue-600" />
            Hızlı Sipariş Oluştur
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            2.600+ aktif 360 Medya servisi arasından seçim yapın, linkinizi ve miktarı girerek siparişinizi anında başlatın.
          </p>
        </div>
      </div>

      {/* 🎁 10% Discount Gift Campaign Banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 p-0.5 shadow-md">
        <div className="bg-slate-900/90 rounded-[14px] p-4 sm:p-5 backdrop-blur-sm text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30">
              <Gift className="w-6 h-6 text-slate-950 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-400 text-slate-950 text-[11px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  360 MEDYA HEDİYESİ
                </span>
                <span className="font-extrabold text-white text-base">
                  Tüm Servislerde <span className="text-amber-300">%10 İndirim</span> Otomatik Tanımlandı!
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Kupon kodu gerekmez. Aşağıdaki siparişlerinizde %10 hediye indirim anında fiyattan düşülür ve bakiyenizden indirimli tutar tahsil edilir.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-300 uppercase block font-semibold">Uygulanan İndirim</span>
              <span className="text-amber-300 font-mono font-black text-sm">%10 NET</span>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Filter Tabs */}
      <div className="mb-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          1. Platform Seçin
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {PLATFORMS.map((p) => {
            const isSelected = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p.id)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20 scale-[1.02]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{p.icon}</span>
                <span className="truncate">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Order Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Category Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>2. Kategori Seçin</span>
                  <span className="text-xs font-normal text-slate-500">
                    {categories.length} Kategori Mevcut
                  </span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.count} servis)
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>3. Servis Seçin</span>
                  <span className="text-xs font-normal text-slate-500">
                    {categoryServices.length} Servis
                  </span>
                </label>
                <select
                  value={selectedServiceId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedServiceId(id);
                    const s = services.find((srv) => srv.service === id);
                    if (s) setQuantity(s.min || 100);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all outline-none"
                >
                  {categoryServices.map((s) => {
                    const originalRate = parseFloat(s.rate) || 0;
                    const discountedRate = originalRate * 0.9;
                    return (
                      <option key={s.service} value={s.service}>
                        #{s.service} - {s.name} | {formatTRY(discountedRate)} / 1000 (%10 İndirimli)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* TurkPaneli Servis Açıklaması & Talimatlar Alanı */}
              {currentService && (currentService.desc || currentService.description) && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-slate-50 border border-blue-200/80 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wide">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Servis Açıklaması & Gönderim Kuralları</span>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                      #{currentService.service}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-sans bg-white/90 p-3.5 rounded-lg border border-blue-100/80 select-text">
                    {currentService.desc || currentService.description}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium pt-1 text-slate-600">
                    {currentService.refill && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800">
                        <RotateCcw className="w-3 h-3 text-emerald-600" /> Telafi Garantili (30 Gün)
                      </span>
                    )}
                    {currentService.cancel && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100/80 text-sky-800">
                        <Check className="w-3 h-3 text-sky-600" /> İptal Edilebilir
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">
                      Min: {currentService.min.toLocaleString()} / Max: {currentService.max.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Link Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>4. Bağlantı (Link / Kullanıcı Adı)</span>
                  <span className="text-xs text-blue-600 font-medium">Hesabınızın 'Herkese Açık' olması gerekir</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder={linkPlaceholder}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              {/* Quantity Input (if not pure Package) */}
              {currentService && currentService.type !== 'Package' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-800">
                      5. Miktar
                    </label>
                    <span className="text-xs text-slate-500">
                      Min: <strong className="text-slate-700">{currentService.min.toLocaleString()}</strong> — Max: <strong className="text-slate-700">{currentService.max.toLocaleString()}</strong>
                    </span>
                  </div>

                  <input
                    type="number"
                    min={currentService.min}
                    max={currentService.max}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all outline-none font-mono"
                  />

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setQuantity(currentService.min)}
                      className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                    >
                      Min ({currentService.min})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(currentService.min, 500))}
                      className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                    >
                      500
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(currentService.min, 1000))}
                      className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                    >
                      1.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(currentService.min, 5000))}
                      className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                    >
                      5.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantity(currentService.max)}
                      className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                    >
                      Maks ({currentService.max.toLocaleString()})
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic input: Custom Comments */}
              {currentService && (currentService.type === 'Custom Comments' || currentService.type === 'Custom Comments Package') && (
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Özel Yorumlar (Her satıra bir yorum)
                  </label>
                  <textarea
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder={"Harika içerik!\nÇok faydalı bir paylaşım :)\nTakipteyiz!"}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-sans"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Toplam girilen yorum sayısı: <strong>{comments.split('\n').filter(l => l.trim().length > 0).length}</strong>
                  </p>
                </div>
              )}

              {/* Dynamic input: Mentions */}
              {currentService && currentService.type === 'Mentions' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Bahsedilecek Kullanıcı Adları
                  </label>
                  <input
                    type="text"
                    value={usernames}
                    onChange={(e) => setUsernames(e.target.value)}
                    placeholder="kullanici1, kullanici2, kullanici3"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  />
                </div>
              )}

              {/* Dynamic input: SEO */}
              {currentService && currentService.type === 'SEO' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Anahtar Kelimeler (Virgülle ayırın)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="sosyal medya, büyüme, takipçi"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  />
                </div>
              )}

              {/* Dynamic input: Poll */}
              {currentService && currentService.type === 'Poll' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    Anket / Oylama Seçenek Numarası
                  </label>
                  <input
                    type="text"
                    value={answerNumber}
                    onChange={(e) => setAnswerNumber(e.target.value)}
                    placeholder="1, 2 veya 3"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                  />
                </div>
              )}

              {/* Error Box */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Hata Oluştu</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Success Box */}
              {successOrder && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-3 animate-fadeIn">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="font-bold text-base text-emerald-900">Siparişiniz Başarıyla Oluşturuldu!</strong>
                      <span className="font-mono font-bold bg-emerald-200/60 px-2 py-0.5 rounded text-xs">
                        ID: #{successOrder.id}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 mt-1">
                      {successOrder.serviceName} için toplam {formatTRY(successOrder.cost)} tutarındaki indirimli siparişiniz 360 Medya sistemine başarıyla iletildi.
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                        <Check className="w-3.5 h-3.5" /> Otomatik işleme alındı
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {!user ? (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-[0.99]"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Sipariş Vermek İçin Giriş Yapın</span>
                </button>
              ) : !hasSufficientBalance ? (
                <button
                  type="button"
                  onClick={() => openDepositModal()}
                  className="w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/25 active:scale-[0.99]"
                >
                  <Plus className="w-5 h-5" />
                  <span>Yetersiz Bakiye — Bakiye Yükle (+{formatTRY(Math.max(0, calculatedCost - userBalanceNum))})</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !currentService}
                  className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
                    loading
                      ? 'bg-slate-400 text-white cursor-wait'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-[0.99]'
                  }`}
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sipariş Gönderiliyor...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" />
                      <span>Siparişi Onayla & Gönder ({formatTRY(calculatedCost)})</span>
                    </>
                  )}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right 1 Col: Summary & Service Highlights */}
        <div className="space-y-5">
          
          {/* Order Summary & Cost Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Sipariş Özeti
            </h3>

            <div className="space-y-3 text-sm pb-4 border-b border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Servis ID</span>
                <span className="font-mono font-bold text-slate-200">
                  {currentService ? `#${currentService.service}` : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">1000 Adet Fiyatı</span>
                <div className="text-right">
                  <div className="font-semibold text-rose-400 font-mono">
                    {currentService ? formatTRY(parseFloat(currentService.rate) * 0.9) : '-'}
                  </div>
                  {currentService && (
                    <div className="text-[10px] text-slate-400 line-through font-mono">
                      {formatTRY(currentService.rate)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Seçilen Miktar</span>
                <span className="font-mono font-bold text-slate-200">
                  {currentService?.type === 'Package' ? 'Paket' : quantity.toLocaleString()}
                </span>
              </div>

              {savingsAmount > 0 && (
                <div className="flex justify-between items-center bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg text-xs">
                  <span className="text-rose-300 font-medium flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    %10 Hediye İndirimi
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    -{formatTRY(savingsAmount)}
                  </span>
                </div>
              )}
            </div>

            {/* Total Cost Display */}
            <div className="pt-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400 uppercase font-semibold">Ödenecek Tutar</div>
                {savingsAmount > 0 && (
                  <span className="text-xs text-slate-400 line-through font-mono">
                    {formatTRY(originalCost)}
                  </span>
                )}
              </div>
              <div className="text-3xl font-black text-rose-400 font-mono tracking-tight mt-1">
                {formatTRY(calculatedCost)}
              </div>

              {/* Balance status pill */}
              <div className="mt-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Kişisel Bakiyeniz:</span>
                  <span className={`font-mono font-bold ${hasSufficientBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatTRY(userBalanceNum)}
                  </span>
                </div>
                {user ? (
                  <button
                    onClick={() => openDepositModal()}
                    className="mt-2.5 w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Bakiye Yükle</span>
                  </button>
                ) : (
                  <button
                    onClick={() => openAuthModal('login')}
                    className="mt-2.5 w-full py-1.5 px-3 bg-blue-900/40 hover:bg-blue-900/60 text-blue-300 text-xs font-bold rounded-lg border border-blue-800/50 transition flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Giriş Yap</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Service Features Badges */}
          {currentService && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-500" />
                Servis Özellikleri
              </h4>

              <div className="space-y-2 text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>Telafi / Garanti:</span>
                  {currentService.refill ? (
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5" /> Garantili / Telafi Var
                    </span>
                  ) : (
                    <span className="text-slate-400">Garantisiz</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>İptal Edilebilir:</span>
                  {currentService.cancel ? (
                    <span className="font-bold text-blue-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> İptal Desteği Var
                    </span>
                  ) : (
                    <span className="text-slate-400">İptal Edilemez</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span>Başlama Hızı:</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" /> Otomatik (0-15 Dk)
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span>Servis Tipi:</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {currentService.type}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Safety & Quality Tips */}
          <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1 text-blue-800">
              <Flame className="w-4 h-4 text-blue-600" />
              Sipariş Öncesi Önemli Hatırlatma
            </div>
            <ul className="list-disc list-inside space-y-1 text-blue-800/90 pl-1">
              <li>Profil veya gönderinizin gizli olmadığından emin olun.</li>
              <li>Sipariş tamamlanana kadar aynı linke ikinci kez sipariş girmeyin.</li>
              <li>Kullanıcı adınızı sipariş esnasında değiştirmeyin.</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};
