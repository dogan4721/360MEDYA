import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  increment, 
  getDocs,
  limit,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, FirestoreOrder, DepositTransaction, BankAccount, Campaign } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const ADMIN_EMAIL = 'doganb472111@gmail.com';

// 1. Initialize or fetch user profile in Firestore
export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (!snap.exists()) {
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
      balance: 0, // Requirement 1: Kayıt olunca Firestore'da bakiye: 0
      role: isAdmin ? 'admin' : 'user',
      totalSpent: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString()
    };
    await setDoc(userRef, newProfile);
    return newProfile;
  }

  const data = snap.data() as UserProfile;
  // If email matches admin, ensure admin role
  if (isAdmin && data.role !== 'admin') {
    await updateDoc(userRef, { role: 'admin' });
    data.role = 'admin';
  }
  return data;
}

// 2. Create Deposit Request (Pending Admin Approval)
export async function createDepositRequest(
  userId: string,
  userEmail: string,
  amount: number,
  paymentMethod: string,
  transactionId: string,
  extra?: {
    senderFullName?: string;
    senderUsername?: string;
    customerNote?: string;
    description?: string;
    bonusPercent?: number;
    bonusAmount?: number;
    totalCredit?: number;
  }
): Promise<string> {
  const depositRef = doc(collection(db, 'deposits'));
  const bonusPercent = typeof extra?.bonusPercent === 'number' ? extra.bonusPercent : 5;
  const bonusAmount = typeof extra?.bonusAmount === 'number' ? extra.bonusAmount : +(amount * (bonusPercent / 100)).toFixed(2);
  const totalCredit = typeof extra?.totalCredit === 'number' ? extra.totalCredit : +(amount + bonusAmount).toFixed(2);

  const deposit: DepositTransaction = {
    id: depositRef.id,
    userId,
    userEmail,
    amount,
    bonusPercent,
    bonusAmount,
    totalCredit,
    currency: 'TRY',
    status: 'pending',
    paymentMethod,
    transactionId,
    senderFullName: extra?.senderFullName || '',
    senderUsername: extra?.senderUsername || '',
    customerNote: extra?.customerNote || '',
    description: extra?.description || extra?.customerNote || '',
    createdAt: new Date().toISOString()
  };
  await setDoc(depositRef, deposit);
  return depositRef.id;
}

// 2b. Add Balance Directly
export async function addBalanceToUser(
  userId: string, 
  userEmail: string, 
  amount: number, 
  paymentMethod: string,
  transactionId: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  
  // Update user balance
  await updateDoc(userRef, {
    balance: increment(amount)
  });

  // Record deposit transaction
  const depositRef = doc(collection(db, 'deposits'));
  const deposit: DepositTransaction = {
    id: depositRef.id,
    userId,
    userEmail,
    amount,
    currency: 'TRY',
    status: 'completed',
    paymentMethod,
    transactionId,
    createdAt: new Date().toISOString()
  };
  await setDoc(depositRef, deposit);
}

// 2c. Admin: Approve Deposit Request with 5% Bonus Credit
export async function adminApproveDeposit(
  depositId: string,
  userId: string,
  amount: number,
  explicitCreditAmount?: number
): Promise<void> {
  try {
    const depositRef = doc(db, 'deposits', depositId);
    let creditAmount = explicitCreditAmount ?? amount;

    // Check if the deposit document has totalCredit with bonus
    const depositSnap = await getDoc(depositRef);
    if (depositSnap.exists()) {
      const depData = depositSnap.data() as DepositTransaction;
      if (typeof explicitCreditAmount !== 'number') {
        if (typeof depData.totalCredit === 'number' && depData.totalCredit > 0) {
          creditAmount = depData.totalCredit;
        } else if (typeof depData.bonusPercent === 'number' && depData.bonusPercent > 0) {
          creditAmount = +(amount * (1 + depData.bonusPercent / 100)).toFixed(2);
        } else {
          // Default to 5% bonus if not specified
          creditAmount = +(amount * 1.05).toFixed(2);
        }
      }
    }

    // 1. Mark deposit as completed with approvedAt and actual credit given
    await setDoc(depositRef, {
      status: 'completed',
      approvedAt: new Date().toISOString(),
      actualCreditGiven: creditAmount
    }, { merge: true });

    // 2. Credit balance to user
    if (userId && userId !== 'guest_user') {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        balance: increment(creditAmount)
      }, { merge: true });
    }

    // Double-check user doc by deposit's userEmail to guarantee balance is credited
    if (depositSnap.exists()) {
      const email = depositSnap.data().userEmail;
      if (email) {
        const uQuery = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
        const uSnap = await getDocs(uQuery);
        for (const userDoc of uSnap.docs) {
          if (userDoc.id !== userId) {
            await setDoc(userDoc.ref, {
              balance: increment(creditAmount)
            }, { merge: true });
          }
        }
      }
    }
  } catch (clientErr: any) {
    console.warn('Direct Firestore approve note, trying backend API:', clientErr);
    // Call server-side fallback
    const res = await fetch('/api/admin/approve-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId, userId, amount }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || clientErr.message || 'Onaylama işlemi gerçekleştirilemedi.');
    }
  }
}

// 2d. Admin: Reject Deposit Request
export async function adminRejectDeposit(depositId: string): Promise<void> {
  try {
    const depositRef = doc(db, 'deposits', depositId);
    await setDoc(depositRef, {
      status: 'rejected',
      rejectedAt: new Date().toISOString()
    }, { merge: true });
  } catch (clientErr: any) {
    console.warn('Direct Firestore reject note, trying backend API:', clientErr);
    const res = await fetch('/api/admin/reject-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || clientErr.message || 'Reddetme işlemi gerçekleştirilemedi.');
    }
  }
}

// 3. Deduct Balance and Record Order
export async function deductBalanceAndSaveOrder(
  userId: string,
  userEmail: string,
  orderData: Omit<FirestoreOrder, 'id' | 'userId' | 'userEmail' | 'createdAt'>
): Promise<string> {
  const userRef = doc(db, 'users', userId);
  
  // Deduct balance
  await updateDoc(userRef, {
    balance: increment(-orderData.charge),
    totalSpent: increment(orderData.charge),
    totalOrders: increment(1)
  });

  // Save order to Firestore
  const orderRef = doc(collection(db, 'orders'));
  const fullOrder: FirestoreOrder = {
    ...orderData,
    id: orderRef.id,
    userId,
    userEmail,
    createdAt: new Date().toISOString()
  };
  await setDoc(orderRef, fullOrder);
  return orderRef.id;
}

// 4. Admin: Adjust User Balance manually
export async function adminAdjustUserBalance(userId: string, deltaAmount: number): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    balance: increment(deltaAmount)
  });
}

// 5. Bank Accounts (Banka & IBAN Yönetimi)
export const DEFAULT_INITIAL_BANK_ACCOUNT: BankAccount = {
  id: 'default-iban-ziraat',
  bankName: 'Ziraat Bankası',
  accountHolder: 'DOĞAN BAŞBOĞA',
  iban: 'TR33 0001 0000 0000 0000 0000 01',
  branchName: 'Ankara / Kızılay Şubesi',
  accountNumber: '12345678-5001',
  description: 'Havale ve FAST ile 7/24 anında bakiye yükleyebilirsiniz.',
  isActive: true,
  order: 1,
  updatedAt: new Date().toISOString()
};

// Fetch all bank accounts. If none exists, seeds the default one automatically.
export async function getBankAccounts(onlyActive: boolean = false): Promise<BankAccount[]> {
  try {
    const bankRef = collection(db, 'bankAccounts');
    const snap = await getDocs(bankRef);
    
    if (snap.empty) {
      // Seed default account
      await setDoc(doc(db, 'bankAccounts', DEFAULT_INITIAL_BANK_ACCOUNT.id), DEFAULT_INITIAL_BANK_ACCOUNT);
      return [DEFAULT_INITIAL_BANK_ACCOUNT];
    }

    const accounts: BankAccount[] = [];
    snap.forEach((d) => {
      const data = d.data() as BankAccount;
      accounts.push({
        ...data,
        id: d.id || data.id,
        isActive: data.isActive ?? true,
      });
    });

    // Sort: active first, then order
    accounts.sort((a, b) => (Number(b.isActive) - Number(a.isActive)) || ((a.order ?? 0) - (b.order ?? 0)));

    if (onlyActive) {
      return accounts.filter((a) => a.isActive !== false);
    }
    return accounts;
  } catch (err) {
    console.error('getBankAccounts error:', err);
    return [DEFAULT_INITIAL_BANK_ACCOUNT];
  }
}

// Create or update a bank account
export async function saveBankAccount(accountData: Partial<BankAccount> & { bankName: string; accountHolder: string; iban: string }): Promise<string> {
  const accountId = accountData.id || `bank-${Date.now()}`;
  const docRef = doc(db, 'bankAccounts', accountId);

  // Clean IBAN formatting
  const rawIban = accountData.iban.trim().toUpperCase();
  const formattedIban = rawIban.startsWith('TR') ? rawIban : `TR${rawIban}`;

  const cleanData: BankAccount = {
    id: accountId,
    bankName: accountData.bankName.trim(),
    accountHolder: accountData.accountHolder.trim().toUpperCase(),
    iban: formattedIban,
    branchName: accountData.branchName?.trim() || '',
    accountNumber: accountData.accountNumber?.trim() || '',
    description: accountData.description?.trim() || '',
    isActive: accountData.isActive ?? true,
    order: accountData.order ?? 1,
    updatedAt: new Date().toISOString()
  };

  await setDoc(docRef, cleanData, { merge: true });
  return accountId;
}

// Delete a bank account
export async function deleteBankAccount(accountId: string): Promise<void> {
  const docRef = doc(db, 'bankAccounts', accountId);
  await deleteDoc(docRef);
}

// Toggle bank account active status
export async function toggleBankAccountStatus(accountId: string, isActive: boolean): Promise<void> {
  const docRef = doc(db, 'bankAccounts', accountId);
  await updateDoc(docRef, { 
    isActive, 
    updatedAt: new Date().toISOString() 
  });
}

// ==========================================
// 4. CAMPAIGN MANAGEMENT (KAMPANYA YÖNETİMİ)
// ==========================================

export const DEFAULT_INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-deposit-bonus-5',
    title: 'Bakiye Yüklemelerine Özel %5 Ekstra Hediye Bakiye',
    subtitle: 'Yatırdığınız her tutarın üzerine anında %5 ilave bakiye hesabınıza tanımlanır!',
    description: 'Banka Havalesi ve FAST ile yapacağınız tüm bakiye yüklemelerinde, yatırdığınız tutarın %5\'i kadar hediye bakiye hesabınıza otomatik olarak eklenir. Örneğin 500 ₺ yüklemeye 25 ₺, 1.000 ₺ yüklemeye tam 50 ₺ hediye!',
    badge: '+%5 BONUS',
    bonusPercent: 5,
    code: '360BONUS5',
    category: 'deposit',
    targetTab: 'deposit',
    buttonText: 'Hemen Bakiye Yükle',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    iconType: 'wallet',
    terms: [
      'Tüm banka hesaplarımız ve 7/24 FAST transferleri için geçerlidir.',
      'Minimum 10 ₺ ve üzeri tüm bakiye bildirimlerinde otomatik uygulanır.',
      'Kupon kodu gerekmez; yönetici onayında ekstra bakiye cüzdanınıza yansır.',
      'Kazanılan bonus bakiye tüm sosyal medya servislerinde anında kullanılabilir.'
    ],
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'camp-all-services-10',
    title: 'Tüm Sosyal Medya Servislerinde %10 Hediye İndirim',
    subtitle: '360 Medya özel kampanyası ile tüm siparişlerinizde anında %10 net indirim!',
    description: 'Instagram, TikTok, YouTube, Twitter/X, Telegram ve diğer tüm platform servislerimizin tamamında liste fiyatı üzerinden net %10 hediye indirim uygulanmaktadır. Kupon kodu girmeden indirimli fiyattan siparişinizi oluşturun.',
    badge: '%10 İNDİRİM',
    discountPercent: 10,
    code: '360MEDYA10',
    category: 'order',
    targetTab: 'order',
    buttonText: 'İndirimli Sipariş Ver',
    gradient: 'from-rose-600 via-purple-600 to-indigo-600',
    iconType: 'gift',
    terms: [
      'Tüm takipçi, beğeni, izlenme, yorum ve etkileşim servislerinde geçerlidir.',
      'Sepette ve sipariş formunda otomatik olarak hesaplanarak bakiyenizden düşer.',
      'Minimum veya maksimum sipariş sınırı yoktur, dilediğiniz kadar kullanabilirsiniz.'
    ],
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString()
  },
  {
    id: 'camp-guaranteed-refill',
    title: '30 Gün Telafi Garantisi & Öncelikli Hızlı Gönderim',
    subtitle: 'Garantili servislerde düşüşlere karşı 30 gün boyunca tek tıkla telafi güvencesi.',
    description: '360 Medya garantili servislerinde siparişleriniz öncelikli servis kuyruğuna alınır. Olası doğal düşüşlerde Siparişlerim sayfasından tek tıkla 30 gün boyunca ücretsiz otomatik telafi (refill) talep edebilirsiniz.',
    badge: '30 GÜN GARANTİ',
    category: 'special',
    targetTab: 'services',
    buttonText: 'Garantili Servisleri İncele',
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
    iconType: 'sparkles',
    terms: [
      'Servis başlığında Telafi veya Garantili ibaresi yer alan tüm paketlerde geçerlidir.',
      'Siparişlerim sayfasındaki Refill/Telafi butonuyla tek tıkla talep iletilebilir.',
      'Garantili servisler 7/24 otomatik sağlayıcı kontrolü altındadır.'
    ],
    isActive: true,
    order: 3,
    createdAt: new Date().toISOString()
  }
];

// Fetch all campaigns
export async function getCampaigns(onlyActive: boolean = false): Promise<Campaign[]> {
  try {
    const colRef = collection(db, 'campaigns');
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return onlyActive ? DEFAULT_INITIAL_CAMPAIGNS.filter(c => c.isActive) : DEFAULT_INITIAL_CAMPAIGNS;
    }

    let items: Campaign[] = [];
    snap.forEach((doc) => {
      const data = doc.data() as Campaign;
      items.push({ ...data, id: doc.id });
    });

    items.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

    if (onlyActive) {
      items = items.filter(c => c.isActive);
    }

    return items.length > 0 ? items : (onlyActive ? DEFAULT_INITIAL_CAMPAIGNS.filter(c => c.isActive) : DEFAULT_INITIAL_CAMPAIGNS);
  } catch (err) {
    console.error('getCampaigns error, using default:', err);
    return onlyActive ? DEFAULT_INITIAL_CAMPAIGNS.filter(c => c.isActive) : DEFAULT_INITIAL_CAMPAIGNS;
  }
}

// Create or update a campaign
export async function saveCampaign(
  campaignData: Partial<Campaign> & { title: string },
  existingId?: string
): Promise<string> {
  const campaignId = existingId || campaignData.id || `camp-${Date.now()}`;
  const docRef = doc(db, 'campaigns', campaignId);

  const cleanData: Campaign = {
    id: campaignId,
    title: campaignData.title.trim(),
    subtitle: campaignData.subtitle?.trim() || '',
    description: campaignData.description?.trim() || '',
    badge: campaignData.badge?.trim() || '+%5 BONUS',
    discountPercent: typeof campaignData.discountPercent === 'number' ? campaignData.discountPercent : undefined,
    bonusPercent: typeof campaignData.bonusPercent === 'number' ? campaignData.bonusPercent : undefined,
    code: campaignData.code?.trim() || '',
    category: campaignData.category || 'all',
    targetTab: campaignData.targetTab || 'order',
    buttonText: campaignData.buttonText?.trim() || 'Fırsatı İncele',
    gradient: campaignData.gradient || 'from-indigo-600 via-purple-600 to-rose-600',
    iconType: campaignData.iconType || 'gift',
    terms: Array.isArray(campaignData.terms) ? campaignData.terms.filter(t => t && t.trim()) : [],
    isActive: campaignData.isActive ?? true,
    order: typeof campaignData.order === 'number' ? campaignData.order : 1,
    startDate: campaignData.startDate || '',
    endDate: campaignData.endDate || '',
    createdAt: campaignData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setDoc(docRef, cleanData, { merge: true });
  return campaignId;
}

// Delete a campaign
export async function deleteCampaign(campaignId: string): Promise<void> {
  const docRef = doc(db, 'campaigns', campaignId);
  await deleteDoc(docRef);
}

// Toggle campaign active status
export async function toggleCampaignStatus(campaignId: string, isActive: boolean): Promise<void> {
  const docRef = doc(db, 'campaigns', campaignId);
  await updateDoc(docRef, { 
    isActive, 
    updatedAt: new Date().toISOString() 
  });
}

// Seed default initial campaigns to Firestore
export async function seedDefaultCampaigns(): Promise<void> {
  for (const c of DEFAULT_INITIAL_CAMPAIGNS) {
    const docRef = doc(db, 'campaigns', c.id);
    await setDoc(docRef, c, { merge: true });
  }
}

