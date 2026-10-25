# Föymatik — Kalibrasyon Föy Uygulaması

Telefonda veya bilgisayarda çalışan, Vercel'e yüklenebilir kalibrasyon kayıt ve föy oluşturma uygulaması.

## Özellikler

- 2'li ölçüm föyü, 3'lü ölçüm föyü, lazer termometre föyü, terazi kalibrasyonu
- Sınırsız sayıda cihaz ekleme (baskıda otomatik sayfalara ayrılır)
- Genel bilgiler + her cihaza özel bilgiler
- Giriş sırasında tarayıcı `localStorage` alanına otomatik kayıt
- Kayıtlı taslaklar ve kopyalama
- PNG fotoğraf, Excel (.xlsx), Yazdır/PDF çıktısı
- Telefon ekranlarına uyumlu, web tabanlı arayüz

## Vercel ile yayınlama

1. ZIP dosyasını açın. `kalibrasyon-foy-app` klasörünün **içindeki dosyaları** GitHub'da yeni bir depoya (repository) yükleyin.
2. Vercel > **Add New > Project** > GitHub deponuzu seçin > **Deploy**.
3. Vercel, Vite projesini otomatik tanır. Gerekirse ayarlar:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Vercel bağlantısını telefonda açın. Tarayıcınızın 'Ana ekrana ekle' özelliğini kullanabilirsiniz.

## Bilgisayarda çalıştırma

Node.js 20.19+ veya 22.12+ kurulu olmalıdır.

```bash
npm install
npm run dev
```

## Önemli notlar

- Bu sürüm **verileri Vercel sunucusunda değil, o cihazdaki tarayıcıda** saklar. Bu nedenle başka telefondan girince taslaklar görünmez. Tarayıcı verileri silinirse taslaklar da kaybolabilir. Düzenli Excel yedeği alın.
- Veriler başka bir sunucuya gönderilmez. İleride hesap ve bulut senkronizasyonu eklenebilir.
- PNG: önizlemede her sayfa için ayrı .png dosyası indirilir. Birden çok dosya indirebilmek için tarayıcı izin isteyebilir.
- PDF: **PDF / Yazdır** düğmesiyle yazdırma penceresini açıp 'PDF olarak kaydet' seçin.
- Şablonlar örnek görselleri temel alan ilk sürümdür; orijinal formların milimetrik kopyası değildir. Ölçüm değerleri yazıldığı gibi aktarılır, herhangi bir uygunluk değerlendirmesi veya belirsizlik hesabı yapılmaz.
