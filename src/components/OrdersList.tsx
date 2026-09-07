import React, { useState, useEffect } from 'react';
import { 
  ListOrdered, 
  RefreshCw, 
  RotateCcw, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  AlertCircle, 
  Search,
  Check,
  Ban,
  Hourglass,
  LogIn,
  Wallet,
  ShoppingBag,
  Calendar
} from 'lucide-react';
import { LocalOrder, FirestoreOrder } from '../types';
import { checkMultipleOrdersStatus, checkOrderStatus, formatTRY, triggerCancel, triggerRefill } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface OrdersListProps {
  orders: LocalOrder[];
  onUpdateOrders: (updated: LocalOrder[]) => void;
  onNavigateToOrder: () => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({
  orders: propOrders,
  onUpdateOrders,
  onNavigateToOrder,
}) => {
  const { user, openAuthModal } = useAuth();

  const [firestoreOrders, setFirestoreOrders] = useState<LocalOrder[]>([]);
  const [firestoreLoading, setFirestoreLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingAll, setUpdatingAll] = useState(false);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Sync user's private orders from Firestore
  useEffect(() => {
    if (!user) {
      setFirestoreOrders([]);
      return;
    }

    setFirestoreLoading(true);
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: LocalOrder[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as FirestoreOrder;
        list.push({
          docId: d.id,
          orderId: Number(data.apiOrderId),
          serviceId: data.serviceId,
          serviceName: data.serviceName,
          category: data.category,
          link: data.link,
          quantity: data.quantity,
          cost: data.charge,
          createdAt: data.createdAt,
          status: data.status,
          startCount: data.startCount,
          remains: data.remains,
          currency: data.currency || 'TRY',
          refillEligible: data.refillEligible,
          cancelEligible: data.cancelEligible
        });
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setFirestoreOrders(list);
      setFirestoreLoading(false);
    }, (err) => {
      console.warn('Firestore orders sync note:', err);
      setFirestoreLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Orders are strictly personal to the logged in user
  const activeOrders = user ? firestoreOrders : [];

  // Auto-sync function that fetches startCount, remains, and status from TurkPaneli API
  const syncOrdersWithApi = async (ordersList: LocalOrder[], showNotification = false) => {
    if (!ordersList || ordersList.length === 0) return;

    const validOrders = ordersList.filter((o) => o.orderId && !isNaN(o.orderId) && o.orderId > 0);
    if (validOrders.length === 0) return;

    setIsAutoSyncing(true);
    try {
      const orderIds = validOrders.map((o) => o.orderId);
      let updatedResults: Record<string, any> = {};

      if (orderIds.length === 1) {
        const res = await checkOrderStatus(orderIds[0]);
        if (res && !res.error) {
          updatedResults[String(orderIds[0])] = res;
        }
      } else {
        const multiRes = await checkMultipleOrdersStatus(orderIds);
        if (multiRes && typeof multiRes === 'object') {
          updatedResults = multiRes;
        }
      }

      // Update Firestore and parent state
      const nextList: LocalOrder[] = ordersList.map((o) => {
        const apiInfo = updatedResults[String(o.orderId)];
        if (!apiInfo || apiInfo.error) return o;

        const newStatus = apiInfo.status || o.status;
        const newStart = apiInfo.start_count !== undefined && apiInfo.start_count !== null ? apiInfo.start_count : o.startCount;
        const newRemains = apiInfo.remains !== undefined && apiInfo.remains !== null ? apiInfo.remains : o.remains;
        const newCurrency = apiInfo.currency || o.currency;

        // Persist to Firestore if authenticated & doc exists
        if (o.docId) {
          setDoc(doc(db, 'orders', o.docId), {
            status: newStatus,
            startCount: newStart,
            remains: newRemains,
            currency: newCurrency,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch((e) => console.warn('Firestore doc status sync note:', e));
        }

        return {
          ...o,
          status: newStatus,
          startCount: newStart,
          remains: newRemains,
          currency: newCurrency,
        };
      });

      onUpdateOrders(nextList);
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      if (showNotification) {
        setActionMessage({
          type: 'success',
          text: `Sipariş durumları, başlangıç ve kalan adetler API üzerinden güncellendi.`,
        });
      }
    } catch (err: any) {
      console.warn('Orders auto sync error:', err);
      if (showNotification) {
        setActionMessage({
          type: 'error',
          text: err.message || 'API senkronizasyonu sırasında hata oluştu.',
        });
      }
    } finally {
      setIsAutoSyncing(false);
    }
  };

  // Automated background synchronization: runs on mount and every 25 seconds
  useEffect(() => {
    const listToSync = activeOrders;
    if (listToSync.length === 0) return;

    // Delay initial sync slightly to allow network load to settle
    const initialSyncTimer = setTimeout(() => {
      syncOrdersWithApi(listToSync, false);
    }, 1200);

    // Periodic check every 25 seconds
    const intervalTimer = setInterval(() => {
      syncOrdersWithApi(listToSync, false);
    }, 25000);

    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(intervalTimer);
    };
  }, [user, activeOrders.length]);

  // Status badge styling
  const getStatusBadge = (status?: string) => {
    const s = (status || 'Pending').toLowerCase();
    if (s.includes('completed') || s.includes('tamam')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tamamlandı
        </span>
      );
    }
    if (s.includes('in progress') || s.includes('işlem')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" /> İşlemde
        </span>
      );
    }
    if (s.includes('processing') || s.includes('hazırlan')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Hourglass className="w-3.5 h-3.5 text-amber-600" /> Hazırlanıyor
        </span>
      );
    }
    if (s.includes('partial') || s.includes('kısmi')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <Clock className="w-3.5 h-3.5 text-purple-600" /> Kısmi Tamamlandı
        </span>
      );
    }
    if (s.includes('cancel') || s.includes('iptal')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <Ban className="w-3.5 h-3.5 text-rose-600" /> İptal Edildi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        <Clock className="w-3.5 h-3.5 text-slate-500" /> Beklemede
      </span>
    );
  };

  // Format order date & exact creation time
  const formatOrderTime = (isoString?: string) => {
    if (!isoString) return { date: '-', time: '-' };
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return { date: isoString, time: '' };
      const date = d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const time = d.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return { date, time };
    } catch {
      return { date: isoString, time: '' };
    }
  };

  // Bulk refresh all statuses from TurkPaneli API
  const handleRefreshAll = async () => {
    if (activeOrders.length === 0) return;
    setUpdatingAll(true);
    setActionMessage(null);

    try {
      const orderIds = activeOrders.map((o) => o.orderId);
      
      if (orderIds.length === 1) {
        const singleRes = await checkOrderStatus(orderIds[0]);
        const updated = activeOrders.map((o) => {
          if (o.orderId === orderIds[0]) {
            return {
              ...o,
              status: singleRes.status || o.status,
              startCount: singleRes.start_count,
              remains: singleRes.remains,
              currency: singleRes.currency || o.currency,
            };
          }
          return o;
        });
        if (!user) onUpdateOrders(updated);
      } else {
        const multiRes = await checkMultipleOrdersStatus(orderIds);
        const updated = activeOrders.map((o) => {
          const res = multiRes[String(o.orderId)];
          if (res && !res.error) {
            return {
              ...o,
              status: res.status || o.status,
              startCount: res.start_count,
              remains: res.remains,
              currency: res.currency || o.currency,
            };
          }
          return o;
        });
        if (!user) onUpdateOrders(updated);
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Durumlar güncellenirken hata oluştu',
      });
    } finally {
      setUpdatingAll(false);
    }
  };

  // Trigger Refill (Telafi)
  const handleRefill = async (orderId: number) => {
    setActionLoadingId(orderId);
    setActionMessage(null);
    try {
      const res = await triggerRefill(orderId);
      if (res.error) {
        throw new Error(res.error);
      }
      setActionMessage({
        type: 'success',
        text: `#${orderId} numaralı sipariş için telafi talebi başarıyla iletildi! Refill ID: ${res.refill || 'Kayıtlı'}`,
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `#${orderId} telafi hatası: ${err.message}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Trigger Cancel (İptal)
  const handleCancel = async (orderId: number) => {
    if (!confirm(`#${orderId} numaralı siparişi iptal etmek istediğinize emin misiniz?`)) return;
    setActionLoadingId(orderId);
    setActionMessage(null);
    try {
      const res = await triggerCancel([orderId]);
      setActionMessage({
        type: 'success',
        text: `#${orderId} numaralı sipariş için iptal talebi iletildi.`,
      });
      // refresh status
      const updatedStatus = await checkOrderStatus(orderId);
      const updated = activeOrders.map((o) => o.orderId === orderId ? { ...o, status: updatedStatus.status || 'Canceled' } : o);
      if (!user) onUpdateOrders(updated);
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: `#${orderId} iptal hatası: ${err.message}`,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered orders
  const filteredOrders = activeOrders.filter((o) => {
    const matchesSearch =
      searchTerm === '' ||
      String(o.orderId).includes(searchTerm) ||
      o.link.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.serviceName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    const s = (o.status || 'Pending').toLowerCase();
    if (statusFilter === 'COMPLETED') return s.includes('completed') || s.includes('tamam');
    if (statusFilter === 'IN_PROGRESS') return s.includes('in progress') || s.includes('processing') || s.includes('işlem');
    if (statusFilter === 'PARTIAL') return s.includes('partial') || s.includes('kısmi');
    if (statusFilter === 'CANCELED') return s.includes('cancel') || s.includes('iptal');
    return true;
  });

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20">
            <ListOrdered className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Siparişlerim</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Sipariş geçmişi ve takip paneli kişiye özeldir. Geçmiş siparişlerinizi görüntülemek ve takip etmek için lütfen hesabınıza giriş yapın.
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
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6">
      {/* Header section */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ListOrdered className="w-7 h-7 text-blue-600" />
            Siparişlerim
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {user 
              ? `${user.email} hesabınıza ait tüm siparişler ve canlı gönderim durumları.` 
              : 'Verdiğiniz siparişleri takip edin, telafi veya iptal işlemlerini tek tıkla gerçekleştirin.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onNavigateToOrder}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Yeni Sipariş Ver</span>
          </button>
        </div>
      </div>

      {/* Alert message notification */}
      {actionMessage && (
        <div className={`p-4 rounded-xl mb-6 text-xs flex items-center justify-between gap-3 animate-in fade-in ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sipariş ID, link veya servis ara..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Tümü' },
              { id: 'IN_PROGRESS', label: 'İşlemdekiler' },
              { id: 'COMPLETED', label: 'Tamamlananlar' },
              { id: 'PARTIAL', label: 'Kısmi' },
              { id: 'CANCELED', label: 'İptal Edilenler' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <ListOrdered className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Henüz Sipariş Bulunmuyor
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Arama kriterlerinize uygun sipariş bulunamadı.'
                : '360 Medya üzerinden %10 indirimli ilk siparişinizi vererek başlayın.'}
            </p>
            <button
              onClick={onNavigateToOrder}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20 inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Hemen Sipariş Ver</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Sipariş ID</th>
                  <th className="py-3 px-4">Sipariş Zamanı</th>
                  <th className="py-3 px-4">Servis Detayı</th>
                  <th className="py-3 px-4">Hedef Bağlantı</th>
                  <th className="py-3 px-4">Miktar</th>
                  <th className="py-3 px-4">Tutar</th>
                  <th className="py-3 px-4">Başlangıç / Kalan</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const isLoadingThis = actionLoadingId === order.orderId;
                  const orderTime = formatOrderTime(order.createdAt);
                  return (
                    <tr key={order.orderId} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                        #{order.orderId}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{orderTime.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[10px] mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-600">{orderTime.time}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate" title={order.serviceName}>
                          {order.serviceName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{order.category}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <a
                          href={order.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 truncate font-mono text-[11px]"
                          title={order.link}
                        >
                          <span className="truncate">{order.link}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {order.quantity.toLocaleString('tr-TR')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 font-mono">
                        {formatTRY(order.cost)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] font-mono">
                        <div>Başlangıç: <strong className="text-slate-800">{order.startCount ?? '-'}</strong></div>
                        <div>Kalan: <strong className="text-slate-800">{order.remains ?? '-'}</strong></div>
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {order.refillEligible && (
                            <button
                              onClick={() => handleRefill(order.orderId)}
                              disabled={isLoadingThis}
                              title="Garantili Telafi İste"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${isLoadingThis ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          {order.cancelEligible && (
                            <button
                              onClick={() => handleCancel(order.orderId)}
                              disabled={isLoadingThis}
                              title="Siparişi İptal Et"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              setActionLoadingId(order.orderId);
                              try {
                                const s = await checkOrderStatus(order.orderId);
                                const updated = activeOrders.map((o) => o.orderId === order.orderId ? {
                                  ...o,
                                  status: s.status || o.status,
                                  startCount: s.start_count ?? o.startCount,
                                  remains: s.remains ?? o.remains
                                } : o);
                                if (!user) onUpdateOrders(updated);
                              } finally {
                                setActionLoadingId(null);
                              }
                            }}
                            disabled={isLoadingThis}
                            title="Tekil Durumu Yenile"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThis ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
