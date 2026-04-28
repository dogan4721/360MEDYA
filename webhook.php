<?php
// Shopier Webhook Resmi Örnek Kod
// https://www.360medyasmm.com.tr/webhook.php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // Gelen veriyi al
    $data = file_get_contents('php://input');
    $shopierSignature = $_SERVER['HTTP_SHOPIER_SIGNATURE'] ?? '';
    
    // ⚠️ KENDİ SHOPIER API KEY'İNİ BURAYA YAZ (Shopier'dan alman lazım)
    $key = 'SENIN_API_KEYIN';  // ← BURAYI DOLDUR
    
    // İmza doğrulama
    $hash = hash_hmac('sha256', $data, $key, false);
    if ($hash != $shopierSignature) {
        header("HTTP/1.1 401 Unauthorized");
        file_put_contents('webhook_hata.txt', date('Y-m-d H:i:s') . " - İmza doğrulama başarısız" . PHP_EOL, FILE_APPEND);
        die('invalid request');
    }
    
    $shopierAccountId = $_SERVER['HTTP_SHOPIER_ACCOUNT_ID'] ?? '';
    $shopierEvent = $_SERVER['HTTP_SHOPIER_EVENT'] ?? '';
    $arrayData = json_decode($data, true);
    
    // Log'a yaz
    file_put_contents('webhook_log.txt', date('Y-m-d H:i:s') . " - Event: {$shopierEvent} - Data: " . $data . PHP_EOL, FILE_APPEND);
    
    // Sipariş oluşturulduğunda
    if ($shopierEvent === 'order.created') {
        
        $orderId = $arrayData['id'] ?? '';
        $orderStatus = $arrayData['status'] ?? '';
        $firstName = $arrayData['shippingInfo']['firstName'] ?? '';
        $lastName = $arrayData['shippingInfo']['lastName'] ?? '';
        $email = $arrayData['buyerInfo']['email'] ?? '';
        $amount = $arrayData['price'] ?? 0;
        
        // Sadece başarılı ödemelerde bakiye ekle
        if ($orderStatus === 'success' || $orderStatus === 'approved') {
            
            // ========== FIREBASE'DE BAKİYEYİ GÜNCELLE ==========
            $firebase_url = 'https://smm-panel-f2947-default-rtdb.firebaseio.com/users.json';
            
            // Kullanıcıları al
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
                
                file_put_contents('webhook_log.txt', date('Y-m-d H:i:s') . " - BAKIYE EKLENDI: {$email} +{$amount} TL (Yeni: {$newBalance})" . PHP_EOL, FILE_APPEND);
            } else {
                file_put_contents('webhook_log.txt', date('Y-m-d H:i:s') . " - KULLANICI BULUNAMADI: {$email}" . PHP_EOL, FILE_APPEND);
            }
        }
        
        header("HTTP/1.1 200 OK");
        echo 'success';
    } else {
        header("HTTP/1.1 200 OK");
        echo 'OK';
    }
} else {
    header("HTTP/1.1 405 Method Not Allowed");
    echo 'Only POST requests are allowed';
}
?>
