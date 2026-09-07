<?php
/**
 * webhook.php - Shopier Ödeme Bildirimi (Webhook & Callback) Doğrulama
 * PHP Sürümü: 8.1+
 */
declare(strict_types=1);

// Veritabanı ve çevre değişkenleri yükleyici
require_once __DIR__ . '/db.php';

// Composer autoload kontrolü
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

// 1. Gerekli Parametrelerin Kontrolü
if (!isset($_POST['res']) || !isset($_POST['hash'])) {
    http_response_code(400);
    die('missing parameter');
}

$res = (string)$_POST['res'];
$incomingHash = (string)$_POST['hash'];

// Çevre değişkenlerinden veya yapılandırmadan anahtarları al
$username = getenv('SHOPIER_USER') ?: '2d75da04dc41f4d11a54c84c8a3a744e';
$key = getenv('SHOPIER_KEY') ?: '734b98f421e0faf270e668d66d7f96de';

// 2. Özet (HMAC-SHA256) Güvenlik Doğrulaması
$calculatedHash = hash_hmac('sha256', $res . $username, $key, false);

if (!hash_equals($calculatedHash, $incomingHash)) {
    http_response_code(403);
    error_log('[Shopier Webhook] Geçersiz İmza/Hash Doğrulaması Başarısız Oldu!');
    die('invalid signature');
}

// 3. Verileri Çözümle (Base64 Decode & JSON Parse)
$jsonResult = base64_decode($res, true);
if ($jsonResult === false) {
    http_response_code(400);
    die('invalid base64');
}

$arrayResult = json_decode($jsonResult, true);
if (!is_array($arrayResult)) {
    http_response_code(400);
    die('invalid json payload');
}

// Shopier Parametrelerini Al
$orderId      = (string)($arrayResult['orderid'] ?? '');
$email        = (string)($arrayResult['email'] ?? '');
$price        = (float)($arrayResult['price'] ?? 0.0);
$currency     = (int)($arrayResult['currency'] ?? 0); // 0 = TL, 1 = USD, 2 = EUR
$buyerName    = (string)($arrayResult['buyername'] ?? '');
$buyerSurname = (string)($arrayResult['buyersurname'] ?? '');
$customerNote = (string)($arrayResult['customernote'] ?? '');
$isTest       = (int)($arrayResult['istest'] ?? 0);
$paymentId    = (string)($arrayResult['paymentid'] ?? ('SP-' . time()));

if (empty($orderId)) {
    http_response_code(400);
    die('missing order id');
}

// 4. Veritabanı İşlemleri (Çift İşlem Koruması & Bakiye Yükleme)
$pdo = getDatabaseConnection();

if ($pdo instanceof PDO) {
    try {
        // İşlemi transaction içerisine al
        $pdo->beginTransaction();

        // Siparişin mevcut durumunu kontrol et (Idempotency)
        $stmt = $pdo->prepare("SELECT id, user_id, amount, status FROM deposits WHERE order_id = :order_id FOR UPDATE");
        $stmt->execute([':order_id' => $orderId]);
        $deposit = $stmt->fetch();

        if ($deposit && $deposit['status'] === 'completed') {
            // Sipariş zaten işlenmiş, tekrar bakiye ekleme
            $pdo->commit();
            echo 'OK - Already Processed';
            exit;
        }

        // Tutar kontrolü (Eğer veritabanında kayıtlı tutar varsa doğrula)
        $creditAmount = $price > 0 ? $price : (float)($deposit['amount'] ?? 0);
        $userId = $deposit ? (int)$deposit['user_id'] : null;

        // Sipariş durumunu güncelle
        if ($deposit) {
            $updateStmt = $pdo->prepare("
                UPDATE deposits 
                SET status = 'completed', 
                    paid_at = NOW(), 
                    shopier_payment_id = :payment_id,
                    customer_note = COALESCE(:customer_note, customer_note)
                WHERE order_id = :order_id
            ");
            $updateStmt->execute([
                ':payment_id' => $paymentId,
                ':customer_note' => $customerNote,
                ':order_id' => $orderId,
            ]);
        } else {
            // Eğer sipariş önceden kaydedilmemişse doğrudan completed olarak ekle
            $insertStmt = $pdo->prepare("
                INSERT INTO deposits (order_id, user_id, user_email, amount, currency, status, customer_note, shopier_payment_id, created_at, paid_at)
                VALUES (:order_id, 0, :email, :amount, 'TRY', 'completed', :customer_note, :payment_id, NOW(), NOW())
            ");
            $insertStmt->execute([
                ':order_id' => $orderId,
                ':email' => $email,
                ':amount' => $creditAmount,
                ':customer_note' => $customerNote,
                ':payment_id' => $paymentId,
            ]);
        }

        // Kullanıcı bakiyesini artır (Örnek users tablosu)
        if ($userId !== null && $userId > 0) {
            $balanceStmt = $pdo->prepare("UPDATE users SET balance = balance + :amount WHERE id = :user_id");
            $balanceStmt->execute([
                ':amount' => $creditAmount,
                ':user_id' => $userId,
            ]);
        } elseif (!empty($email)) {
            $balanceStmt = $pdo->prepare("UPDATE users SET balance = balance + :amount WHERE email = :email");
            $balanceStmt->execute([
                ':amount' => $creditAmount,
                ':email' => $email,
            ]);
        }

        // Değişiklikleri onayla
        $pdo->commit();

        error_log("[Shopier Başarılı Ödeme] Sipariş No: {$orderId}, Tutar: {$creditAmount} TL, E-posta: {$email}");

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[Shopier DB Hatası]: ' . $e->getMessage());
        http_response_code(500);
        die('database error');
    }
}

// Shopier'a ödemenin başarıyla işlendiğini bildir
echo 'success';
exit;
