import { BalanceInfo, LocalOrder, OrderStatusResponse, PlatformType, Service } from '../types';

export async function fetchBalance(): Promise<BalanceInfo> {
  const res = await fetch('/api/balance');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Bakiye sorgulanamadı');
  }
  return res.json();
}

export async function fetchServices(forceRefresh = false): Promise<Service[]> {
  const url = forceRefresh ? '/api/services?refresh=true' : '/api/services';
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Hizmetler alınamadı');
  }
  const data = await res.json();
  return data.services || [];
}

export async function submitOrder(orderPayload: Record<string, any>): Promise<{ order: number }> {
  const res = await fetch('/api/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Sipariş oluşturulamadı');
  }
  if (!data.order) {
    throw new Error('Geçersiz yanıt: Sipariş numarası alınamadı');
  }
  return data;
}

export async function checkOrderStatus(orderId: number | string): Promise<OrderStatusResponse> {
  const res = await fetch('/api/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: orderId }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Sipariş durumu alınamadı');
  }
  return data;
}

export async function checkMultipleOrdersStatus(orderIds: (number | string)[]): Promise<Record<string, OrderStatusResponse>> {
  const res = await fetch('/api/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders: orderIds }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Sipariş durumları sorgulanamadı');
  }
  return data;
}

export async function triggerRefill(orderId: number | string): Promise<any> {
  const res = await fetch('/api/refill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order: orderId }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Telafi işlemi başlatılamadı');
  }
  return data;
}

export async function triggerCancel(orders: (number | string)[]): Promise<any> {
  const res = await fetch('/api/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'İptal işlemi başlatılamadı');
  }
  return data;
}

export function detectPlatform(categoryName: string, serviceName: string): PlatformType {
  const text = `${categoryName} ${serviceName}`.toLowerCase();
  if (text.includes('instagram')) return 'Instagram';
  if (text.includes('tiktok')) return 'TikTok';
  if (text.includes('youtube')) return 'YouTube';
  if (text.includes('twitter') || text.includes(' x ') || text.includes('x -') || text.startsWith('x ') || text.includes('tweet')) return 'Twitter';
  if (text.includes('telegram')) return 'Telegram';
  if (text.includes('facebook')) return 'Facebook';
  if (text.includes('spotify')) return 'Spotify';
  if (text.includes('threads')) return 'Threads';
  return 'Diger';
}

export function formatTRY(amount: number | string): string {
  const num = typeof amount === 'number' ? (isNaN(amount) ? 0 : amount) : (parseFloat(amount) || 0);
  try {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ₺`;
  }
}

const STORAGE_ORDERS_KEY = 'turkpaneli_local_orders_v1';
let inMemoryOrders: LocalOrder[] | null = null;

export function getSavedOrders(): LocalOrder[] {
  try {
    if (inMemoryOrders && inMemoryOrders.length > 0) {
      return inMemoryOrders;
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage ? window.localStorage.getItem(STORAGE_ORDERS_KEY) : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            inMemoryOrders = parsed;
            return parsed;
          }
        }
      } catch {
        // LocalStorage blocked in cross-origin iframe
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function saveOrders(orders: LocalOrder[]): void {
  inMemoryOrders = orders;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    }
  } catch {
    // LocalStorage blocked in cross-origin iframe
  }
}
