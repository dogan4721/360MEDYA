import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  MessageCircle, 
  CheckCircle, 
  AlertTriangle, 
  Zap, 
  Code,
  ShieldCheck,
  Headphones
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    category: 'Kampanyalar & İndirimler',
    question: '%10 Hediye İndirim Kampanyası nasıl çalışır?',
    answer:
      '360 Medya üzerinde sunulan tüm sosyal medya servislerimizde %10 indirim otomatik olarak geçerlidir. Kupon kodu girmenize gerek kalmadan, sipariş formunda ve servis listesinde fiyatlar doğrudan %10 indirimli olarak hesaplanır ve bakiyenizden indirimli tutar düşülür.',
  },
  {
    category: 'Sipariş İşlemleri',
    question: 'Sipariş verildikten sonra işlem ne zaman başlar?',
    answer:
      '360 Medya altyapımız tamamen otomatiktir. Siparişinizi oluşturduğunuz anda servis sağlayıcı kuyruğuna iletilir ve servis yoğunluğuna bağlı olarak genellikle 0 ile 15 dakika içerisinde otomatik olarak gönderim başlar.',
  },
  {
    category: 'Sipariş İşlemleri',
    question: 'Link (bağlantı) girerken nelere dikkat etmeliyim?',
    answer:
      'Takipçi servislerinde mutlaka kullanıcı profili bağlantısı (örn: https://instagram.com/kullanici_adi), beğeni ve izlenme servislerinde ise doğrudan ilgili gönderi/video linki verilmelidir. En önemli kural: Sipariş tamamlanana kadar hesabınız "Herkese Açık" (Public) olmalı ve kullanıcı adınızı değiştirmemelisiniz.',
  },
  {
    category: 'Telafi ve Garanti',
    question: 'Telafi (Refill) garantisi nedir ve nasıl çalışır?',
    answer:
      'Yanında ♻️ simgesi veya "Garantili" ibaresi bulunan servislerde, sosyal medya algoritma güncellemeleri nedeniyle düşüş yaşanması durumunda ücretsiz telafi sağlanır. "Siparişlerim" sekmesinden ilgili siparişin yanındaki "Telafi" butonuna tıklayarak anında telafi talebi başlatabilirsiniz.',
  },
  {
    category: 'İptal ve İade',
    question: 'Siparişi iptal edebilir miyim?',
    answer:
      'İptal desteği olan servislerde (❌ simgeli), sipariş henüz işleme alınmadıysa "Siparişlerim" veya "Durum Sorgula" ekranından iptal talebi gönderebilirsiniz. İptal edilen siparişlerin ücreti anında bakiyenize iade edilir.',
  },
  {
    category: 'Güvenlik & Ödeme',
    question: 'Ödeme ve bakiye yükleme işlemleri nasıl çalışır?',
    answer:
      'Kişisel paneliniz üzerinden güvenli Shopier 3D Secure altyapısı ile kredi veya banka kartınızla anında bakiye yükleyebilirsiniz. Yüklenen bakiye anında hesabınıza tanımlanır ve dilediğiniz zaman sipariş oluşturabilirsiniz.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-5 mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <HelpCircle className="w-7 h-7 text-blue-600" />
          Sıkça Sorulan Sorular & Kullanım Rehberi
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          360 Medya sosyal medya siparişleri, %10 hediye indirim kampanyası, telafi kuralları ve sistem işleyişi hakkında merak ettiğiniz tüm detaylar.
        </p>
      </div>

      {/* 3 Value Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Hızlı İşlem</h3>
          <p className="text-xs text-slate-500 mt-1">
            Siparişleriniz oluşturulduğu andan itibaren otomatik olarak sıraya alınır ve anında işleme başlanır.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">%100 Güvenli & Şifresiz</h3>
          <p className="text-xs text-slate-500 mt-1">
            Hesabınızın şifresi asla talep edilmez. Sadece profil veya gönderi linki ile işlem yapılır.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
            <Headphones className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">Telafi Garantisi</h3>
          <p className="text-xs text-slate-500 mt-1">
            Garantili servislerde olası düşüşlerde tek tıkla telafi başlatabilir ve bakiyenizi koruyabilirsiniz.
          </p>
        </div>
      </div>

      {/* Accordion FAQs */}
      <div className="space-y-3 mb-8">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 font-semibold text-slate-900 hover:text-blue-600 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    {faq.category}
                  </span>
                  <span className="text-sm sm:text-base">{faq.question}</span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support / Contact Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="text-lg font-bold flex items-center justify-center sm:justify-start gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            Canlı Destek ve Sorularınız İçin
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md">
            Siparişlerinizle ilgili özel bir durum veya özel toplu servis talepleriniz için WhatsApp destek ekibimizle anında iletişime geçebilirsiniz.
          </p>
        </div>

        <a
          href="https://wa.me/905539327514?text=Merhaba,%20hizmetler%20hakkinda%20bilgi%20almak%20istiyorum."
          target="_blank"
          rel="noreferrer"
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition flex items-center gap-2 whitespace-nowrap text-sm"
        >
          <MessageCircle className="w-4 h-4 fill-current" />
          <span>WhatsApp Destek (+90 553 932 75 14)</span>
        </a>
      </div>

    </div>
  );
};
