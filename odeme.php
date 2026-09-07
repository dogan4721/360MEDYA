<?php
/**
 * odeme.php - Shopier Dinamik Ödeme Oluşturma ve Müşteriyi Yönlendirme
 * PHP Sürümü: 8.1+
 * Kütüphane: mebularts/shopier
 */
declare(strict_types=1);

// Oturumu başlat
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Veritabanı ve çevre değişkenleri yükleyici
require_once __DIR__ . '/db.php';

// Composer autoload kontrolü (mebularts/shopier kütüphanesi için)
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

// 1. Müşteri Bilgilerini Session'dan Al (Eğer yoksa varsayılan session değerleri ata)
if (empty($_SESSION['user'])) {
    $_SESSION['user'] = [
        'id' => 101,
        'first_name' => 'Doğan',
        'last_name' => 'Başboğa',
        'email' => 'destek@turkpaneli.com',
        'phone' => '05551234567',
        'address' => 'Kızılay Mah. Atatürk Blv. No:1 D:5',
        'city' => 'Ankara',
        'country' => 'Turkey',
        'postcode' => '06100',
    ];
}

$user = $_SESSION['user'];

// 2. Dinamik Ödeme / Ürün Bilgilerini Belirle
// Formdan (POST) veya Query (GET) üzerinden gelen tutar veya varsayılan 100 TL
$amount = isset($_REQUEST['amount']) ? (float)$_REQUEST['amount'] : 100.00;
if ($amount < 1.00) {
    die('Hata: Minimum ödeme tutarı 1.00 TL olmalıdır.');
}

$productTitle = isset($_REQUEST['product_name']) 
    ? htmlspecialchars(strip_tags((string)$_REQUEST['product_name']), ENT_QUOTES, 'UTF-8')
    : 'Bakiye Yükleme (' . number_format($amount, 2, ',', '.') . ' TL)';

$customerNote = isset($_REQUEST['customer_note']) 
    ? htmlspecialchars(strip_tags((string)$_REQUEST['customer_note']), ENT_QUOTES, 'UTF-8')
    : 'TurkPaneli Otomatik Bakiye Yükleme';

// Benzersiz sipariş / işlem numarası oluştur
$orderId = 'TP-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));

// 3. Veritabanına Bekleyen (Pending) İşlem Kaydını Ekle
$pdo = getDatabaseConnection();
if ($pdo instanceof PDO) {
    try {
        // Tablonun varlığını garanti et
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS deposits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(64) NOT NULL UNIQUE,
                user_id INT NOT NULL,
                user_email VARCHAR(255) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'TRY',
                status VARCHAR(32) DEFAULT 'pending',
                customer_note TEXT NULL,
                shopier_payment_id VARCHAR(128) NULL,
                created_at DATETIME NOT NULL,
                paid_at DATETIME NULL,
                INDEX idx_order_id (order_id),
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $stmt = $pdo->prepare("
            INSERT INTO deposits (order_id, user_id, user_email, amount, currency, status, customer_note, created_at)
            VALUES (:order_id, :user_id, :user_email, :amount, 'TRY', 'pending', :customer_note, NOW())
        ");
        $stmt->execute([
            ':order_id' => $orderId,
            ':user_id' => (int)($user['id'] ?? 0),
            ':user_email' => (string)($user['email'] ?? ''),
            ':amount' => $amount,
            ':customer_note' => $customerNote,
        ]);
    } catch (PDOException $e) {
        error_log('[DB Insert Hatası]: ' . $e->getMessage());
    }
}

// 4. Shopier PAT Değerini Al
$pat = getenv('SHOPIER_PAT') ?: '';
$apiKey = getenv('SHOPIER_KEY') ?: '734b98f421e0faf270e668d66d7f96de';
$apiUser = getenv('SHOPIER_USER') ?: '2d75da04dc41f4d11a54c84c8a3a744e';
$successUrl = getenv('SHOPIER_SUCCESS_URL') ?: (getenv('APP_URL') . '/basarili.php');
$failUrl = getenv('SHOPIER_FAIL_URL') ?: (getenv('APP_URL') . '/basarisiz.php');
$webhookUrl = getenv('SHOPIER_WEBHOOK_URL') ?: (getenv('APP_URL') . '/webhook.php');

// Session içine son sipariş numarasını kaydet
$_SESSION['last_order_id'] = $orderId;
$_SESSION['last_amount'] = $amount;

// 5. mebularts/shopier Kütüphanesi İle veya PAT Tabanlı Ödeme Oturumu Başlat
// Kütüphane mevcutsa mebularts nesnesini başlat:
if (class_exists('\Mebularts\Shopier\Shopier')) {
    /** @var \Mebularts\Shopier\Shopier $shopier */
    $shopier = new \Mebularts\Shopier\Shopier($pat);
    
    // Müşteri bilgileri
    $shopier->setBuyer([
        'id' => (string)$user['id'],
        'name' => $user['first_name'],
        'surname' => $user['last_name'],
        'email' => $user['email'],
        'phone' => $user['phone'],
    ]);

    // Fatura ve Teslimat adresi
    $shopier->setOrderBilling([
        'billing_address' => $user['address'],
        'billing_city' => $user['city'],
        'billing_country' => $user['country'],
        'billing_postcode' => $user['postcode'],
    ]);
    $shopier->setOrderShipping([
        'shipping_address' => $user['address'],
        'shipping_city' => $user['city'],
        'shipping_country' => $user['country'],
        'shipping_postcode' => $user['postcode'],
    ]);

    // Dinamik ürün ve yönlendirme
    echo $shopier->payment($orderId, $amount, $productTitle);
    exit;
}

// Alternatif: Shopier PAT REST API veya Standart Form Yönlendirici
// mebularts/shopier kütüphanesi henüz composer ile kurulmamışsa dahi sorunsuz çalışacak otomatik form motoru:
$buyerName = trim(($user['first_name'] ?? 'Musteri') . ' ' . ($user['last_name'] ?? ''));
$buyerPhone = (string)($user['phone'] ?? '05555555555');
$buyerEmail = (string)($user['email'] ?? 'musteri@turkpaneli.com');
$buyerAddress = (string)($user['address'] ?? 'Merkez Mah.');
$buyerCity = (string)($user['city'] ?? 'Ankara');
$buyerCountry = (string)($user['country'] ?? 'Turkey');
$buyerPostcode = (string)($user['postcode'] ?? '06100');

// Shopier Form Parametreleri
$args = [
    'API_key' => $apiUser,
    'website_index' => '1',
    'platform_order_id' => $orderId,
    'product_name' => $productTitle,
    'product_type' => '1', // Dijital / İndirilebilir Servis
    'buyer_name' => $user['first_name'],
    'buyer_surname' => $user['last_name'],
    'buyer_email' => $buyerEmail,
    'buyer_account_age' => '0',
    'buyer_id_nr' => (string)($user['id'] ?? '101'),
    'buyer_phone' => $buyerPhone,
    'billing_address' => $buyerAddress,
    'billing_city' => $buyerCity,
    'billing_country' => $buyerCountry,
    'billing_postcode' => $buyerPostcode,
    'shipping_address' => $buyerAddress,
    'shipping_city' => $buyerCity,
    'shipping_country' => $buyerCountry,
    'shipping_postcode' => $buyerPostcode,
    'total_order_value' => number_format($amount, 2, '.', ''),
    'currency' => '0', // 0 = TL
    'platform' => '0',
    'is_in_frame' => '0',
    'current_language' => '0',
    'modul_version' => '1.0.4',
    'random_nr' => (string)random_int(100000, 999999),
    'customernote' => $customerNote,
];

// İmzayı oluştur
$signatureData = $args['random_nr'] . $args['platform_order_id'] . $args['total_order_value'] . $args['currency'];
$signature = hash_hmac('sha256', $signatureData, $apiKey, true);
$signature = base64_encode($signature);
$args['signature'] = $signature;
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shopier Güvenli Ödeme Sayfasına Yönlendiriliyorsunuz...</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 36px 32px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
        .spinner { width: 44px; height: 44px; border: 3.5px solid #e2e8f0; border-top-color: #2563eb; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
        h1 { font-size: 19px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
        p { font-size: 13.5px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
        .details { background: #f1f5f9; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; text-align: left; font-size: 13px; }
        .details-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .details-row:last-child { margin-bottom: 0; font-weight: 700; color: #0f172a; }
        .btn { display: inline-block; width: 100%; background: #2563eb; color: #fff; border: none; padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; }
        .btn:hover { background: #1d4ed8; }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <h1>Güvenli Ödeme Başlatılıyor</h1>
        <p>Shopier 3D Secure güvenli ödeme sayfasına aktarılıyorsunuz. Lütfen bekleyiniz...</p>

        <div class="details">
            <div class="details-row"><span>Sipariş No:</span> <span><?= htmlspecialchars($orderId) ?></span></div>
            <div class="details-row"><span>Müşteri:</span> <span><?= htmlspecialchars($buyerName) ?></span></div>
            <div class="details-row"><span>Ödenecek Tutar:</span> <span><?= number_format($amount, 2, ',', '.') ?> TL</span></div>
        </div>

        <form id="shopier_form" method="POST" action="https://www.shopier.com/ShowProduct/api_pay4.php">
            <?php foreach ($args as $key => $val): ?>
                <input type="hidden" name="<?= htmlspecialchars((string)$key) ?>" value="<?= htmlspecialchars((string)$val) ?>">
            <?php endforeach; ?>
            <button type="submit" class="btn">Sayfa Açılmazsa Tıklayınız</button>
        </form>
    </div>

    <script>
        // Sayfa yüklendiğinde otomatik Shopier 3D Secure ekranına POST yönlendirmesi yap
        window.addEventListener('DOMContentLoaded', () => {
            document.getElementById('shopier_form').submit();
        });
    </script>
</body>
</html>
