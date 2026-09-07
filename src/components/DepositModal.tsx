import React, { useState, useEffect } from 'react';
import { 
  X, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Wallet, 
  ArrowRight, 
  UserCheck,
  Clock, 
  Copy, 
  Check,
  Sparkles,
  ShieldCheck,
  Info,
  Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createDepositRequest, getBankAccounts, DEFAULT_INITIAL_BANK_ACCOUNT } from '../lib/firebase';
import { formatTRY } from '../utils/api';
import { BankAccount } from '../types';

const PRESET_AMOUNTS = [50, 100, 250, 500, 1000];

export function DepositModal() {
  const { user, userProfile, isDepositModalOpen, closeDepositModal, openAuthModal } = useAuth();

  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>('100');

  // Havale / FAST Bilgileri
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  // Dinamik Admin Banka Hesapları
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([DEFAULT_INITIAL_BANK_ACCOUNT]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(DEFAULT_INITIAL_BANK_ACCOUNT.id);
  const [loadingBanks, setLoadingBanks] = useState(false);

  const [loading, setLoading] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Banka hesaplarını Firestore'dan yükle
  useEffect(() => {
    if (!isDepositModalOpen) return;
    let isMounted = true;
    setLoadingBanks(true);
    getBankAccounts(true)
      .then((accounts) => {
        if (!isMounted) return;
        if (accounts && accounts.length > 0) {
          setBankAccounts(accounts);
          setSelectedAccountId(accounts[0].id);
        }
      })
      .catch((err) => console.error('Banka hesapları yüklenemedi:', err))
      .finally(() => {
        if (isMounted) setLoadingBanks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isDepositModalOpen]);

  // Seçili banka hesabı
  const activeBank = bankAccounts.find((b) => b.id === selectedAccountId) || bankAccounts[0] || DEFAULT_INITIAL_BANK_ACCOUNT;

  // Initialize fields from user
  useEffect(() => {
    if (userProfile?.displayName) {
      setFullName(userProfile.displayName);
    } else if (user?.email) {
      const prefix = user.email.split('@')[0];
      const defaultName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      setFullName(defaultName);
    }
    if (user?.email) {
      const usernameCandidate = user.email.split('@')[0];
      setUsername(usernameCandidate);
    }
  }, [user, userProfile]);

  if (!isDepositModalOpen) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Bakiye Yüklemek İçin Giriş Yapın</h3>
          <p className="text-xs text-slate-400 mb-6">
            Bakiyeniz size özel hesabınızda güvenle saklanır. Devam etmek için lütfen giriş yapın veya kayıt olun.
          </p>
          <div className="flex gap-3">
            <button
              onClick={closeDepositModal}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              Vazgeç
            </button>
            <button
              onClick={() => { closeDepositModal(); openAuthModal('login'); }}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomAmount(String(val));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      setAmount(parsed);
    }
  };

  const copyIbanToClipboard = () => {
    if (!activeBank?.iban) return;
    navigator.clipboard.writeText(activeBank.iban.replace(/\s/g, ''));
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  // 5% Ekstra Bakiye Bonusu
  const bonusPercent = 5;
  const bonusAmount = +(amount * (bonusPercent / 100)).toFixed(2);
  const totalCreditAmount = +(amount + bonusAmount).toFixed(2);

  const transferReference = `TP-${username || user.email?.split('@')[0] || 'USER'}-${amount}`;
  const copyRefToClipboard = () => {
    navigator.clipboard.writeText(transferReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  // Banka Havalesi / FAST Bildirimi Kaydet
  const handleHavalePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (amount < 10) {
      setErrorMessage("Minimum bakiye yükleme tutarı 10 ₺'dir.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Lütfen Havale/EFT gönderen ad ve soyadınızı giriniz.');
      return;
    }

    if (!username.trim()) {
      setErrorMessage('Lütfen 360 Medya kullanıcı adınızı veya e-postanızı giriniz.');
      return;
    }

    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 600));
      const txId = `HV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      
      const fullNote = customerNote.trim() || `Banka Havalesi / FAST - ${activeBank.bankName} - ${fullName.trim()}`;

      await createDepositRequest(
        user.uid, 
        user.email || '', 
        amount, 
        `Banka Havalesi / FAST (${activeBank.bankName})`, 
        txId,
        {
          senderFullName: fullName.trim(),
          senderUsername: username.trim(),
          customerNote: fullNote,
          description: fullNote,
          bonusPercent: 5,
          bonusAmount,
          totalCredit: totalCreditAmount,
        }
      );

      setSuccessMessage(
        `${formatTRY(amount)} tutarındaki Havale/FAST bildiriminiz (${txId}) kaydedildi! +%5 Hediye Bonus ile hesabınıza toplam ${formatTRY(totalCreditAmount)} bakiye aktarılacaktır. Gönderen: ${fullName.trim()} (@${username.trim()}).`
      );

      setTimeout(() => {
        setSuccessMessage(null);
        closeDepositModal();
      }, 3500);
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMessage('Bildirim kaydedilirken sorun oluştu: ' + (err.message || 'Lütfen tekrar deneyin.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Banka Havalesi & FAST İle Bakiye Yükle</h2>
              <p className="text-xs text-slate-400">
                Mevcut Bakiyeniz:{' '}
                <span className="font-bold text-emerald-400">
                  {formatTRY(userProfile?.balance ?? 0)}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeDepositModal}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 animate-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold">İşlem Başarılı!</p>
                <p className="text-slate-300 mt-0.5">{successMessage}</p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 🎁 %5 Ekstra Hediye Bakiye Kampanya Kartı */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/20 border border-emerald-500/40 text-xs flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 font-black flex items-center justify-center text-xs shrink-0 shadow-md shadow-emerald-500/30">
                +%5
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-white">360 Medya Bakiye Bonusu:</span>
                  <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded uppercase">
                    +%5 HEDİYE
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Her yüklemede yatırdığınız tutarın %5'i kadar ilave bakiye hesabınıza hediye tanımlanır!
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 bg-slate-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-slate-300 uppercase block font-semibold">Net Bakiye</span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                {formatTRY(totalCreditAmount)}
              </span>
            </div>
          </div>

          {/* Admin Onay Bilgilendirme Kartı */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-[11px] text-slate-300">
              <span className="font-bold text-white">7/24 Hızlı Onay:</span> Bildiriminiz admin kontrolünden sonra ortalama 5 dakika içinde onaylanıp %5 bonusu ile birlikte hesabınıza yüklenir.
            </div>
          </div>

          {/* Tutar Seçimi */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-300">
                1. Yüklenecek Tutarı Belirleyin
              </label>
              <span className="text-[11px] text-slate-400">Min. 10 ₺</span>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {PRESET_AMOUNTS.map((val) => {
                const presetBonus = +(val * 0.05).toFixed(0);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleSelectPreset(val)}
                    className={`py-2 px-1 text-xs rounded-xl transition border text-center flex flex-col items-center justify-center ${
                      amount === val && customAmount === String(val)
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/30 font-bold'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span className="font-bold">{val} ₺</span>
                    <span className={`text-[10px] ${amount === val && customAmount === String(val) ? 'text-emerald-100' : 'text-emerald-400'}`}>
                      +{presetBonus}₺
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Input */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₺</span>
              <input
                type="number"
                min="10"
                step="1"
                value={customAmount}
                onChange={handleCustomChange}
                placeholder="Özel Tutar Giriniz"
                className="w-full pl-8 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Live Bonus Summary Card */}
            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                <span>Yatırılacak: <strong className="text-white font-mono">{formatTRY(amount)}</strong></span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">+%5 Bonus: <strong className="font-mono">+{formatTRY(bonusAmount)}</strong></span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-white font-mono">
                  Toplam: <span className="text-emerald-400 font-extrabold">{formatTRY(totalCreditAmount)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Banka Seçimi (Eğer birden fazla aktif banka hesabı varsa) */}
          {bankAccounts.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                2. Gönderim Yapılacak Banka Hesabı
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {bankAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                      selectedAccountId === acc.id
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{acc.bankName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{acc.accountHolder}</div>
                    </div>
                    {selectedAccountId === acc.id && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bank Account Info Card */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Banka Hesap Bilgileri (Havale / FAST / EFT)</span>
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                7/24 FAST Aktif
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900/95 font-mono text-[11px] text-amber-300 space-y-2.5 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Banka Adı:</span>
                <span className="font-bold text-white font-sans">{activeBank.bankName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Alıcı Adı:</span>
                <span className="font-bold text-emerald-400 font-sans">{activeBank.accountHolder}</span>
              </div>
              {activeBank.branchName && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-sans">Şube / Hesap:</span>
                  <span className="text-slate-300 font-sans">{activeBank.branchName} {activeBank.accountNumber ? `(${activeBank.accountNumber})` : ''}</span>
                </div>
              )}

              {/* IBAN Row */}
              <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">IBAN Numarası:</span>
                  <span className="text-emerald-400 font-bold tracking-wider text-xs sm:text-[13px]">{activeBank.iban}</span>
                </div>
                <button
                  type="button"
                  onClick={copyIbanToClipboard}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[11px] font-sans font-semibold flex items-center gap-1.5 transition border border-slate-700 active:scale-95"
                >
                  {copiedIban ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                  <span>{copiedIban ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>

              {/* Reference Row */}
              <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] block font-sans">Havale Açıklaması (Referans Kodu):</span>
                  <span className="text-blue-400 font-bold tracking-wider text-xs">{transferReference}</span>
                </div>
                <button
                  type="button"
                  onClick={copyRefToClipboard}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[11px] font-sans font-semibold flex items-center gap-1.5 transition border border-slate-700 active:scale-95"
                >
                  {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                  <span>{copiedRef ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>

              {activeBank.description && (
                <div className="text-[11px] text-slate-400 font-sans pt-1 border-t border-slate-800/80">
                  <span className="text-amber-400 font-semibold">Not:</span> {activeBank.description}
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleHavalePayment} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1 flex items-center gap-1 font-semibold">
                  <span>Gönderen Ad Soyad</span>
                  <span className="text-rose-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Hesap Sahibi Adı Soyadı"
                  required
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1 flex items-center gap-1 font-semibold">
                  <span>360 Medya Kullanıcı Adı</span>
                  <span className="text-rose-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınız"
                  required
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1 flex items-center justify-between font-semibold">
                <span>Havale Açıklaması / Müşteri Notu</span>
                <span className="text-[10px] text-slate-400 font-normal">Opsiyonel</span>
              </label>
              <textarea
                rows={2}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder={`Dekont açıklamasına "${transferReference}" yazınız. Varsa ek açıklamanızı buraya ekleyebilirsiniz...`}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={loading || Boolean(successMessage)}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Havale Bildirimi Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  <span>{formatTRY(amount)} Bildirimi Yap (+%5 Bonusla: {formatTRY(totalCreditAmount)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Havale ve FAST transferleri 7/24 operatörlerimizce kontrol edilip bakiyenize eklenir.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
