<?php
/**
 * basarisiz.php - Shopier Ödeme Başarısız Sayfası
 * PHP Sürümü: 8.1+
 */
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$orderId = htmlspecialchars((string)($_GET['order_id'] ?? $_SESSION['last_order_id'] ?? 'TP-HATA'), ENT_QUOTES, 'UTF-8');
$errorMessage = htmlspecialchars((string)($_GET['error'] ?? 'Ödeme bankanız veya kart kuruluşu tarafından onaylanmadı.'), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ödeme Tamamlanamadı - TurkPaneli</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
        .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.05); }
        .icon-box { width: 72px; height: 72px; background: #fef2f2; border: 2px solid #fecaca; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; }
        .icon-box svg { width: 36px; height: 36px; color: #dc2626; }
        h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
        p.subtitle { font-size: 14px; color: #64748b; line-height: 1.5; margin-bottom: 24px; }
        .error-details { background: #fff1f2; border: 1px solid #ffe4e6; border-radius: 14px; padding: 16px 18px; margin-bottom: 20px; text-align: left; font-size: 13px; color: #9f1239; }
        .error-title { font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
        .reasons { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 18px; margin-bottom: 24px; text-align: left; font-size: 12.5px; color: #475569; }
        .reasons-title { font-weight: 700; color: #1e293b; margin-bottom: 8px; }
        .reasons ul { padding-left: 18px; }
        .reasons li { margin-bottom: 5px; line-height: 1.4; }
        .btn-group { display: flex; flex-direction: column; gap: 10px; }
        .btn-primary { display: block; width: 100%; background: #dc2626; color: #ffffff; text-decoration: none; padding: 13px 20px; border-radius: 12px; font-weight: 700; font-size: 14px; transition: background 0.2s; }
        .btn-primary:hover { background: #b91c1c; }
        .btn-secondary { display: block; width: 100%; background: #f1f5f9; color: #334155; text-decoration: none; padding: 13px 20px; border-radius: 12px; font-weight: 600; font-size: 14px; transition: background 0.2s; }
        .btn-secondary:hover { background: #e2e8f0; }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-box">
            <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </div>

        <h1>Ödeme Tamamlanamadı</h1>
        <p class="subtitle">Shopier ödeme adımı tamamlanamadı veya bankanız tarafından iptal edildi.</p>

        <div class="error-details">
            <div class="error-title">
                <span>⚠️</span>
                <span>Bildirilen Neden:</span>
            </div>
            <div><?= $errorMessage ?></div>
        </div>

        <div class="reasons">
            <div class="reasons-title">Olası Sebepler:</div>
            <ul>
                <li>Kartınızın internet alışverişine açık olmaması veya limit yetersizliği.</li>
                <li>3D Secure SMS doğrulama kodunun hatalı veya geç girilmiş olması.</li>
                <li>Ödeme ekranında iptal butonuna basılmış olması.</li>
            </ul>
        </div>

        <div class="btn-group">
            <a href="/odeme.php" class="btn-primary">Tekrar Dene</a>
            <a href="/" class="btn-secondary">Panele Geri Dön</a>
        </div>
    </div>
</body>
</html>
