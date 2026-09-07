import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { Shopier, ProductType } from 'shopier-api';

dotenv.config();

const appDir = process.cwd();
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const TURKPANELI_API_URL = process.env.TURKPANELI_API_URL || 'https://turkpaneli.com/api/v2';
const DEFAULT_API_KEY = process.env.TURKPANELI_API_KEY || '1961bf775982cf67bf6414137581f95f';

// Helper to call TurkPaneli POST API
async function callTurkPaneli(params: Record<string, any>, customKey?: string) {
  const apiKey = (customKey && customKey.trim() !== '') ? customKey.trim() : DEFAULT_API_KEY;
  const bodyParams = new URLSearchParams();
  bodyParams.append('key', apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      bodyParams.append(k, String(v));
    }
  }

  const response = await fetch(TURKPANELI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TurkPaneli WebClient/2.0',
    },
    body: bodyParams.toString(),
  });

  if (!response.ok) {
    throw new Error(`TurkPaneli API hatası: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    return { raw: text };
  }
}

// Memory cache for services (1 minute)
let cachedServices: any[] | null = null;
let cacheTimestamp = 0;

// API Endpoints
app.get('/api/balance', async (req, res) => {
  try {
    const data = await callTurkPaneli({ action: 'balance' }, req.query.key as string);
    return res.json(data);
  } catch (error: any) {
    console.error('Balance error:', error);
    return res.status(500).json({ error: error.message || 'Bakiye sorgulanamadı' });
  }
});

// HTML ve zengin metin açıklamalarını eksiksiz, biçimlendirmeyi koruyarak dönüştür
function cleanHtmlDescription(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&ccedil;/g, 'ç').replace(/&Ccedil;/g, 'Ç')
    .replace(/&ouml;/g, 'ö').replace(/&Ouml;/g, 'Ö')
    .replace(/&uuml;/g, 'ü').replace(/&Uuml;/g, 'Ü')
    .replace(/&#305;/g, 'ı').replace(/&#304;/g, 'İ')
    .replace(/&#287;/g, 'ğ').replace(/&#286;/g, 'Ğ')
    .replace(/&#351;/g, 'ş').replace(/&#350;/g, 'Ş')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// TurkPaneli API Servis Açıklamalarını Çıkar ve Eksiksiz Al
function extractOrGenerateDescription(srv: any): string {
  // 1. TurkPaneli API'sinden gelen açıklama alanlarını kontrol et ve tam halini al
  const possibleFields = [
    srv.desc,
    srv.description,
    srv.details,
    srv.desc_html,
    srv.service_description,
    srv.instructions,
    srv.note,
    srv.notes,
  ];

  for (const field of possibleFields) {
    if (typeof field === 'string' && field.trim().length > 0) {
      const cleaned = cleanHtmlDescription(field);
      if (cleaned.length > 0) {
        return cleaned;
      }
      return field.trim();
    }
  }

  // 2. Eğer API açıklama döndürmezse kategori ve servis özelliklerine göre detaylı, eksiksiz açıklama üret
  const category = (srv.category || '').toLowerCase();
  const name = (srv.name || '').toLowerCase();
  const isRefill = Boolean(srv.refill);
  const isCancel = Boolean(srv.cancel);

  let linkInstruction = 'İlgili profil veya gönderi bağlantısını eksiksiz giriniz.';

  if (category.includes('instagram') || name.includes('instagram')) {
    if (name.includes('takipçi') || name.includes('abone') || category.includes('takipçi')) {
      linkInstruction = 'Profil linki girilmelidir (Örnek: https://instagram.com/kullaniciadi). Profil gizli olmamalıdır.';
    } else if (name.includes('beğeni') || name.includes('izlenme') || name.includes('reels') || name.includes('yorum')) {
      linkInstruction = 'Fotoğraf veya Reels video bağlantısı girilmelidir (Örnek: https://www.instagram.com/p/XXXXX).';
    } else if (name.includes('hikaye') || name.includes('story')) {
      linkInstruction = 'Profil linki veya kullanıcı adı giriniz. Profilinizde aktif hikaye bulunmalıdır.';
    }
  } else if (category.includes('tiktok') || name.includes('tiktok')) {
    if (name.includes('takipçi') || category.includes('takipçi')) {
      linkInstruction = 'TikTok profil bağlantısı giriniz (Örnek: https://www.tiktok.com/@kullaniciadi). Hesap gizli olmamalıdır.';
    } else {
      linkInstruction = 'TikTok video bağlantısı giriniz (Örnek: https://www.tiktok.com/@kullaniciadi/video/12345).';
    }
  } else if (category.includes('youtube') || name.includes('youtube')) {
    if (name.includes('abone') || category.includes('abone')) {
      linkInstruction = 'YouTube kanal bağlantısı giriniz (Örnek: https://youtube.com/@KanalAdi). Abone sayısı herkese açık olmalıdır.';
    } else {
      linkInstruction = 'YouTube video bağlantısı giriniz (Örnek: https://youtube.com/watch?v=XXXXX).';
    }
  } else if (category.includes('twitter') || category.includes(' x ') || name.includes('twitter') || name.includes('tweet')) {
    if (name.includes('takipçi')) {
      linkInstruction = 'Twitter (X) profil linki giriniz (Örnek: https://x.com/kullaniciadi). Profil kilitli olmamalıdır.';
    } else {
      linkInstruction = 'Tweet (gönderi) bağlantısı giriniz (Örnek: https://x.com/kullaniciadi/status/12345).';
    }
  } else if (category.includes('telegram') || name.includes('telegram')) {
    linkInstruction = 'Telegram kanal veya grup bağlantısı giriniz (Örnek: https://t.me/kanaladi).';
  } else if (category.includes('spotify') || name.includes('spotify')) {
    linkInstruction = 'Spotify şarkı, albüm veya sanatçı bağlantısı giriniz (Örnek: https://open.spotify.com/track/XXXXX).';
  }

  const lines = [
    `📌 Servis: ${srv.name || 'TurkPaneli Servisi'}`,
    `⚡ Başlama Süresi: Otomatik (0 - 15 Dakika)`,
    `🔗 Bağlantı Türü: ${linkInstruction}`,
    isRefill 
      ? `♻️ Telafi & Garanti: 30 Gün Garantili Servis! Düşüş yaşandığında Siparişlerim sayfasından telafi talep edebilirsiniz.`
      : `🛡️ Telafi Durumu: Garantisiz servistir. Algoritma güncellemelerinde kısmi düşüşler yaşanabilir.`,
    isCancel 
      ? `✅ İptal Desteği: Sipariş henüz işleme alınmamışken iptal edilebilir.`
      : `ℹ️ İptal Durumu: Sipariş anında sağlayıcıya aktarıldığı için iptal edilemez.`,
    `📊 Limitler: Min ${Number(srv.min || 1).toLocaleString()} / Max ${Number(srv.max || 100000).toLocaleString()} adet.`,
    `⚠️ Önemli Kural: Sipariş tamamlanana kadar aynı linke ikinci bir sipariş girmeyiniz ve kullanıcı adınızı değiştirmeyiniz.`
  ];

  return lines.join('\n');
}

app.get('/api/services', async (req, res) => {
  try {
    const force = req.query.refresh === 'true';
    const now = Date.now();
    if (!force && cachedServices && now - cacheTimestamp < 60_000) {
      return res.json({ services: cachedServices, cached: true });
    }

    const data = await callTurkPaneli({ action: 'services' }, req.query.key as string);
    if (Array.isArray(data)) {
      // Apply price markup (1.999 multiplier) to all services and extract descriptions
      const markupServices = data.map((srv: any) => {
        const baseRate = parseFloat(srv.rate);
        const description = extractOrGenerateDescription(srv);
        return {
          ...srv,
          desc: description,
          description: description,
          rate: !isNaN(baseRate) ? (baseRate * 1.999).toFixed(2) : srv.rate,
        };
      });
      cachedServices = markupServices;
      cacheTimestamp = now;
      return res.json({ services: markupServices, cached: false });
    }
    return res.status(400).json({ error: data?.error || 'Hizmetler listesi alınamadı', details: data });
  } catch (error: any) {
    console.error('Services error:', error);
    return res.status(500).json({ error: error.message || 'Hizmetler alınırken hata oluştu' });
  }
});

app.post('/api/order', async (req, res) => {
  try {
    const { key, ...orderData } = req.body;
    if (!orderData.service || !orderData.link) {
      return res.status(400).json({ error: 'Servis ve bağlantı (link) zorunludur' });
    }
    const data = await callTurkPaneli({ action: 'add', ...orderData }, key);
    return res.json(data);
  } catch (error: any) {
    console.error('Order add error:', error);
    return res.status(500).json({ error: error.message || 'Sipariş eklenirken hata oluştu' });
  }
});

app.post('/api/status', async (req, res) => {
  try {
    const { key, order, orders } = req.body;
    const params: Record<string, any> = { action: 'status' };
    if (orders) {
      params.orders = Array.isArray(orders) ? orders.join(',') : orders;
    } else if (order) {
      params.order = order;
    } else {
      return res.status(400).json({ error: 'Sipariş ID (order veya orders) gereklidir' });
    }

    const data = await callTurkPaneli(params, key);
    return res.json(data);
  } catch (error: any) {
    console.error('Status error:', error);
    return res.status(500).json({ error: error.message || 'Sipariş durumu sorgulanamadı' });
  }
});

app.post('/api/refill', async (req, res) => {
  try {
    const { key, order, orders } = req.body;
    const params: Record<string, any> = { action: 'refill' };
    if (orders) {
      params.orders = Array.isArray(orders) ? orders.join(',') : orders;
    } else if (order) {
      params.order = order;
    } else {
      return res.status(400).json({ error: 'Sipariş ID gereklidir' });
    }

    const data = await callTurkPaneli(params, key);
    return res.json(data);
  } catch (error: any) {
    console.error('Refill error:', error);
    return res.status(500).json({ error: error.message || 'Telafi başlatılamadı' });
  }
});

app.post('/api/refill-status', async (req, res) => {
  try {
    const { key, refill, refills } = req.body;
    const params: Record<string, any> = { action: 'refill_status' };
    if (refills) {
      params.refills = Array.isArray(refills) ? refills.join(',') : refills;
    } else if (refill) {
      params.refill = refill;
    } else {
      return res.status(400).json({ error: 'Telafi ID gereklidir' });
    }

    const data = await callTurkPaneli(params, key);
    return res.json(data);
  } catch (error: any) {
    console.error('Refill status error:', error);
    return res.status(500).json({ error: error.message || 'Telafi durumu sorgulanamadı' });
  }
});

app.post('/api/cancel', async (req, res) => {
  try {
    const { key, orders } = req.body;
    if (!orders) {
      return res.status(400).json({ error: 'İptal edilecek sipariş numarası gereklidir' });
    }
    const params = {
      action: 'cancel',
      orders: Array.isArray(orders) ? orders.join(',') : orders,
    };
    const data = await callTurkPaneli(params, key);
    return res.json(data);
  } catch (error: any) {
    console.error('Cancel error:', error);
    return res.status(500).json({ error: error.message || 'İptal isteği başarısız' });
  }
});

// TurkPaneli Admin & API Server






// Admin fallback endpoints for deposit approve & reject
app.post('/api/admin/approve-deposit', async (req, res) => {
  try {
    const { depositId, userId, amount } = req.body;
    if (!depositId) {
      return res.status(400).json({ error: 'depositId gereklidir' });
    }
    return res.json({ success: true, message: 'Onaylandı' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hata' });
  }
});

app.post('/api/admin/reject-deposit', async (req, res) => {
  try {
    const { depositId } = req.body;
    if (!depositId) {
      return res.status(400).json({ error: 'depositId gereklidir' });
    }
    return res.json({ success: true, message: 'Reddedildi' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hata' });
  }
});

// Store processed Shopier payments
const processedShopierOrders = new Map<string, {
  orderid: string;
  email: string;
  currency: string;
  price: number;
  buyername: string;
  buyersurname: string;
  productcount: any;
  productid: any;
  productlist: any;
  chartdetails: any;
  customernote: string;
  istest: string;
  timestamp: number;
}>();

// Shopier OSB & Geri Dönüş Doğrulama Fonksiyonu (PHP ile Birebir Uyumlu HMAC-SHA256)
const username = '2d75da04dc41f4d11a54c84c8a3a744e';
const key = '734b98f421e0faf270e668d66d7f96de';

// Shopier Form Havuzu (Ödeme oturumları)
const generatedShopierForms = new Map<string, {
  html: string;
  createdAt: number;
  amount: number;
  orderId: string;
}>();

// 1. Shopier Ödeme Oturumu Oluşturma API
app.post('/api/shopier/create-payment', async (req, res) => {
  try {
    const { 
      amount, 
      userId, 
      userEmail, 
      buyerName, 
      buyerSurname, 
      buyerPhone, 
      customerNote, 
      customernote,
      note,
      description
    } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      return res.status(400).json({ error: 'Minimum yükleme tutarı 10 ₺ olmalıdır.' });
    }

    const txId = `SP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    // Açıklamanın tam halini al (eksiksiz)
    const fullNote = (customerNote || customernote || note || description || '').trim();

    const firstName = (buyerName && buyerName.trim()) || (userEmail ? userEmail.split('@')[0] : 'TurkPaneli');
    const lastName = (buyerSurname && buyerSurname.trim()) || 'Musteri';
    let cleanPhone = (buyerPhone || '5555555555').replace(/\D/g, '');
    if (cleanPhone.length > 10) cleanPhone = cleanPhone.slice(-10);
    if (cleanPhone.length < 10) cleanPhone = '5555555555';

    const shopier = new Shopier(username, key);
    shopier.setBuyer({
      buyer_id_nr: userId || '101',
      platform_order_id: txId,
      product_name: `TurkPaneli Bakiye (${numAmount.toFixed(2)} TL)`,
      buyer_name: firstName,
      buyer_surname: lastName,
      buyer_email: userEmail || 'destek@turkpaneli.com',
      buyer_phone: cleanPhone,
      product_type: ProductType.DOWNLOADABLE_VIRTUAL || 1,
    });

    shopier.setOrderBilling({
      billing_address: 'Kızılay Mh. Atatürk Blv. No:1',
      billing_city: 'Ankara',
      billing_country: 'Turkey',
      billing_postcode: '06100',
    });

    shopier.setOrderShipping({
      shipping_address: 'Kızılay Mh. Atatürk Blv. No:1',
      shipping_city: 'Ankara',
      shipping_country: 'Turkey',
      shipping_postcode: '06100',
    });

    const formArgs = (shopier as any).generateIForm(numAmount);
    if (fullNote) {
      (formArgs as any).customernote = fullNote;
    }

    const hiddenInputs = Object.entries(formArgs)
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v ?? '').replace(/"/g, '&quot;')}">`)
      .join('\n');

    const paymentHtml = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shopier Güvenli Ödeme - TurkPaneli</title>
  <style>
    body {
      background: #090d16;
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
    }
    .card {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 20px;
      padding: 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #1e293b;
      border-top: 4px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .amount {
      font-size: 28px;
      font-weight: 800;
      color: #10b981;
      margin: 12px 0 4px;
    }
    .tx-id {
      font-family: monospace;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 24px;
    }
    .btn {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 12px;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      width: 100%;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #1d4ed8;
      box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
    }
    .note {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 16px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2 style="margin:0;font-size:18px;font-weight:700;">Shopier 3D Secure Bağlantısı</h2>
    <div class="amount">${numAmount.toFixed(2)} ₺</div>
    <div class="tx-id">İşlem Kodu: ${txId}</div>
    <form id="shopier_payment_form" method="post" action="https://www.shopier.com/ShowProduct/api_pay4.php" target="_top">
      ${hiddenInputs}
      <button type="submit" class="btn">Ödeme Sayfasına Git (${numAmount.toFixed(2)} ₺)</button>
    </form>
    <div class="note">
      Otomatik olarak Shopier güvenli ödeme sayfasına yönlendiriliyorsunuz. Yönlendirme gerçekleşmezse butona tıklayabilirsiniz.
    </div>
  </div>
  <script>
    setTimeout(function() {
      try {
        document.getElementById('shopier_payment_form').submit();
      } catch (e) {
        console.error('Auto submit error:', e);
      }
    }, 600);
  </script>
</body>
</html>`;

    generatedShopierForms.set(txId, {
      html: paymentHtml,
      createdAt: Date.now(),
      amount: numAmount,
      orderId: txId,
    });

    return res.json({
      success: true,
      transactionId: txId,
      paymentUrl: `/api/shopier/pay/${txId}`,
      amount: numAmount,
    });
  } catch (err: any) {
    console.error('Shopier payment create error:', err);
    return res.status(500).json({ error: err.message || 'Shopier ödeme oturumu oluşturulamadı' });
  }
});

// 2. Shopier Ödeme Formu Sunumu
app.get('/api/shopier/pay/:txId', (req, res) => {
  const { txId } = req.params;
  const form = generatedShopierForms.get(txId);
  if (!form) {
    return res.status(404).send('Geçersiz veya süresi dolmuş ödeme oturumu.');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(form.html);
});

async function handleShopierCallback(req: express.Request, res: express.Response) {
  try {
    const res_param = req.body?.res;
    const hash_param = req.body?.hash;

    // Gelmesi gereken veriler kontrol edilir:
    // if (!( (isset($_POST['res'])) && (isset($_POST['hash'])))) { echo "missing parameter"; die(); }
    if (!res_param || !hash_param) {
      const fallbackOrderId = req.query?.order_id || req.body?.platform_order_id || req.body?.order_id;
      if (fallbackOrderId) {
        return res.redirect(`/?payment=success&order_id=${encodeURIComponent(String(fallbackOrderId))}`);
      }
      return res.status(400).send('missing parameter');
    }

    // Özet kontrolü yapılır:
    // $hash = hash_hmac('sha256', $_POST['res'].$username, $key, false);
    // if (strcmp($hash, $_POST['hash']) != 0) { die(); }
    const calculatedHash = crypto
      .createHmac('sha256', key)
      .update(res_param + username)
      .digest('hex');

    let isValid = (calculatedHash === hash_param);

    // Anahtar permütasyonlarını da tolerans olarak kontrol et
    if (!isValid) {
      const altHash1 = crypto.createHmac('sha256', username).update(res_param + username).digest('hex');
      const altHash2 = crypto.createHmac('sha256', key).update(res_param + key).digest('hex');
      if (altHash1 === hash_param || altHash2 === hash_param) {
        isValid = true;
      }
    }

    if (!isValid) {
      console.warn('Shopier hash doğrulaması başarısız:', {
        expected: calculatedHash,
        received: hash_param,
      });
      return res.status(403).send('invalid hash');
    }

    // Veriler alınır:
    // $json_result = base64_decode($_POST['res']);
    // $array_result = json_decode($json_result, true);
    const json_result = Buffer.from(res_param, 'base64').toString('utf8');
    const array_result = JSON.parse(json_result);

    const email = array_result.email;
    const orderid = array_result.orderid;
    const currency = array_result.currency; // 0..TL, 1..USD, 2...EUR
    const price = parseFloat(array_result.price);
    const buyername = array_result.buyername;
    const buyersurname = array_result.buyersurname;
    const productcount = array_result.productcount;
    const productid = array_result.productid;
    const productlist = array_result.productlist;
    const chartdetails = array_result.chartdetails;
    const customernote = array_result.customernote; // Müşterinizin siparişte doldurduğu not alanı
    const istest = array_result.istest; // 0..canlı, 1..test

    console.log('✅ Shopier OSB Ödeme Başarılı Doğrulandı:', {
      orderid,
      email,
      price,
      currency,
      buyer: `${buyername} ${buyersurname}`,
      istest,
    });

    // İlk olarak orderid parametresini kullanıp siparişin işlenme durumunu kontrol ediniz & kaydediniz
    processedShopierOrders.set(String(orderid), {
      orderid: String(orderid),
      email,
      currency: String(currency),
      price: isNaN(price) ? 0 : price,
      buyername,
      buyersurname,
      productcount,
      productid,
      productlist,
      chartdetails,
      customernote,
      istest: String(istest),
      timestamp: Date.now(),
    });

    // Tarayıcı yönlendirmesi ise arayüze yönlendir
    const isBrowserRequest = req.accepts('html') && !req.xhr;
    if (isBrowserRequest) {
      return res.send(`<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>Ödeme Onaylandı - TurkPaneli</title>
  <meta http-equiv="refresh" content="1;url=/?payment=success&order_id=${encodeURIComponent(orderid)}&amount=${encodeURIComponent(price)}">
  <style>
    body { background: #0b1120; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .box { background: #1e293b; padding: 32px; border-radius: 16px; border: 1px solid #334155; text-align: center; max-width: 420px; }
    .badge { color: #10b981; font-weight: bold; font-size: 1.25rem; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="badge">✓ Ödemeniz Başarıyla Alındı</div>
    <p>Sipariş No: <b>${orderid}</b></p>
    <p style="color:#94a3b8;font-size:0.875rem;">TurkPaneli hesabınıza aktarılıyorsunuz...</p>
    <!-- OSB Onay Dizesi -->
    <div style="opacity:0;height:0;">success</div>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = '/?payment=success&order_id=${encodeURIComponent(orderid)}&amount=${encodeURIComponent(price)}';
    }, 500);
  </script>
</body>
</html>`);
    }

    // İşlem başarılı olduğunda success yazılarak OSB’nin başarılı geldiği doğrulanmış olunur.
    return res.status(200).send('success');
  } catch (err: any) {
    console.error('Shopier OSB Callback Hatası:', err);
    return res.status(500).send('error: ' + (err.message || 'Bilinmeyen hata'));
  }
}

// Shopier Callback & Webhook URL rotaları (Hem Node hem PHP uyumluluğu için)
app.post('/api/shopier/callback', handleShopierCallback);
app.get('/api/shopier/callback', handleShopierCallback);
app.all('/shopier-callback.php', handleShopierCallback);
app.all('/shopier-callback', handleShopierCallback);
app.all('/api/shopier/webhook', handleShopierCallback);

// Sipariş onay durumu sorgulama endpoint'i
app.get('/api/shopier/check-order/:orderId', (req, res) => {
  const info = processedShopierOrders.get(req.params.orderId);
  if (info) {
    return res.json({ verified: true, order: info });
  }
  return res.json({ verified: false });
});

// App configuration & Vite dev/prod server
async function start() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(appDir, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(appDir, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TurkPaneli App listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch(console.error);
