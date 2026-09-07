import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShoppingBag, 
  CreditCard, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Minus, 
  ExternalLink,
  Loader2,
  TrendingUp,
  DollarSign,
  UserCheck,
  XCircle,
  Clock,
  Building2,
  Edit2,
  Trash2,
  Copy,
  Check,
  Gift,
  Tag,
  Percent,
  Sparkles
} from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc, increment, query, orderBy, limit } from 'firebase/firestore';
import { 
  db, 
  ADMIN_EMAIL, 
  adminApproveDeposit, 
  adminRejectDeposit,
  getBankAccounts,
  saveBankAccount,
  deleteBankAccount,
  toggleBankAccountStatus,
  getCampaigns,
  saveCampaign,
  deleteCampaign,
  toggleCampaignStatus,
  seedDefaultCampaigns,
  DEFAULT_INITIAL_CAMPAIGNS
} from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { UserProfile, FirestoreOrder, DepositTransaction, BankAccount, Campaign } from '../types';
import { formatTRY, checkMultipleOrdersStatus, checkOrderStatus } from '../utils/api';

export function AdminPanel() {
  const { user, userProfile, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'orders' | 'deposits' | 'banks' | 'campaigns'>('users');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [ordersList, setOrdersList] = useState<FirestoreOrder[]>([]);
  const [depositsList, setDepositsList] = useState<DepositTransaction[]>([]);
  const [bankAccountsList, setBankAccountsList] = useState<BankAccount[]>([]);
  const [campaignsList, setCampaignsList] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Campaign management state
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [campaignFormData, setCampaignFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    badge: '',
    discountPercent: 0,
    bonusPercent: 5,
    code: '',
    category: 'deposit' as 'deposit' | 'order' | 'special' | 'all',
    targetTab: 'deposit' as 'order' | 'deposit' | 'services',
    buttonText: 'Hemen Yükle & Kazan',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    iconType: 'gift' as 'gift' | 'percent' | 'sparkles' | 'wallet' | 'zap',
    terms: 'Tüm havale, EFT ve FAST yüklemelerinde geçerlidir.\nYükleme onaylandığında ekstra %5 anında bakiyeye eklenir.',
    isActive: true,
    order: 1,
  });
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  // Bank account management state
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankFormData, setBankFormData] = useState({
    bankName: '',
    accountHolder: '',
    iban: '',
    branchName: '',
    accountNumber: '',
    description: '',
    isActive: true,
  });
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [copiedBankIban, setCopiedBankIban] = useState<string | null>(null);

  // Balance adjustment modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('50');
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      // 1. Fetch all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData: UserProfile[] = [];
      usersSnap.forEach((d) => {
        const u = d.data() as UserProfile;
        usersData.push({
          ...u,
          uid: d.id || u.uid,
          balance: typeof u.balance === 'number' ? u.balance : 0
        });
      });
      setUsersList(usersData);

      // 2. Fetch all orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const ordersData: FirestoreOrder[] = [];
      ordersSnap.forEach((d) => {
        const o = d.data() as FirestoreOrder;
        ordersData.push({
          ...o,
          id: d.id || o.id
        });
      });
      // Sort newest first
      ordersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrdersList(ordersData);

      // 3. Fetch all deposits
      const depositsSnap = await getDocs(collection(db, 'deposits'));
      const depositsData: DepositTransaction[] = [];
      depositsSnap.forEach((d) => {
        const dep = d.data() as DepositTransaction;
        depositsData.push({
          ...dep,
          id: d.id || dep.id
        });
      });
      depositsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDepositsList(depositsData);

      // 4. Fetch bank accounts
      const banks = await getBankAccounts(false);
      setBankAccountsList(banks);

      // 5. Fetch campaigns
      const camps = await getCampaigns(false);
      setCampaignsList(camps);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-white">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="text-base font-bold mb-1">Yönetici Yetkisi Gerekli</h2>
        <p className="text-xs text-slate-400 mb-4">
          Admin paneline yalnızca yetkili yönetici (<span className="text-amber-400 font-mono">{ADMIN_EMAIL}</span>) erişebilir.
        </p>
      </div>
    );
  }

  // Handle balance adjustment
  const handleSaveBalanceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const val = parseFloat(adjustAmount);
    if (isNaN(val) || val <= 0) {
      setFeedback('Lütfen geçerli pozitif bir tutar giriniz.');
      return;
    }

    setAdjustLoading(true);
    try {
      const delta = adjustType === 'add' ? val : -val;
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, {
        balance: increment(delta)
      });

      setFeedback(`${selectedUser.email} kullanıcısının bakiyesi başarıyla güncellendi.`);
      setSelectedUser(null);
      await fetchAdminData();
    } catch (err: any) {
      setFeedback('Bakiye güncellenemedi: ' + err.message);
    } finally {
      setAdjustLoading(false);
    }
  };

  const [actionDepositLoadingId, setActionDepositLoadingId] = useState<string | null>(null);
  const [confirmDepositModal, setConfirmDepositModal] = useState<{
    deposit: DepositTransaction;
    action: 'approve' | 'reject';
  } | null>(null);
  const [depositModalError, setDepositModalError] = useState<string | null>(null);

  // Open confirmation modal for approve
  const handleApproveDeposit = (deposit: DepositTransaction) => {
    setDepositModalError(null);
    setConfirmDepositModal({ deposit, action: 'approve' });
  };

  // Open confirmation modal for reject
  const handleRejectDeposit = (deposit: DepositTransaction) => {
    setDepositModalError(null);
    setConfirmDepositModal({ deposit, action: 'reject' });
  };

  const [syncingAdminOrders, setSyncingAdminOrders] = useState(false);

  // Sync admin orders status, startCount, remains directly from TurkPaneli API
  const syncAdminOrdersWithApi = async () => {
    if (ordersList.length === 0) return;
    setSyncingAdminOrders(true);
    setFeedback(null);
    try {
      const validOrders = ordersList.filter((o) => o.apiOrderId && Number(o.apiOrderId) > 0);
      const orderIds = validOrders.map((o) => Number(o.apiOrderId));
      
      let updatedResults: Record<string, any> = {};
      if (orderIds.length === 1) {
        const res = await checkOrderStatus(orderIds[0]);
        if (res && !res.error) updatedResults[String(orderIds[0])] = res;
      } else if (orderIds.length > 1) {
        const multiRes = await checkMultipleOrdersStatus(orderIds);
        if (multiRes && typeof multiRes === 'object') updatedResults = multiRes;
      }

      // Update in Firestore and local state
      const updatedList = ordersList.map((o) => {
        const apiInfo = updatedResults[String(o.apiOrderId)];
        if (!apiInfo || apiInfo.error) return o;

        const newStatus = apiInfo.status || o.status;
        const newStart = apiInfo.start_count !== undefined && apiInfo.start_count !== null ? apiInfo.start_count : o.startCount;
        const newRemains = apiInfo.remains !== undefined && apiInfo.remains !== null ? apiInfo.remains : o.remains;

        if (o.id) {
          setDoc(doc(db, 'orders', o.id), {
            status: newStatus,
            startCount: newStart,
            remains: newRemains,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(e => console.warn('Order sync doc note:', e));
        }

        return {
          ...o,
          status: newStatus,
          startCount: newStart,
          remains: newRemains,
        };
      });

      setOrdersList(updatedList);
      setFeedback(`API üzerinden ${orderIds.length} siparişin durumu, başlangıç ve kalan adetleri güncellendi.`);
    } catch (err: any) {
      console.error('Admin order sync error:', err);
      setFeedback(err.message || 'Sipariş durumları senkronize edilirken bir hata oluştu.');
    } finally {
      setSyncingAdminOrders(false);
    }
  };

  // Execute approval or rejection without window.confirm or alert
  const executeDepositAction = async () => {
    if (!confirmDepositModal) return;
    const { deposit, action } = confirmDepositModal;

    const senderDisplay = deposit.senderFullName 
      ? `${deposit.senderFullName} (@${deposit.senderUsername || '-'})`
      : deposit.userEmail;

    setActionDepositLoadingId(deposit.id);
    setDepositModalError(null);

    const bonusAmount = deposit.bonusAmount ?? +(deposit.amount * 0.05).toFixed(2);
    const finalCredit = deposit.totalCredit ?? +(deposit.amount + bonusAmount).toFixed(2);

    // Optimistic UI updates
    if (action === 'approve') {
      setDepositsList((prev) => 
        prev.map((d) => d.id === deposit.id ? { ...d, status: 'completed' as const, bonusAmount, totalCredit: finalCredit } : d)
      );
      setUsersList((prev) => 
        prev.map((u) => (u.uid === deposit.userId || u.email.toLowerCase() === deposit.userEmail.toLowerCase())
          ? { ...u, balance: (u.balance || 0) + finalCredit }
          : u
        )
      );
    } else {
      setDepositsList((prev) => 
        prev.map((d) => d.id === deposit.id ? { ...d, status: 'rejected' as const } : d)
      );
    }

    try {
      if (action === 'approve') {
        await adminApproveDeposit(deposit.id, deposit.userId, deposit.amount, finalCredit);
        setFeedback(`${senderDisplay} kullanıcısına ait ${formatTRY(deposit.amount)} yükleme onaylandı. +%5 Hediye Bonus ile toplam ${formatTRY(finalCredit)} bakiye hesaba eklendi!`);
      } else {
        await adminRejectDeposit(deposit.id);
        setFeedback(`${senderDisplay} kullanıcısının bakiye yükleme talebi reddedildi.`);
      }
      setConfirmDepositModal(null);
      await fetchAdminData();
    } catch (err: any) {
      setDepositModalError(err.message || 'İşlem gerçekleştirilemedi.');
      // Revert on error
      await fetchAdminData();
    } finally {
      setActionDepositLoadingId(null);
    }
  };

  // Bank Account Actions
  const openAddBankModal = () => {
    setEditingBank(null);
    setBankFormData({
      bankName: '',
      accountHolder: 'DOĞAN BAŞBOĞA',
      iban: '',
      branchName: '',
      accountNumber: '',
      description: 'Havale ve FAST ile 7/24 anında bakiye yükleyebilirsiniz.',
      isActive: true,
    });
    setBankError(null);
    setBankModalOpen(true);
  };

  const openEditBankModal = (bank: BankAccount) => {
    setEditingBank(bank);
    setBankFormData({
      bankName: bank.bankName,
      accountHolder: bank.accountHolder,
      iban: bank.iban,
      branchName: bank.branchName || '',
      accountNumber: bank.accountNumber || '',
      description: bank.description || '',
      isActive: bank.isActive ?? true,
    });
    setBankError(null);
    setBankModalOpen(true);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormData.bankName.trim()) {
      setBankError('Lütfen banka adını giriniz.');
      return;
    }
    if (!bankFormData.accountHolder.trim()) {
      setBankError('Lütfen alıcı / hesap sahibi adını giriniz.');
      return;
    }
    if (!bankFormData.iban.trim()) {
      setBankError('Lütfen IBAN numarasını giriniz.');
      return;
    }

    setBankSaving(true);
    setBankError(null);
    try {
      await saveBankAccount({
        id: editingBank ? editingBank.id : undefined,
        bankName: bankFormData.bankName,
        accountHolder: bankFormData.accountHolder,
        iban: bankFormData.iban,
        branchName: bankFormData.branchName,
        accountNumber: bankFormData.accountNumber,
        description: bankFormData.description,
        isActive: bankFormData.isActive,
      });

      setFeedback(editingBank ? 'Banka hesabı bilgileri başarıyla güncellendi.' : 'Yeni banka hesabı başarıyla eklendi.');
      setBankModalOpen(false);
      const banks = await getBankAccounts(false);
      setBankAccountsList(banks);
    } catch (err: any) {
      setBankError('Kaydedilirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setBankSaving(false);
    }
  };

  const handleDeleteBank = async (bankId: string, bankName: string) => {
    try {
      await deleteBankAccount(bankId);
      setFeedback(`${bankName} hesabı silindi.`);
      setBankAccountsList((prev) => prev.filter((b) => b.id !== bankId));
    } catch (err: any) {
      setFeedback('Hesap silinemedi: ' + err.message);
    }
  };

  const handleToggleBank = async (bankId: string, currentActive: boolean) => {
    try {
      const nextState = !currentActive;
      await toggleBankAccountStatus(bankId, nextState);
      setBankAccountsList((prev) =>
        prev.map((b) => (b.id === bankId ? { ...b, isActive: nextState } : b))
      );
      setFeedback(`Hesap durumu ${nextState ? 'Aktif' : 'Pasif'} olarak güncellendi.`);
    } catch (err: any) {
      setFeedback('Durum değiştirilemedi: ' + err.message);
    }
  };

  const copyBankIbanToClipboard = (iban: string, id: string) => {
    navigator.clipboard.writeText(iban.replace(/\s/g, ''));
    setCopiedBankIban(id);
    setTimeout(() => setCopiedBankIban(null), 2000);
  };

  // Campaign Actions
  const openAddCampaignModal = () => {
    setEditingCampaign(null);
    setCampaignFormData({
      title: '',
      subtitle: '',
      description: '',
      badge: '+%5 BONUS',
      discountPercent: 0,
      bonusPercent: 5,
      code: '',
      category: 'deposit',
      targetTab: 'deposit',
      buttonText: 'Hemen Bakiye Yükle',
      gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
      iconType: 'gift',
      terms: 'Tüm havale, EFT ve FAST yüklemelerinde geçerlidir.\nYükleme onaylandığında ekstra %5 anında bakiyeye eklenir.',
      isActive: true,
      order: (campaignsList.length + 1),
    });
    setCampaignError(null);
    setCampaignModalOpen(true);
  };

  const openEditCampaignModal = (camp: Campaign) => {
    setEditingCampaign(camp);
    setCampaignFormData({
      title: camp.title,
      subtitle: camp.subtitle || '',
      description: camp.description || '',
      badge: camp.badge || '',
      discountPercent: camp.discountPercent || 0,
      bonusPercent: camp.bonusPercent || 0,
      code: camp.code || '',
      category: camp.category || 'deposit',
      targetTab: camp.targetTab || 'deposit',
      buttonText: camp.buttonText || 'Fırsatı Yakala',
      gradient: camp.gradient || 'from-emerald-600 via-teal-600 to-cyan-700',
      iconType: camp.iconType || 'gift',
      terms: (camp.terms || []).join('\n'),
      isActive: camp.isActive !== false,
      order: camp.order || 1,
    });
    setCampaignError(null);
    setCampaignModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignFormData.title.trim()) {
      setCampaignError('Lütfen bir kampanya başlığı giriniz.');
      return;
    }

    setCampaignSaving(true);
    setCampaignError(null);

    try {
      const termsList = campaignFormData.terms
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      await saveCampaign(
        {
          title: campaignFormData.title.trim(),
          subtitle: campaignFormData.subtitle.trim(),
          description: campaignFormData.description.trim(),
          badge: campaignFormData.badge.trim(),
          discountPercent: Number(campaignFormData.discountPercent) || 0,
          bonusPercent: Number(campaignFormData.bonusPercent) || 0,
          code: campaignFormData.code.trim().toUpperCase(),
          category: campaignFormData.category,
          targetTab: campaignFormData.targetTab,
          buttonText: campaignFormData.buttonText.trim(),
          gradient: campaignFormData.gradient,
          iconType: campaignFormData.iconType,
          terms: termsList,
          isActive: campaignFormData.isActive,
          order: Number(campaignFormData.order) || 1,
        },
        editingCampaign ? editingCampaign.id : undefined
      );

      setFeedback(editingCampaign ? 'Kampanya başarıyla güncellendi.' : 'Yeni kampanya başarıyla eklendi.');
      setCampaignModalOpen(false);
      const camps = await getCampaigns(false);
      setCampaignsList(camps);
    } catch (err: any) {
      setCampaignError('Kaydedilirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleDeleteCampaign = async (campaignId: string, title: string) => {
    try {
      await deleteCampaign(campaignId);
      setFeedback(`"${title}" kampanyası silindi.`);
      setCampaignsList((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (err: any) {
      setFeedback('Kampanya silinemedi: ' + err.message);
    }
  };

  const handleToggleCampaign = async (campaignId: string, currentActive: boolean) => {
    try {
      const nextState = !currentActive;
      await toggleCampaignStatus(campaignId, nextState);
      setCampaignsList((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, isActive: nextState } : c))
      );
      setFeedback(`Kampanya durumu ${nextState ? 'Aktif' : 'Pasif'} olarak güncellendi.`);
    } catch (err: any) {
      setFeedback('Durum değiştirilemedi: ' + err.message);
    }
  };

  const handleResetDefaultCampaigns = async () => {
    try {
      setLoading(true);
      await seedDefaultCampaigns();
      const camps = await getCampaigns(false);
      setCampaignsList(camps);
      setFeedback('Varsayılan 360 Medya kampanyaları (+%5 Bakiye Bonusu, %10 İndirim vb.) başarıyla yüklendi.');
    } catch (err: any) {
      setFeedback('Kampanyalar yüklenirken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const totalUserBalance = usersList.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalRevenue = depositsList.filter(d => d.status === 'completed').reduce((acc, d) => acc + (d.amount || 0), 0);
  const totalOrdersPlaced = ordersList.length;
  const pendingDepositsCount = depositsList.filter((d) => d.status === 'pending').length;

  const filteredUsers = usersList.filter((u) => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.uid.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = ordersList.filter((o) => 
    o.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(o.apiOrderId).includes(searchQuery) ||
    o.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.link.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDeposits = depositsList.filter((d) =>
    d.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBanks = bankAccountsList.filter((b) =>
    b.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.accountHolder.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.iban.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCampaigns = campaignsList.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.subtitle && c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.badge && c.badge.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6">
      {/* Admin Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-semibold mb-2">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Yönetici Paneli (Admin)</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-900 font-mono font-black">@DOĞAN BAŞBOĞA</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Sistem Yönetimi & Kullanıcı Bakiyeleri
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Tüm kayıtlı kullanıcıları, Firestore bakiyelerini, bakiye yüklemelerini ve siparişleri tek panelden yönetin.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Verileri Yenile</span>
        </button>
      </div>

      {feedback && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Kayıtlı Kullanıcı</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{usersList.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Firestore üzerinde kayıtlı üye</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Toplam Kullanıcı Bakiyesi</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{formatTRY(totalUserBalance)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Üye cüzdanlarındaki toplam bakiye</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Toplam Ödeme / Ciro</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{formatTRY(totalRevenue)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Banka Havalesi & FAST bakiye yüklemeleri</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Toplam API Siparişi</span>
            <ShoppingBag className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalOrdersPlaced}</div>
          <p className="text-[11px] text-slate-500 mt-1">Firestore ve TurkPaneli siparişleri</p>
        </div>
      </div>

      {/* Pending Deposits Alert Banner */}
      {pendingDepositsCount > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">
                {pendingDepositsCount} Adet Onay Bekleyen Bakiye Yüklemesi Var!
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Müşterilerinizin havale veya kart ile yaptığı ödeme bildirimlerini aşağıdan onaylayabilir veya reddedebilirsiniz.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('deposits')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-sm whitespace-nowrap"
          >
            Yüklemeleri İncele ({pendingDepositsCount})
          </button>
        </div>
      )}

      {/* Main Table Tabs & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kullanıcılar & Bakiyeler ({usersList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Tüm Siparişler ({ordersList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('deposits')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'deposits'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Bakiye Yüklemeleri ({depositsList.length})</span>
              {pendingDepositsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px] animate-pulse">
                  {pendingDepositsCount} ONAY BEKLİYOR
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('banks')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'banks'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Banka & IBAN Ayarları ({bankAccountsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'campaigns'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Kampanyalar & Fırsatlar ({campaignsList.length})</span>
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Email, ID veya servis ara..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tab 1: Users & Balances */}
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Kullanıcı</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Firestore Bakiyesi</th>
                  <th className="py-3 px-4">Toplam Harcama</th>
                  <th className="py-3 px-4">Sipariş Sayısı</th>
                  <th className="py-3 px-4">Kayıt Tarihi</th>
                  <th className="py-3 px-4 text-right">Bakiye İşlemi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.displayName || 'İsimsiz'}</div>
                        <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          u.role === 'admin' 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role === 'admin' ? 'YÖNETİCİ' : 'MÜŞTERİ'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-black text-emerald-600 text-sm">
                          {formatTRY(u.balance || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {formatTRY(u.totalSpent || 0)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {u.totalOrders || 0}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('tr-TR') : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs transition border border-blue-200"
                        >
                          Bakiye Düzenle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Orders */}
        {activeTab === 'orders' && (
          <div>
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-600 font-medium">
                Kullanıcıların verdiği toplam <strong className="text-slate-900">{filteredOrders.length}</strong> sipariş listeleniyor.
              </div>
              <button
                onClick={syncAdminOrdersWithApi}
                disabled={syncingAdminOrders || filteredOrders.length === 0}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1.5 transition shadow-sm text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAdminOrders ? 'animate-spin text-white' : ''}`} />
                <span>{syncingAdminOrders ? 'API Durumları Eşitleniyor...' : 'API\'den Durumları Eşitle (Başlangıç, Kalan)'}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">TurkPaneli Sipariş ID</th>
                    <th className="py-3 px-4">Müşteri</th>
                    <th className="py-3 px-4">Servis & Link</th>
                    <th className="py-3 px-4">Miktar</th>
                    <th className="py-3 px-4">Tahsil Edilen (₺)</th>
                    <th className="py-3 px-4">Başlangıç / Kalan</th>
                    <th className="py-3 px-4">Durum</th>
                    <th className="py-3 px-4">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Henüz sipariş kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600">
                          #{o.apiOrderId}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {o.userEmail}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">
                          <div className="font-bold text-slate-900 truncate">{o.serviceName}</div>
                          <a 
                            href={o.link} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-blue-500 hover:underline flex items-center gap-1 text-[11px] truncate"
                          >
                            <span className="truncate">{o.link}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800">
                          {Number(o.quantity).toLocaleString('tr-TR')}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600">
                          {formatTRY(o.charge)}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px] font-mono whitespace-nowrap">
                          <div>Başlangıç: <strong className="text-slate-800">{o.startCount ?? '-'}</strong></div>
                          <div>Kalan: <strong className="text-slate-800">{o.remains ?? '-'}</strong></div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                            o.status?.toLowerCase().includes('completed') || o.status?.toLowerCase().includes('tamam')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : o.status?.toLowerCase().includes('cancel') || o.status?.toLowerCase().includes('iptal')
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {o.status || 'İşleniyor'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(o.createdAt).toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Deposits */}
        {activeTab === 'deposits' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">İşlem ID</th>
                  <th className="py-3 px-4">Müşteri</th>
                  <th className="py-3 px-4">Havale Gönderen & Kullanıcı Adı</th>
                  <th className="py-3 px-4">Yüklenen Tutar</th>
                  <th className="py-3 px-4">Ödeme Yöntemi</th>
                  <th className="py-3 px-4">Durum</th>
                  <th className="py-3 px-4">Tarih</th>
                  <th className="py-3 px-4 text-right">Yönetici Onayı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeposits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Henüz bakiye yükleme işlemi yok.
                    </td>
                  </tr>
                ) : (
                  filteredDeposits.map((d) => {
                    const isActing = actionDepositLoadingId === d.id;
                    return (
                      <tr 
                        key={d.id} 
                        className={`transition ${d.status === 'pending' ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50/70'}`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {d.transactionId || d.id}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {d.userEmail}
                        </td>
                        <td className="py-3 px-4">
                          {d.senderFullName || d.senderUsername || d.customerNote || d.description ? (
                            <div className="space-y-1">
                              {d.senderFullName && (
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>{d.senderFullName}</span>
                                </div>
                              )}
                              {d.senderUsername && (
                                <div className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200/80">
                                  <span>@{d.senderUsername}</span>
                                </div>
                              )}
                              {(d.customerNote || d.description) && (
                                <div className="text-[11px] text-slate-600 bg-slate-100 p-1.5 rounded border border-slate-200 mt-1 whitespace-pre-wrap font-sans max-w-xs">
                                  <span className="font-semibold text-slate-800">Açıklama:</span> {d.customerNote || d.description}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Otomatik / Kart</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-black text-emerald-600 text-sm">
                          +{formatTRY(d.amount)}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {d.paymentMethod}
                        </td>
                        <td className="py-3 px-4">
                          {d.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-black text-[10px] bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-700" />
                              ONAY BEKLİYOR
                            </span>
                          ) : d.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              ONAYLANDI
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              REDDEDİLDİ
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(d.createdAt).toLocaleString('tr-TR')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {d.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveDeposit(d)}
                                disabled={isActing}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition shadow-sm"
                                title="Onayla ve Kullanıcıya Bakiye Yükle"
                              >
                                {isActing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Onayla</span>
                              </button>
                              <button
                                onClick={() => handleRejectDeposit(d)}
                                disabled={isActing}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition shadow-sm"
                                title="Talebi Reddet"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reddet</span>
                              </button>
                            </div>
                          ) : d.status === 'completed' ? (
                            <span className="text-emerald-700 font-semibold text-[11px]">
                              Bakiye Yüklendi
                            </span>
                          ) : (
                            <span className="text-rose-600 font-medium text-[11px]">
                              Reddedildi
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Bank Accounts & IBAN Management */}
        {activeTab === 'banks' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>Banka & IBAN Bilgileri Yönetimi</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Müşterilerin bakiye yükleme ekranında göreceği banka hesaplarını buradan ekleyebilir, IBAN veya alıcı bilgilerini değiştirebilirsiniz.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddBankModal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition shadow-sm whitespace-nowrap self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Banka Hesabı Ekle</span>
              </button>
            </div>

            {filteredBanks.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">Kayıtlı banka hesabı bulunamadı</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Kullanıcıların Havale/FAST yapabilmesi için lütfen en az bir banka hesabı ekleyin.
                </p>
                <button
                  type="button"
                  onClick={openAddBankModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Banka Hesabı Ekle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredBanks.map((bank) => (
                  <div
                    key={bank.id}
                    className={`rounded-2xl border p-5 transition flex flex-col justify-between ${
                      bank.isActive
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200 opacity-75'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            bank.isActive 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{bank.bankName}</h4>
                            <p className="text-[11px] text-slate-500 font-semibold">{bank.accountHolder}</p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          bank.isActive
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {bank.isActive ? 'Aktif (Kullanımda)' : 'Pasif'}
                        </span>
                      </div>

                      {/* IBAN Box */}
                      <div className="bg-slate-900 text-amber-300 p-3.5 rounded-xl font-mono text-xs mb-3 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-sans">IBAN Numarası:</span>
                          <span className="text-emerald-400 font-bold tracking-wider text-xs sm:text-[13px]">{bank.iban}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyBankIbanToClipboard(bank.iban, bank.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[11px] font-sans font-semibold flex items-center gap-1.5 transition border border-slate-700"
                        >
                          {copiedBankIban === bank.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                          <span>{copiedBankIban === bank.id ? 'Kopyalandı' : 'Kopyala'}</span>
                        </button>
                      </div>

                      {/* Branch & Notes */}
                      {(bank.branchName || bank.accountNumber) && (
                        <div className="text-[11px] text-slate-600 mb-2">
                          <span className="font-semibold text-slate-700">Şube / Hesap No:</span>{' '}
                          {bank.branchName || '-'} {bank.accountNumber ? `(${bank.accountNumber})` : ''}
                        </div>
                      )}

                      {bank.description && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 mb-4">
                          <span className="font-semibold text-slate-700">Müşteri Notu:</span> {bank.description}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                      <button
                        type="button"
                        onClick={() => handleToggleBank(bank.id, bank.isActive)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                          bank.isActive
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {bank.isActive ? 'Pasife Al' : 'Aktif Yap'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditBankModal(bank)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Bilgileri Düzenle</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteBank(bank.id, bank.bankName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Hesabı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Campaigns Management */}
        {activeTab === 'campaigns' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Gift className="w-5 h-5 text-rose-600" />
                  <span>Kampanya & Fırsat Yönetimi</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Müşterilerin göreceği bakiye bonusu (%5), sipariş indirimleri ve özel promosyonları buradan ekleyebilir, düzenleyebilir veya aktif/pasif yapabilirsiniz.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleResetDefaultCampaigns}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                  title="Varsayılan 360 Medya Kampanyalarını Yükle"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Varsayılanları Geri Yükle</span>
                </button>
                <button
                  type="button"
                  onClick={openAddCampaignModal}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Kampanya Ekle</span>
                </button>
              </div>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">Aktif kampanya bulunamadı</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Kullanıcılara indirim veya %5 ekstra bakiye fırsatı sunmak için yeni kampanya oluşturabilir veya varsayılanları yükleyebilirsiniz.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaultCampaigns}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
                  >
                    Varsayılan Kampanyaları Yükle
                  </button>
                  <button
                    type="button"
                    onClick={openAddCampaignModal}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition"
                  >
                    Yeni Kampanya Ekle
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className={`rounded-2xl border p-5 transition flex flex-col justify-between ${
                      camp.isActive
                        ? 'bg-white border-slate-200 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200 opacity-70'
                    }`}
                  >
                    <div>
                      {/* Visual Header */}
                      <div className={`p-4 rounded-xl text-white bg-gradient-to-r ${camp.gradient || 'from-indigo-600 to-rose-600'} mb-4 shadow-sm relative overflow-hidden`}>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white border border-white/20">
                            {camp.badge || 'FIRSAT'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            camp.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-800/80 text-slate-300'
                          }`}>
                            {camp.isActive ? 'AKTİF' : 'PASİF'}
                          </span>
                        </div>
                        <h4 className="font-black text-base leading-snug">{camp.title}</h4>
                        {camp.subtitle && (
                          <p className="text-xs text-white/90 font-medium mt-0.5">{camp.subtitle}</p>
                        )}
                      </div>

                      {/* Campaign Key Details */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                          <div className="text-[10px] text-slate-500 font-semibold">Bakiye Bonusu</div>
                          <div className="text-sm font-black text-emerald-600">
                            {camp.bonusPercent ? `+ %${camp.bonusPercent}` : '-'}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                          <div className="text-[10px] text-slate-500 font-semibold">İndirim Oranı</div>
                          <div className="text-sm font-black text-rose-600">
                            {camp.discountPercent ? `%${camp.discountPercent}` : '-'}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                          <div className="text-[10px] text-slate-500 font-semibold">Kupon Kodu</div>
                          <div className="text-xs font-mono font-bold text-indigo-600 truncate">
                            {camp.code || 'Gerekmiyor'}
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                          <div className="text-[10px] text-slate-500 font-semibold">Yönlendirme</div>
                          <div className="text-xs font-bold text-slate-700 capitalize">
                            {camp.targetTab === 'deposit' ? 'Bakiye Yükle' : camp.targetTab === 'order' ? 'Sipariş' : 'Servisler'}
                          </div>
                        </div>
                      </div>

                      {camp.description && (
                        <p className="text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {camp.description}
                        </p>
                      )}

                      {camp.terms && camp.terms.length > 0 && (
                        <div className="text-[11px] text-slate-500 space-y-1 mb-2">
                          <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">Kampanya Koşulları:</span>
                          <ul className="list-disc list-inside space-y-0.5">
                            {camp.terms.map((term, i) => (
                              <li key={i}>{term}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCampaign(camp.id, camp.isActive)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                          camp.isActive
                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {camp.isActive ? 'Pasife Al' : 'Aktif Yap'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditCampaignModal(camp)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Düzenle</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCampaign(camp.id, camp.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Kampanyayı Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Balance Adjustment Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Kullanıcı Bakiyesini Düzenle
            </h3>
            <p className="text-xs text-slate-600 mb-4 font-mono">
              {selectedUser.email} (Mevcut: {formatTRY(selectedUser.balance || 0)})
            </p>

            <form onSubmit={handleSaveBalanceAdjustment} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    adjustType === 'add'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bakiye Ekle (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('subtract')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    adjustType === 'subtract'
                      ? 'bg-rose-600 text-white border-rose-500'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Bakiye Düş (-)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tutar (₺)</label>
                <div className="flex gap-1.5 mb-2">
                  {[50, 100, 250, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustAmount(preset.toString())}
                      className={`flex-1 py-1 text-[11px] font-bold rounded-lg border transition ${
                        adjustAmount === preset.toString()
                          ? 'bg-blue-50 border-blue-400 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset}₺
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Veya özel tutar girin..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  {adjustLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Onayla & Kaydet</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Deposit Action Modal (Approve / Reject) */}
      {confirmDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmDepositModal.action === 'approve' 
                  ? 'bg-emerald-100 text-emerald-600' 
                  : 'bg-rose-100 text-rose-600'
              }`}>
                {confirmDepositModal.action === 'approve' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {confirmDepositModal.action === 'approve' 
                    ? 'Bakiye Yüklemesini Onayla' 
                    : 'Bakiye Yüklemesini Reddet'}
                </h3>
                <p className="text-xs text-slate-500">
                  İşlem ID: <span className="font-mono font-bold text-slate-700">{confirmDepositModal.deposit.transactionId || confirmDepositModal.deposit.id}</span>
                </p>
              </div>
            </div>

            {depositModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{depositModalError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs mb-5">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Gönderilen Tutar:</span>
                <span className="font-bold text-sm text-slate-800">
                  {formatTRY(confirmDepositModal.deposit.amount)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 bg-emerald-50/80 -mx-2 px-2 rounded-md">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hediye Kampanya Bonusu (%5):</span>
                </span>
                <span className="font-black text-emerald-600">
                  +{formatTRY(confirmDepositModal.deposit.bonusAmount ?? +(confirmDepositModal.deposit.amount * 0.05).toFixed(2))}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                <span className="text-slate-900 font-bold">Hesaba Yüklenecek Toplam:</span>
                <span className="font-black text-base text-emerald-600">
                  {formatTRY(confirmDepositModal.deposit.totalCredit ?? +(confirmDepositModal.deposit.amount * 1.05).toFixed(2))}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Müşteri Hesabı:</span>
                <span className="font-semibold text-slate-900">{confirmDepositModal.deposit.userEmail}</span>
              </div>
              {confirmDepositModal.deposit.senderFullName && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Havale Gönderen:</span>
                  <span className="font-bold text-slate-900">{confirmDepositModal.deposit.senderFullName}</span>
                </div>
              )}
              {confirmDepositModal.deposit.senderUsername && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Kullanıcı Adı:</span>
                  <span className="font-mono font-bold text-blue-600">@{confirmDepositModal.deposit.senderUsername}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Ödeme Yöntemi:</span>
                <span className="font-medium text-slate-700">{confirmDepositModal.deposit.paymentMethod}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              {confirmDepositModal.action === 'approve' 
                ? `Bu işlemi onayladığınızda +%5 hediye bonusuyla birlikte toplam ${formatTRY(confirmDepositModal.deposit.totalCredit ?? +(confirmDepositModal.deposit.amount * 1.05).toFixed(2))} kullanıcının bakiyesine anında eklenecektir. Devam etmek istiyor musunuz?`
                : 'Bu talebi reddettiğinizde bakiye yüklenmeyecek ve talep "Reddedildi" olarak işaretlenecektir.'}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDepositModal(null)}
                disabled={Boolean(actionDepositLoadingId)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={executeDepositAction}
                disabled={Boolean(actionDepositLoadingId)}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm ${
                  confirmDepositModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionDepositLoadingId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : confirmDepositModal.action === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Evet, Bakiyeyi Onayla</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Evet, Talebi Reddet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Bank Account Modal */}
      {bankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingBank ? 'Banka & IBAN Bilgilerini Güncelle' : 'Yeni Banka Hesabı Ekle'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Havale ve FAST için müşterilere sunulacak hesap bilgileri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {bankError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{bankError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBank} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Banka Adı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Ziraat Bankası, Enpara, Garanti"
                    value={bankFormData.bankName}
                    onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alıcı / Hesap Sahibi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: DOĞAN BAŞBOĞA"
                    value={bankFormData.accountHolder}
                    onChange={(e) => setBankFormData({ ...bankFormData, accountHolder: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  IBAN Numarası <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                  value={bankFormData.iban}
                  onChange={(e) => setBankFormData({ ...bankFormData, iban: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  TR ile başlamalıdır. Boşluklu veya bitişik yazabilirsiniz.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Şube Adı (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Kızılay Şubesi"
                    value={bankFormData.branchName}
                    onChange={(e) => setBankFormData({ ...bankFormData, branchName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hesap Numarası (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 12345678-5001"
                    value={bankFormData.accountNumber}
                    onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Müşteri Bilgilendirme Notu (Opsiyonel)
                </label>
                <textarea
                  rows={2}
                  placeholder="Örn: FAST ile 7/24 20.000 TL'ye kadar anında geçer."
                  value={bankFormData.description}
                  onChange={(e) => setBankFormData({ ...bankFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bankIsActive"
                  checked={bankFormData.isActive}
                  onChange={(e) => setBankFormData({ ...bankFormData, isActive: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="bankIsActive" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Bu banka hesabı aktif olarak müşterilere gösterilsin
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setBankModalOpen(false)}
                  disabled={bankSaving}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={bankSaving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {bankSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingBank ? 'Değişiklikleri Kaydet' : 'Hesabı Ekle'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Campaign Modal */}
      {campaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingCampaign ? 'Kampanyayı Düzenle' : 'Yeni Kampanya Oluştur'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    360 Medya'da müşterilere sunulacak kampanya ve bonus ayarları
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCampaignModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {campaignError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{campaignError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCampaign} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kampanya Başlığı <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Bakiye Yüklemelerine Anında %5 Ekstra Bakiye!"
                    value={campaignFormData.title}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alt Başlık / Slogan
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Havale, EFT & FAST Yüklemelerinde Geçerli"
                    value={campaignFormData.subtitle}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rozet / Badge Metni
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: +%5 BONUS veya %10 İNDİRİM"
                    value={campaignFormData.badge}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, badge: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-rose-600 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bakiye Bonusu (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="5"
                    value={campaignFormData.bonusPercent}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, bonusPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-emerald-600 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Örn: 5 (%5 ekstra bakiye)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sipariş İndirimi (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="10"
                    value={campaignFormData.discountPercent}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, discountPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-rose-600 focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Örn: 10 (%10 sipariş indirimi)</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Promosyon Kodu
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: 360BONUS5"
                    value={campaignFormData.code}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-indigo-600 uppercase focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Boş bırakılabilir</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hedef Yönlendirme
                  </label>
                  <select
                    value={campaignFormData.targetTab}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, targetTab: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="deposit">Bakiye Yükleme Ekranı (Cüzdan)</option>
                    <option value="order">Yeni Sipariş Formu</option>
                    <option value="services">Servis & Fiyat Listesi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buton Metni
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Hemen Bakiye Yükle (+%5 Bonus)"
                    value={campaignFormData.buttonText}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, buttonText: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kart Renk Teması (Gradyan)
                </label>
                <select
                  value={campaignFormData.gradient}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, gradient: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white focus:outline-none focus:border-rose-500"
                >
                  <option value="from-emerald-600 via-teal-600 to-cyan-700">Zümrüt Yeşili (Bakiye / Finans)</option>
                  <option value="from-indigo-600 via-purple-600 to-rose-600">360 Medya Mor / Gül (Premium)</option>
                  <option value="from-blue-600 via-indigo-600 to-sky-700">Kraliyet Mavisi (Sosyal Medya)</option>
                  <option value="from-amber-500 via-orange-600 to-rose-600">Altın Kehribar (Özel Fırsat)</option>
                  <option value="from-rose-600 via-red-600 to-orange-600">Ateş Kırmızısı (Mega İndirim)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kampanya Açıklaması
                </label>
                <textarea
                  rows={2}
                  placeholder="Kampanyanın detayları ve kullanıcıya sunduğu faydalar..."
                  value={campaignFormData.description}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kampanya Koşulları (Her satıra bir kural yazınız)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tüm havale, EFT ve FAST yüklemelerinde geçerlidir.&#10;Yükleme onaylandığında ekstra %5 anında bakiyeye eklenir.&#10;Herhangi bir üst limit yoktur."
                  value={campaignFormData.terms}
                  onChange={(e) => setCampaignFormData({ ...campaignFormData, terms: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-rose-500 resize-none font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="campaignIsActive"
                    checked={campaignFormData.isActive}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="campaignIsActive" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    Bu kampanya sitede aktif olarak gösterilsin
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Sıralama:</label>
                  <input
                    type="number"
                    min="1"
                    value={campaignFormData.order}
                    onChange={(e) => setCampaignFormData({ ...campaignFormData, order: Number(e.target.value) })}
                    className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCampaignModalOpen(false)}
                  disabled={campaignSaving}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={campaignSaving}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {campaignSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingCampaign ? 'Değişiklikleri Kaydet' : 'Kampanyayı Yayınla'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
