<?php
// Shopier Webhook Resmi Örnek Kod
// https://www.360medyasmm.com.tr/webhook.php

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // Gelen veriyi al
    $data = file_get_contents('php://input');
    $shopierSignature = $_SERVER['HTTP_SHOPIER_SIGNATURE'] ?? '';
    
    // ⚠️ KENDİ SHOPIER API KEY'İNİ BURAYA YAZ (Shopier'dan alman lazım)
    $key = eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJhNzhjYjQyZWIxODNiZjc2ODY1ODExYWUwMzE4YmViNiIsImp0aSI6Ijg5NmQyZGEwNDczZjBlMjE0M2U1MTE1Nzc4YjA0MDdhODdjMmU1Y2YzNTYwOGU1MTdmMjdiMzk4YzFjZjk4Y2U1Njk5NWZmYWFjMjBmYTJkODRlYzYzOTg0NDhhNWFmM2Q5N2E4MzU1YTZlMTU3OWY4ZTAwOWVhMjcxNThhYzg3MjMxNTg5MDMwNmNmNjBjMTE4ZDZlMDM2ZDAzMWM5ZjAiLCJpYXQiOjE3Nzc1Mjc0NDEsIm5iZiI6MTc3NzUyNzQ0MSwiZXhwIjoxOTM1MzEyMjAxLCJzdWIiOjEwNTgyMiwic2NvcGVzIjpbIm9yZGVyczpyZWFkIiwib3JkZXJzOndyaXRlIiwicHJvZHVjdHM6cmVhZCIsInByb2R1Y3RzOndyaXRlIiwic2hpcHBpbmdzOnJlYWQiLCJzaGlwcGluZ3M6d3JpdGUiLCJkaXNjb3VudHM6cmVhZCIsImRpc2NvdW50czp3cml0ZSIsInBheW91dHM6cmVhZCIsInJlZnVuZHM6cmVhZCIsInJlZnVuZHM6d3JpdGUiLCJzaG9wOnJlYWQiLCJzaG9wOndyaXRlIl19.lOUDlFNonmEja5kTpcVmrkLlud2JfjTTrhIXSEZA1BBlZPIWLagF23uIiqwjyxeCIqTDHsxuFWYIoH5vsHeCmL6Jf70VD1iDg0NYjqVoT6ig6F-uwpy3P2wemLP3ZvdMIi3o2gfaxHhkDYElc2y_IIpr75iMTyMDbczigt5V2OUR4c9c7x2tJXROu9MmtDvfK0zhhVjSWNlEPQzFJyZ8tGZuecPW-9j-fZ__0M-rYZdj9ns5EiF4Lz1IL-5mxszdFRzhk42XDO2M69KY-zoF3b3qslp0NyvhJi8xP7BWMF86hSIU-_rvxjZzxSPmliraLo6wPKlKrAINn5cdUjjSHQ';  // ← BURAYI DOLDUR
    
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
