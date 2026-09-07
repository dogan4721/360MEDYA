import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  RotateCcw, 
  XCircle, 
  ShoppingBag, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Filter,
  Info,
  X,
  Check,
  Gift
} from 'lucide-react';
import { PlatformType, Service } from '../types';
import { detectPlatform, formatTRY } from '../utils/api';

interface ServicesCatalogProps {
  services: Service[];
  onSelectServiceToOrder: (serviceId: number) => void;
}

const PLATFORMS: { id: PlatformType; label: string; icon: string }[] = [
  { id: 'ALL', label: 'Tümü', icon: '🌐' },
  { id: 'Instagram', label: 'Instagram', icon: '📸' },
  { id: 'TikTok', label: 'TikTok', icon: '🎵' },
  { id: 'YouTube', label: 'YouTube', icon: '▶️' },
  { id: 'Twitter', label: 'Twitter (X)', icon: '𝕏' },
  { id: 'Telegram', label: 'Telegram', icon: '✈️' },
  { id: 'Facebook', label: 'Facebook', icon: '👥' },
  { id: 'Spotify', label: 'Spotify', icon: '🎧' },
];

export const ServicesCatalog: React.FC<ServicesCatalogProps> = ({
  services,
  onSelectServiceToOrder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyRefill, setOnlyRefill] = useState(false);
  const [onlyCancel, setOnlyCancel] = useState(false);
  const [sortBy, setSortBy] = useState<'ID_ASC' | 'PRICE_ASC' | 'PRICE_DESC'>('ID_ASC');
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectService, setInspectService] = useState<Service | null>(null);
  const itemsPerPage = 35;

  // Categories list based on selected platform
  const availableCategories = useMemo(() => {
    const list = services.filter((s) => {
      if (selectedPlatform === 'ALL') return true;
      return detectPlatform(s.category, s.name) === selectedPlatform;
    });

    const categoriesSet = new Set<string>();
    list.forEach((s) => categoriesSet.add(s.category));
    return Array.from(categoriesSet);
  }, [services, selectedPlatform]);

  // Reset category when platform changes
  const handlePlatformChange = (p: PlatformType) => {
    setSelectedPlatform(p);
    setSelectedCategory('ALL');
    setCurrentPage(1);
  };

  // Filtered and sorted services
  const filteredServices = useMemo(() => {
    return services
      .filter((s) => {
        // Platform
        if (selectedPlatform !== 'ALL') {
          if (detectPlatform(s.category, s.name) !== selectedPlatform) return false;
        }

        // Category
        if (selectedCategory !== 'ALL' && s.category !== selectedCategory) {
          return false;
        }

        // Only Refill
        if (onlyRefill && !s.refill) return false;

        // Only Cancel
        if (onlyCancel && !s.cancel) return false;

        // Search text
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchId = String(s.service).includes(q);
          const matchName = s.name.toLowerCase().includes(q);
          const matchCategory = s.category.toLowerCase().includes(q);
          if (!matchId && !matchName && !matchCategory) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'ID_ASC') return a.service - b.service;
        const rateA = parseFloat(a.rate) || 0;
        const rateB = parseFloat(b.rate) || 0;
        if (sortBy === 'PRICE_ASC') return rateA - rateB;
        if (sortBy === 'PRICE_DESC') return rateB - rateA;
        return 0;
      });
  }, [services, selectedPlatform, selectedCategory, onlyRefill, onlyCancel, searchTerm, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage) || 1;
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredServices.slice(start, start + itemsPerPage);
  }, [filteredServices, currentPage]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-blue-600" />
            Servis & Fiyat Listesi
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Toplam <strong>{services.length.toLocaleString()}</strong> aktif 360 Medya servisini inceleyin, filtreleyin ve fiyatları karşılaştırın.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          Filtrelenen: <span className="text-blue-600 font-bold">{filteredServices.length}</span> Servis
        </div>
      </div>

      {/* 🎁 10% Discount Campaign Notice */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-rose-500/10 via-purple-500/10 to-indigo-500/10 border border-rose-200 p-3 sm:p-4 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900">360 Medya Özel Hediye Kampanyası:</span>
            <span className="text-slate-600 ml-1">Tüm servislerde standart liste fiyatı üzerinden <strong>%10 indirim</strong> tanımlanmıştır. Siparişinizde indirimli fiyat uygulanır.</span>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-md shrink-0">
          <Sparkles className="w-3 h-3" /> %10 İndirimli
        </span>
      </div>

      {/* Platform Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {PLATFORMS.map((p) => {
          const isSelected = selectedPlatform === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handlePlatformChange(p.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Servis adı, ID veya kelime ile ara..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium truncate"
            >
              <option value="ALL">Tüm Kategoriler ({availableCategories.length})</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selection */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium"
            >
              <option value="ID_ASC">Sıralama: Servis ID (Küçükten Büyüğe)</option>
              <option value="PRICE_ASC">Fiyat: En Düşükten En Yükseğe</option>
              <option value="PRICE_DESC">Fiyat: En Yüksekten En Düşüğe</option>
            </select>
          </div>

          {/* Quick Checkbox Toggles */}
          <div className="flex items-center gap-4 px-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyRefill}
                onChange={(e) => {
                  setOnlyRefill(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300"
              />
              <span className="flex items-center gap-1">
                <RotateCcw className="w-3 h-3 text-emerald-600" /> Sadece Garantili
              </span>
            </label>

            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyCancel}
                onChange={(e) => {
                  setOnlyCancel(e.target.checked);
                  setCurrentPage(1);
                }}
                className="w-3.5 h-3.5 text-rose-600 rounded border-slate-300"
              />
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" /> İptal Edilebilir
              </span>
            </label>
          </div>

        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3.5 px-4 w-20">ID</th>
                <th className="py-3.5 px-4">Servis Adı & Kategori</th>
                <th className="py-3.5 px-4 whitespace-nowrap">1.000 Fiyatı</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Min / Max</th>
                <th className="py-3.5 px-4 text-center">Özellikler</th>
                <th className="py-3.5 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedServices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                    Filtrelerinize uygun servis bulunamadı.
                  </td>
                </tr>
              ) : (
                paginatedServices.map((service) => (
                  <tr key={service.service} className="hover:bg-slate-50/80 transition-colors">
                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      #{service.service}
                    </td>

                    {/* Name & Category */}
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {service.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {service.category}
                      </div>
                    </td>

                    {/* Rate with %10 Discount */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-baseline gap-1.5 font-mono">
                        <span className="font-bold text-rose-600 text-sm">
                          {formatTRY(parseFloat(service.rate) * 0.9)}
                        </span>
                        <span className="text-xs text-slate-400 line-through">
                          {formatTRY(service.rate)}
                        </span>
                      </div>
                      <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mt-0.5">
                        %10 İndirimli
                      </span>
                    </td>

                    {/* Min / Max */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-slate-700">
                      <div>Min: {service.min.toLocaleString()}</div>
                      <div>Max: {service.max.toLocaleString()}</div>
                    </td>

                    {/* Features Badges */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {service.refill ? (
                          <span
                            title="Telafi Garantili"
                            className="p-1 rounded-md bg-emerald-100 text-emerald-700"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span
                            title="Garantisiz"
                            className="p-1 rounded-md bg-slate-100 text-slate-400"
                          >
                            <RotateCcw className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}

                        {service.cancel ? (
                          <span
                            title="İptal Edilebilir"
                            className="p-1 rounded-md bg-rose-100 text-rose-700"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span
                            title="İptal Edilemez"
                            className="p-1 rounded-md bg-slate-100 text-slate-400"
                          >
                            <XCircle className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}

                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {service.type}
                        </span>
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {(service.desc || service.description) && (
                          <button
                            type="button"
                            onClick={() => setInspectService(service)}
                            title="Servis Açıklamasını Görüntüle"
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition border border-slate-200 inline-flex items-center gap-1"
                          >
                            <Info className="w-3.5 h-3.5 text-blue-600" />
                            <span>Açıklama</span>
                          </button>
                        )}
                        <button
                          onClick={() => onSelectServiceToOrder(service.service)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-semibold text-xs transition border border-blue-200 hover:border-blue-600 inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Sipariş Ver</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Sayfa <span className="font-bold text-slate-900">{currentPage}</span> / {totalPages} (Toplam {filteredServices.length} Servis)
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Servis Açıklaması Detay Modalı */}
      {inspectService && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setInspectService(null)}
        >
          <div 
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Servis Açıklaması & Detayları</h3>
                  <p className="text-xs text-slate-500 font-mono">Servis ID: #{inspectService.service}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectService(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Servis Adı</div>
                <div className="text-base font-bold text-slate-900 leading-snug">{inspectService.name}</div>
                <div className="text-xs text-blue-600 font-medium mt-1">{inspectService.category}</div>
              </div>

              {/* Description Block */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Talimatlar & Açıklama:</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-xl whitespace-pre-wrap leading-relaxed font-sans select-text">
                  {inspectService.desc || inspectService.description || 'Bu servis için standart gönderim kuralları geçerlidir.'}
                </div>
              </div>

              {/* Service Specs Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <span className="text-slate-500 block text-[11px]">1.000 Adet Fiyatı</span>
                  <strong className="text-sm font-mono text-blue-600 font-bold">{formatTRY(inspectService.rate)}</strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                  <span className="text-slate-500 block text-[11px]">Min / Max Miktar</span>
                  <strong className="text-xs font-mono text-slate-800 font-semibold">
                    {inspectService.min.toLocaleString()} - {inspectService.max.toLocaleString()}
                  </strong>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs col-span-2 sm:col-span-1">
                  <span className="text-slate-500 block text-[11px]">Telafi & İptal</span>
                  <div className="font-semibold text-xs mt-0.5">
                    {inspectService.refill ? (
                      <span className="text-emerald-600">♻️ 30 Gün Garantili</span>
                    ) : (
                      <span className="text-slate-500">Garantisiz</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setInspectService(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={() => {
                  const sId = inspectService.service;
                  setInspectService(null);
                  onSelectServiceToOrder(sId);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Bu Servisle Sipariş Ver</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
