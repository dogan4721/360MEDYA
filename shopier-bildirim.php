<?php
// Shopier OSB Bildirim Dosyası
// Bu dosyayı sitenin ana dizinine yükle: https://www.360medyasmm.com.tr/shopier-bildirim.php

$username = '2d75da04dc41f4d11a54c84c8a3a744e';
$key = '734b98f421e0faf270e668d66d7f96de';

// ========== VERİ KONTROLÜ ==========
if (!(isset($_POST['res']) && isset($_POST['hash']))) {
    die("missing parameter");
}

// ========== ÖZET (HASH) KONTROLÜ ==========
$hash = hash_hmac('sha256', $_POST['res'] . $username, $key, false);
if (strcmp($hash, $_POST['hash']) != 0) {
    die("Hash doğrulaması başarısız");
}

// ========== VERİLERİ AL ==========
$json_result = base64_decode($_POST['res']);
$array_result = json_decode($json_result, true);

$email = $array_result['email'];
$orderid = $array_result['orderid'];
$currency = $array_result['currency']; // 0=TL, 1=USD, 2=EUR
$price = $array_result['price'];
$buyername = $array_result['buyername'];
$buyersurname = $array_result['buyersurname'];
$productcount = $array_result['productcount'];
$productid = $array_result['productid'];
$productlist = $array_result['productlist'];
$customernote = $array_result['customernote'];
$istest = $array_result['istest']; // 0=canlı, 1=test

// ========== FIREBASE BAĞLANTISI ==========
// Firebase PHP SDK kullanman gerekiyor. Alternatif olarak cURL ile Firebase REST API kullanacağız.

function firebaseUpdateBalance($email, $amount) {
    // Firebase Realtime Database REST API URL
    $firebase_url = 'https://smm-panel-f2947-default-rtdb.firebaseio.com/users.json';
    
    // Önce tüm kullanıcıları al
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
        if ($user['email'] === $email) {
            $userKey = $key;
            break;
        }
    }
    
    if ($userKey) {
        $oldBalance = $users[$userKey]['balance'] ?? 0;
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
        
        // Log tut
        $log_url = "https://smm-panel-f2947-default-rtdb.firebaseio.com/shopier_logs/{$orderid}.json";
        $log_data = [
            'orderid' => $orderid,
            'email' => $email,
            'amount' => $amount,
            'status' => 'completed',
            'date' => date('Y-m-d H:i:s')
        ];
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $log_url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "PUT");
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($log_data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_exec($ch);
        curl_close($ch);
        
        return true;
    }
    return false;
}

// ========== BAKİYEYİ GÜNCELLE ==========
$result = firebaseUpdateBalance($email, $price);

// ========== LOG DOSYASINA YAZ (Yedek) ==========
$log_file = 'shopier_log.txt';
$log_message = date('Y-m-d H:i:s') . " - OrderID: {$orderid} - Email: {$email} - Price: {$price} TL - Status: " . ($result ? "SUCCESS" : "FAILED") . PHP_EOL;
file_put_contents($log_file, $log_message, FILE_APPEND);

// ========== BAŞARILI CEVAP DÖNDÜR ==========
echo "success";
?>