export interface Service {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string; // price per 1000
  min: number;
  max: number;
  dripfeed?: boolean;
  refill?: boolean;
  cancel?: boolean;
  desc?: string;
  description?: string;
}

export interface BalanceInfo {
  balance: string;
  currency: string;
}

export interface OrderStatusResponse {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
}

export interface LocalOrder {
  orderId: number;
  serviceId: number;
  serviceName: string;
  category: string;
  link: string;
  quantity: number;
  cost: number;
  createdAt: string;
  status?: string;
  startCount?: string;
  remains?: string;
  currency?: string;
  refillEligible?: boolean;
  cancelEligible?: boolean;
  refillStatus?: string;
  docId?: string;
}

export type PlatformType =
  | 'ALL'
  | 'Instagram'
  | 'TikTok'
  | 'YouTube'
  | 'Twitter'
  | 'Telegram'
  | 'Facebook'
  | 'Spotify'
  | 'Threads'
  | 'Diger';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  balance: number; // in TRY, starts at 0
  role: 'admin' | 'user';
  totalSpent: number;
  totalOrders: number;
  createdAt: string;
}

export interface FirestoreOrder {
  id: string;
  userId: string;
  userEmail: string;
  apiOrderId: number | string;
  serviceId: number;
  serviceName: string;
  category: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  remains?: string;
  startCount?: string;
  currency?: string;
  refillEligible?: boolean;
  cancelEligible?: boolean;
  createdAt: string;
}

export interface DepositTransaction {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  bonusPercent?: number; // e.g. 5 for %5 extra bonus
  bonusAmount?: number; // e.g. 5 TL on 100 TL
  totalCredit?: number; // e.g. 105 TL
  currency: string;
  status: 'completed' | 'pending' | 'rejected' | 'failed';
  paymentMethod: string;
  transactionId: string;
  senderFullName?: string;
  senderUsername?: string;
  customerNote?: string;
  description?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  iban: string;
  branchName?: string;
  accountNumber?: string;
  description?: string;
  isActive: boolean;
  order?: number;
  updatedAt?: string;
}

export interface Campaign {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  badge?: string; // e.g., '%5 BONUS', '%10 İNDİRİM', 'ÖZEL FIRSAT'
  discountPercent?: number; // e.g. 10
  bonusPercent?: number; // e.g. 5
  code?: string; // e.g. '360BONUS5'
  category?: 'deposit' | 'order' | 'special' | 'all';
  targetTab?: 'order' | 'deposit' | 'services';
  buttonText?: string;
  gradient?: string; // Tailwind gradient, e.g. 'from-emerald-500 to-teal-700'
  iconType?: 'gift' | 'percent' | 'sparkles' | 'wallet' | 'zap';
  terms?: string[];
  isActive: boolean;
  order?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt?: string;
}
