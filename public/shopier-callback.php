<?php
$username='2d75da04dc41f4d11a54c84c8a3a744e';
$key='734b98f421e0faf270e668d66d7f96de';

//Gelmesi gereken veriler kontrol edilir.

if (!( (isset($_POST['res'])) && (isset($_POST['hash'])))) {
    echo "missing parameter";
    die();
}

//Özet kontrolü yapılır.

$hash=hash_hmac('sha256',$_POST['res'].$username,$key,false);
if (strcmp($hash,$_POST['hash'])!=0) {
    die();
}

//Veriler alınır.

$json_result=base64_decode($_POST['res']);
$array_result=json_decode($json_result,true);

//Verilerle ilgili yapmanız gereken işlemleri yapınız.
//Bildirim çeşitli ağ sorunları nedeni ile birden fazla kez gelebilir.
//İlk olarak orderid parametresini kullanıp siparişin işlenme durumunu kontrol ediniz.

$email=$array_result['email'];
$orderid=$array_result['orderid'];
$currency=$array_result['currency']; // 0..TL, 1..USD, 2...EUR
$price=$array_result['price'];
$buyername=$array_result['buyername'];
$buyersurname=$array_result['buyersurname'];
$productcount=$array_result['productcount'];
$productid=$array_result['productid'];
$productlist=$array_result['productlist'];
$chartdetails=$array_result['chartdetails'];
$customernote=$array_result['customernote']; //Müşterinizin siparişte doldurduğu not alanı
$istest=$array_result['istest']; //0..canlı, 1..test

//İşlem başarılı olduğunda success yazılarak OSB’nin başarılı geldiği doğrulanmış olunur.
echo "success";

?>
