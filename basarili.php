<?php
/**
 * basarili.php - Shopier Ödeme Başarılı Sayfası
 * PHP Sürümü: 8.1+
 */
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$orderId = htmlspecialchars((string)($_GET['order_id'] ?? $_SESSION['last_order_id'] ?? 'TP-BAŞARILI'), ENT_QUOTES, 'UTF-8');
$amount = (float)($_GET['amount'] ?? $_SESSION['last_amount'] ?? 0.0);
$userEmail = htmlspecialchars((string)($_SESSION['user']['email'] ?? 'Hesabınız'), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ödeme Başarılı - TurkPaneli</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
        .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.05); }
        .icon-box { width: 72px; height: 72px; background: #ecfdf5; border: 2px solid #a7f3d0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; }
        .icon-box svg { width: 36px; height: 36px; color: #059669; }
        h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
        p.subtitle { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
        .receipt { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px 20px; margin-bottom: 24px; text-align: left; font-size: 13.5px; }
        .receipt-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
        .receipt-row:last-child { border-bottom: none; padding-top: 10px; font-weight: 700; font-size: 15px; color: #0f172a; }
        .receipt-label { color: #64748b; }
        .receipt-value { font-weight: 600; color: #1e293b; font-family: monospace; font-size: 13px; }
        .receipt-row:last-child .receipt-value { font-family: inherit; font-size: 16px; color: #059669; }
        .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px 16px; font-size: 12.5px; color: #166534; line-height: 1.5; margin-bottom: 24px; text-align: left; display: flex; gap: 10px; align-items: center; }
        .btn-group { display: flex; flex-direction: column; gap: 10px; }
        .btn-primary { display: block; width: 100%; background: #2563eb; color: #ffffff; text-decoration: none; padding: 13px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; transition: background 0.2s; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-secondary { display: block; width: 100%; background: #f1f5f9; color: #334155; text-decoration: none; padding: 13px 20px; border-radius: 12px; font-weight: 600; font-size: 14px; transition: background 0.2s; }
        .btn-secondary:hover { background: #e2e8f0; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-box">
            <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path>
            </svg>
        </div>

        <h1>Ödemeniz Başarılı!</h1>
        <p class="subtitle">Shopier 3D Secure ile ödemeniz onaylandı. Yüklediğiniz bakiye anında hesabınıza yansıtılmıştır.</p>

        <div class="receipt">
            <div class="receipt-row">
                <span class="receipt-label">Sipariş / Referans No:</span>
                <span class="receipt-value"><?= $orderId ?></span>
            </div>
            <div class="receipt-row">
                <span class="receipt-label">Ödeme Yöntemi:</span>
                <span class="receipt-value" style="font-family: inherit;">Shopier (Kredi/Banka Kartı)</span>
            </div>
            <div class="receipt-row">
                <span class="receipt-label">Hesap E-postası:</span>
                <span class="receipt-value" style="font-family: inherit;"><?= $userEmail ?></span>
            </div>
            <div class="receipt-row">
                <span class="receipt-label">Tarih & Saat:</span>
                <span class="receipt-value" style="font-family: inherit;"><?= date('d.m.Y H:i') ?></span>
            </div>
            <?php if ($amount > 0): ?>
            <div class="receipt-row">
                <span class="receipt-label">Yüklenen Tutar:</span>
                <span class="receipt-value">+<?= number_format($amount, 2, ',', '.') ?> TL</span>
            </div>
            <?php endif; ?>
        </div>

        <div class="alert-success">
            <span>✨</span>
            <span>Yeni bakiyenizle hemen dilediğiniz servisten sipariş verebilir, sipariş durumunuzu takip edebilirsiniz.</span>
        </div>

        <div class="btn-group">
            <a href="/" class="btn-primary">Panele Dön ve Sipariş Ver</a>
            <a href="/#orders" class="btn-secondary">Siparişlerimi Görüntüle</a>
        </div>
    </div>
</body>
</html>
