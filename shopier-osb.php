<?php
// Shopier OSB Bildirim Dosyası
// Bu dosyayı sitenin ana dizinine yükle: https://www.360medyasmm.com.tr/shopier-osb.php

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
$currency = $array_result['currency'];
$price = $array_result['price'];
$buyername = $array_result['buyername'];
$buyersurname = $array_result['buyersurname'];
$customernote = $array_result['customernote'];
$istest = $array_result['istest'];

// ========== VERİLERİ LOG DOSYASINA YAZ ==========
$log = date('Y-m-d H:i:s') . " - OrderID: {$orderid} - Email: {$email} - Price: {$price} TL - Test: {$istest}" . PHP_EOL;
file_put_contents('shopier_log.txt', $log, FILE_APPEND);

// ========== FIREBASE'DE BAKİYEYİ GÜNCELLE ==========
function firebaseUpdateBalance($email, $amount, $orderid) {
    // Firebase Realtime Database REST API URL
    $firebase_url = 'https://smm-panel-f2947-default-rtdb.firebaseio.com/users.json';
    
    // Tüm kullanıcıları al
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
        
        // Log'a yaz
        $success_log = date('Y-m-d H:i:s') . " - Bakiye güncellendi: {$email} - Eski: {$oldBalance} - Yeni: {$newBalance} - Eklenen: {$amount}" . PHP_EOL;
        file_put_contents('shopier_balance_log.txt', $success_log, FILE_APPEND);
        
        return true;
    } else {
        $error_log = date('Y-m-d H:i:s') . " - Kullanıcı bulunamadı: {$email}" . PHP_EOL;
        file_put_contents('shopier_balance_log.txt', $error_log, FILE_APPEND);
        return false;
    }
}

// ========== BAKİYEYİ GÜNCELLE ==========
firebaseUpdateBalance($email, $price, $orderid);

// ========== İŞLEM BAŞARILI ==========
echo "success";
?>
