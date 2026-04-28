<?php
// Shopier Webhook Dinleyicisi
// https://www.360medyasmm.com.tr/webhook.php

$username = '2d75da04dc41f4d11a54c84c8a3a744e';
$key = '734b98f421e0faf270e668d66d7f96de';

// ========== GELEN VERİYİ AL ==========
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// ========== VERİLERİ LOGLA ==========
file_put_contents('webhook_log.txt', date('Y-m-d H:i:s') . " - Gelen veri: " . $input . PHP_EOL, FILE_APPEND);

// ========== ÖDEME DURUMU KONTROLÜ ==========
if (isset($data['status']) && $data['status'] === 'success') {
    
    $orderId = $data['order_id'];
    $amount = $data['product_price'];
    $email = $data['buyer_email'];
    $buyerName = $data['buyer_name'];
    
    // ========== FIREBASE'DE BAKİYEYİ GÜNCELLE ==========
    $firebase_url = 'https://smm-panel-f2947-default-rtdb.firebaseio.com/users.json';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $firebase_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);
    
    $users = json_decode($response, true);
    
    // Kullanıcıyı bul
    $userKey = null;
    foreach ($users as $key => $user) {
        if (isset($user['email']) && $user['email'] === $email) {
            $userKey = $key;
            break;
        }
    }
    
    if ($userKey) {
        $oldBalance = isset($users[$userKey]['balance']) ? $users[$userKey]['balance'] : 0;
        $newBalance = $oldBalance + $amount;
        
        // Bakiyeyi güncelle
        $update_url = "https://smm-panel-f2947-default-rtdb.firebaseio.com/users/{$userKey}/balance.json";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $update_url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($newBalance));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_exec($ch);
        curl_close($ch);
        
        file_put_contents('webhook_log.txt', date('Y-m-d H:i:s') . " - Bakiye güncellendi: {$email} +{$amount} TL (Yeni: {$newBalance})" . PHP_EOL, FILE_APPEND);
    } else {
        file_put_contents('webhook_log.txt', date('Y-m-d H:i:s') . " - Kullanıcı bulunamadı: {$email}" . PHP_EOL, FILE_APPEND);
    }
    
    http_response_code(200);
    echo 'OK';
} else {
    file_put_contents('webhook_log.txt', date('Y-m-d H:i:s') . " - Ödeme başarısız veya eksik veri" . PHP_EOL, FILE_APPEND);
    http_response_code(400);
    echo 'Bad Request';
}
?>
