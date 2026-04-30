// assets/js/main.js

let currentUser = null;
let isLoginMode = true;

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    loadSession();
    updateBalanceUI();
    updateAuthUI();
});

// Firebase Auth ile oturum kontrolü
if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Kullanıcı giriş yapmış
            const users = await loadUsers();
            let existingUser = users.find(u => u.email === user.email);
            
            if (!existingUser) {
                // Yeni kullanıcıyı veritabanına ekle
                const newUser = {
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0],
                    photoURL: user.photoURL || null,
                    balance: 0,
                    orders: [],
                    createdAt: new Date().toISOString(),
                    authProvider: user.providerData[0]?.providerId || 'email'
                };
                users.push(newUser);
                await database.ref('users').set(users);
                existingUser = newUser;
            }
            
            currentUser = existingUser;
            localStorage.setItem('360_session', JSON.stringify({ 
                email: currentUser.email, 
                balance: currentUser.balance, 
                name: currentUser.name,
                photoURL: currentUser.photoURL
            }));
            updateBalanceUI();
            updateAuthUI();
            updateSidebarUser();
            
        } else {
            // Kullanıcı çıkış yapmış
            currentUser = null;
            localStorage.removeItem('360_session');
            updateBalanceUI();
            updateAuthUI();
            updateSidebarUser();
        }
    });
}

// Sidebar kullanıcı bilgilerini güncelle (sidebar varsa)
function updateSidebarUser() {
    const userNameSpan = document.getElementById('userNameDisplay');
    const userEmailSpan = document.getElementById('userEmailDisplay');
    const userAvatar = document.getElementById('userAvatar');
    
    if (currentUser) {
        if (userNameSpan) userNameSpan.innerText = currentUser.name;
        if (userEmailSpan) userEmailSpan.innerText = currentUser.email;
        if (userAvatar) {
            if (currentUser.photoURL) {
                userAvatar.innerHTML = `<img src="${currentUser.photoURL}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                userAvatar.innerHTML = '<i class="fas fa-user"></i>';
            }
        }
    } else {
        if (userNameSpan) userNameSpan.innerText = 'Misafir';
        if (userEmailSpan) userEmailSpan.innerText = 'Giriş yapmadınız';
        if (userAvatar) userAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
}

// Kullanıcıları yükle
async function loadUsers() {
    const snapshot = await database.ref('users').once('value');
    const data = snapshot.val();
    return data ? Object.values(data) : [];
}

// Bakiye UI güncelle
async function updateBalanceUI() {
    const balanceSpan = document.getElementById('userBalance');
    if (currentUser && balanceSpan) {
        balanceSpan.innerText = currentUser.balance.toFixed(2);
    } else if (balanceSpan) {
        balanceSpan.innerText = '0.00';
    }
}

// Auth UI güncelle (giriş/çıkış butonları)
function updateAuthUI() {
    const loginBtn = document.getElementById('loginButton');
    const logoutBtn = document.getElementById('logoutButton');
    
    if (currentUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'flex';
    } else {
        if (loginBtn) loginBtn.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// Oturumu yükle (localStorage'dan)
async function loadSession() {
    const session = localStorage.getItem('360_session');
    if (session && !currentUser) {
        const data = JSON.parse(session);
        const users = await loadUsers();
        const user = users.find(u => u.email === data.email);
        if (user) {
            currentUser = user;
            updateBalanceUI();
            updateAuthUI();
            updateSidebarUser();
        } else {
            localStorage.removeItem('360_session');
        }
    } else {
        updateSidebarUser();
    }
}

// Çıkış yap
async function logout() {
    if (typeof auth !== 'undefined') {
        await auth.signOut();
    }
    currentUser = null;
    localStorage.removeItem('360_session');
    updateBalanceUI();
    updateAuthUI();
    updateSidebarUser();
    window.location.href = 'index.html';
}

// Google ile Giriş
function googleLogin() {
    if (typeof auth === 'undefined') {
        alert('Google girişi için lütfen sayfayı yenileyin.');
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    auth.signInWithPopup(provider)
        .then(() => {
            closeAuthModal();
        })
        .catch((error) => {
            console.error('Google giriş hatası:', error);
            alert('Google ile giriş yapılırken bir hata oluştu: ' + error.message);
        });
}

// Email ile Giriş
async function emailLogin(email, password) {
    if (typeof auth === 'undefined') {
        alert('Giriş yapılamıyor. Lütfen sayfayı yenileyin.');
        return false;
    }
    try {
        await auth.signInWithEmailAndPassword(email, password);
        closeAuthModal();
        return true;
    } catch (error) {
        console.error('Giriş hatası:', error);
        if (error.code === 'auth/user-not-found') {
            alert('Bu e-posta ile kayıtlı kullanıcı bulunamadı.');
        } else if (error.code === 'auth/wrong-password') {
            alert('Şifre hatalı.');
        } else {
            alert('Giriş hatası: ' + error.message);
        }
        return false;
    }
}

// Email ile Kayıt
async function emailRegister(email, password) {
    if (typeof auth === 'undefined') {
        alert('Kayıt yapılamıyor. Lütfen sayfayı yenileyin.');
        return false;
    }
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log('Kayıt başarılı:', userCredential.user);
        closeAuthModal();
        return true;
    } catch (error) {
        console.error('Kayıt hatası:', error);
        if (error.code === 'auth/email-already-in-use') {
            alert('Bu e-posta zaten kullanılıyor.');
        } else if (error.code === 'auth/weak-password') {
            alert('Şifre çok zayıf. En az 6 karakter olmalı.');
        } else {
            alert('Kayıt hatası: ' + error.message);
        }
        return false;
    }
}

// Auth Modal işlemleri
function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('active');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

function switchMode() {
    isLoginMode = !isLoginMode;
    const titleEl = document.getElementById('authTitle');
    const actionBtn = document.getElementById('authActionBtn');
    const switchBtn = document.getElementById('switchModeBtn');
    if (titleEl) titleEl.innerText = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
    if (actionBtn) actionBtn.innerText = isLoginMode ? 'Giriş Yap' : 'Kayıt Ol';
    if (switchBtn) switchBtn.innerHTML = isLoginMode ? 'Kayıt Ol' : 'Giriş Yap';
}

async function authAction() {
    const email = document.getElementById('authEmail')?.value.trim();
    const password = document.getElementById('authPassword')?.value;
    
    if (!email || !password) {
        alert('E-posta ve şifre giriniz');
        return;
    }
    
    if (isLoginMode) {
        await emailLogin(email, password);
    } else {
        await emailRegister(email, password);
    }
}

// HTML escape
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}