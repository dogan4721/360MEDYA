import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  LogIn, 
  UserPlus, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AuthModal() {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalTab, 
    setAuthModalTab, 
    loginWithEmail, 
    registerWithEmail, 
    loginWithGoogle 
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGoogleHint, setShowGoogleHint] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setShowGoogleHint(false);

    if (!email || !password) {
      setError('Lütfen e-posta ve şifrenizi giriniz.');
      return;
    }

    if (authModalTab === 'register') {
      if (password.length < 6) {
        setError('Şifre en az 6 karakter olmalıdır.');
        return;
      }
      if (password !== passwordConfirm) {
        setError('Şifreler birbiriyle uyuşmuyor.');
        return;
      }
    }

    setLoading(true);
    try {
      if (authModalTab === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, displayName);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'İşlem sırasında bir hata oluştu.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Firebase projenizde E-posta/Şifre ile giriş sağlayıcısı henüz aktif edilmemiş. Lütfen aşağıdaki "Google ile Giriş Yap" butonunu kullanınız (Hızlı, güvenli ve anında çalışır).';
        setShowGoogleHint(true);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'E-posta veya şifre hatalı. Lütfen kontrol ediniz.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Bu e-posta adresi ile zaten kayıtlı bir hesap bulunmaktadır.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Şifreniz çok zayıf. Lütfen en az 6 karakter giriniz.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Lütfen geçerli bir e-posta adresi yazınız.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setShowGoogleHint(false);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google ile giriş yapılırken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50">
          <button
            type="button"
            onClick={() => { setAuthModalTab('login'); setError(null); setShowGoogleHint(false); }}
            className={`flex-1 py-3.5 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${
              authModalTab === 'login'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Giriş Yap</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthModalTab('register'); setError(null); setShowGoogleHint(false); }}
            className={`flex-1 py-3.5 text-xs font-bold transition flex items-center justify-center gap-2 border-b-2 ${
              authModalTab === 'register'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Kayıt Ol</span>
          </button>
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          <div className="mb-5 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold mb-2">
              <Wallet className="w-3.5 h-3.5 text-blue-400" />
              <span>Bireysel Üyelik & Bakiye Portalı</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              {authModalTab === 'login' ? '360 Medya Hesabınıza Giriş Yapın' : 'Yeni Müşteri Hesabı Oluşturun'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {authModalTab === 'login' 
                ? 'Kendi bakiyenizi görüntüleyin, bakiye yükleyin ve sipariş verin.' 
                : 'Kayıt olunca kişisel cüzdan hesabınız otomatik oluşturulur.'}
            </p>
          </div>

          {/* Google Sign-In */}
          <div className="mb-5">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-3 shadow-lg shadow-white/5 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>Google ile bağlanılıyor...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google ile Giriş Yap</span>
                </>
              )}
            </button>

            <div className="flex items-center my-4">
              <div className="flex-1 border-t border-slate-800"></div>
              <span className="px-3 text-[10px] text-slate-500 font-medium uppercase tracking-wider">veya e-posta / şifre ile</span>
              <div className="flex-1 border-t border-slate-800"></div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="space-y-2">
                  <p>{error}</p>
                  {showGoogleHint && (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-lg font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <span>Google ile Giriş Yap</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {authModalTab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Ad Soyad
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Adınız Soyadınız"
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                E-Posta Adresi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@domain.com"
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Şifre
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {authModalTab === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Şifre Tekrar
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>İşlem yapılıyor...</span>
                </>
              ) : authModalTab === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>E-Posta ile Giriş Yap</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>E-Posta ile Kayıt Ol</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
