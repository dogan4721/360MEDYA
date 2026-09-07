import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  Activity, 
  Layers, 
  RotateCcw, 
  XCircle,
  HelpCircle,
  LogIn
} from 'lucide-react';
import { OrderStatusResponse } from '../types';
import { checkMultipleOrdersStatus, checkOrderStatus, formatTRY, triggerCancel, triggerRefill } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export const StatusChecker: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [singleResult, setSingleResult] = useState<{ id: string; data: OrderStatusResponse } | null>(null);
  const [multiResults, setMultiResults] = useState<Record<string, OrderStatusResponse> | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSingleResult(null);
    setMultiResults(null);
    setActionFeedback(null);

    const clean = queryInput.trim();
    if (!clean) {
      setError('Lütfen sorgulamak istediğiniz sipariş numarasını veya virgülle ayrılmış numaraları girin.');
      return;
    }

    setLoading(true);

    try {
      // Check if multiple IDs
      if (clean.includes(',') || clean.includes(' ') || clean.includes('\n')) {
        const ids = clean
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        
        if (ids.length > 100) {
          setError('360 Medya sistemi aynı anda en fazla 100 adet sipariş sorgulayabilir.');
          setLoading(false);
          return;
        }

        const res = await checkMultipleOrdersStatus(ids);
        setMultiResults(res);
      } else {
        const res = await checkOrderStatus(clean);
        if (res.error) {
          setError(res.error);
        } else {
          setSingleResult({ id: clean, data: res });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Sipariş durumu sorgulanamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleRefillSingle = async (orderId: string) => {
    setActionFeedback(null);
    try {
      const res = await triggerRefill(orderId);
      setActionFeedback(`#${orderId} için telafi isteği gönderildi: ${JSON.stringify(res)}`);
    } catch (err: any) {
      setActionFeedback(`Telafi hatası: ${err.message}`);
    }
  };

  const handleCancelSingle = async (orderId: string) => {
    setActionFeedback(null);
    try {
      const res = await triggerCancel([orderId]);
      setActionFeedback(`#${orderId} için iptal isteği gönderildi: ${JSON.stringify(res)}`);
    } catch (err: any) {
      setActionFeedback(`İptal hatası: ${err.message}`);
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
            <Search className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Durum Sorgula</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Sipariş durumu sorgulama ve anlık takip paneli üyelerimize özeldir. Devam etmek için lütfen hesabınıza giriş yapın.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Giriş Yap / Kayıt Ol</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Search className="w-7 h-7 text-blue-600" />
          Sipariş Durumu Sorgula
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          360 Medya üzerindeki tekil bir siparişin veya birden fazla siparişin güncel durumunu, başlangıç sayısını ve kalanını anında sorgulayın.
        </p>
      </div>

      {/* Query Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex justify-between items-center">
              <span>Sipariş Numarası (Tek veya Çoklu)</span>
              <span className="text-xs text-slate-500 font-normal">
                Örn: 23501 veya 100, 101, 102
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Örnek: 23501 (Birden fazla için virgülle ayırın)"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              100 adede kadar sipariş numarasını virgülle ayırarak aynı anda sorgulayabilirsiniz.
            </span>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sorgulanıyor...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Sorgula</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action feedback */}
        {actionFeedback && (
          <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm">
            {actionFeedback}
          </div>
        )}
      </div>

      {/* Single Result Display */}
      {singleResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 animate-fadeIn">
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-lg">Sipariş Detayı: #{singleResult.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRefillSingle(singleResult.id)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Telafi
              </button>
              <button
                onClick={() => handleCancelSingle(singleResult.id)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1"
              >
                <XCircle className="w-3 h-3" /> İptal
              </button>
            </div>
          </div>

          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Durum</span>
              <span className="text-base font-bold text-blue-600 capitalize">
                {singleResult.data.status || 'Bilinmiyor'}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Kesilen Ücret</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {singleResult.data.charge ? `${singleResult.data.charge} ${singleResult.data.currency || 'TRY'}` : '-'}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Başlangıç Sayısı</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {singleResult.data.start_count || '0'}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block mb-1">Kalan Miktar</span>
              <span className="text-base font-bold text-amber-600 font-mono">
                {singleResult.data.remains || '0'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Results Display */}
      {multiResults && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6 animate-fadeIn">
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
            <span className="font-bold text-lg flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Çoklu Sipariş Sonuçları ({Object.keys(multiResults).length} Adet)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Sipariş ID</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4">Ücret</th>
                  <th className="py-3 px-4">Başlangıç</th>
                  <th className="py-3 px-4">Kalan</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(multiResults).map(([id, rawData]) => {
                  const data = rawData as OrderStatusResponse;
                  if (data.error) {
                    return (
                      <tr key={id} className="bg-rose-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-rose-700">#{id}</td>
                        <td colSpan={5} className="py-3 px-4 text-xs text-rose-600">
                          Hata: {data.error}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">#{id}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-600">{data.status}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {data.charge} {data.currency || 'TRY'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{data.start_count}</td>
                      <td className="py-3 px-4 font-mono text-slate-700 font-bold">{data.remains}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRefillSingle(id)}
                          className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        >
                          Telafi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
