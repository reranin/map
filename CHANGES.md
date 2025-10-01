# 📝 تغییرات انجام شده در پروژه

## 🆕 آخرین تغییرات (رفع مشکل رسم مسیر)

### 🛣️ استفاده از Neshan Direction API برای نمایش مسیر واقعی

**مشکل قبلی:** مسیر به صورت خطوط مستقیم بین نقاط رسم می‌شد.

**راه‌حل:** پیاده‌سازی Direction API نشان برای دریافت مسیر واقعی جاده‌ای.

#### تغییرات Frontend:
- تابع `drawRoute()` به `async` تبدیل شد
- برای هر دو نقطه متوالی، مسیر واقعی از سرور درخواست می‌شود
- polyline واقعی جاده‌ای روی نقشه رسم می‌شود
- در صورت خطا، خط مستقیم چین‌دار به عنوان fallback رسم می‌شود

#### تغییرات Backend:
- ✅ **API جدید `/api/get-route`**: دریافت مسیر بین دو نقطه
- ✅ **تابع `decodePolyline()`**: decode کردن polyline از فرمت Google
- ✅ **استفاده از Neshan Direction API**: `https://api.neshan.org/v1/direction`

#### نمایش بهتر مارکرها:
- مارکرها با شماره‌های دایره‌ای رنگی نمایش داده می‌شوند
- ترتیب توقف‌گاه‌ها به صورت واضح مشخص است
- popup اطلاعاتی برای هر مارکر

## ✅ تغییرات اصلی

### 1. به‌روزرسانی Neshan Web SDK به نسخه رسمی

**قبل:**
```html
<!-- استفاده از چندین منبع مختلف و fallback -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<!-- + تلاش برای لود از منابع مختلف -->
```

**بعد:**
```html
<!-- استفاده از SDK رسمی نشان -->
<link rel="stylesheet" href="https://static.neshan.org/sdk/leaflet/v1.9.4/neshan-sdk/v1.0.8/index.css"/>
<script src="https://static.neshan.org/sdk/leaflet/v1.9.4/neshan-sdk/v1.0.8/index.js"></script>
```

### 2. ساده‌سازی کد ایجاد نقشه

**قبل:**
```javascript
// تلاش برای Neshan و fallback به OpenStreetMap
try {
  map = new L.Map("map", {
    key: NESHAN_API_KEY,
    maptype: "neshan",
    ...
  });
} catch (neshanError) {
  // Fallback to OpenStreetMap
  map = L.map("map").setView([35.7219, 51.3347], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", ...).addTo(map);
}
```

**بعد:**
```javascript
// مستقیماً از SDK رسمی نشان استفاده می‌کند
map = new L.Map("map", {
  key: NESHAN_API_KEY,
  maptype: "neshan",
  poi: true,
  traffic: false,
  center: [35.699756, 51.338076],
  zoom: 14,
});
```

### 3. فایل‌های جدید اضافه شده

- ✅ `test-simple.html` - صفحه تست ساده SDK نشان
- ✅ `setup.sh` - اسکریپت راه‌اندازی خودکار برای لینوکس/مک
- ✅ `setup.bat` - اسکریپت راه‌اندازی خودکار برای ویندوز
- ✅ `INSTALL.md` - راهنمای نصب کامل
- ✅ `CHANGES.md` - این فایل

### 4. بهبود مستندات

- ✅ به‌روزرسانی `readme.md` با دستورالعمل‌های جدید
- ✅ اضافه کردن بخش تست نقشه نشان
- ✅ اضافه کردن راهنمای نصب خودکار

## 🎯 ویژگی‌های جدید

### صفحه تست ساده (`/test-simple`)

این صفحه شامل:
- نمایش نقشه نشان
- امکان تغییر استایل‌های مختلف نقشه (Dreamy, Dreamy Gold, Neshan, Standard Day, Standard Night, OSM Bright)
- افزودن مارکر با کلیک روی نقشه
- رابط کاربری ساده و تمیز

## 🔧 تنظیمات

### فایل .env

فایل `.env` به صورت خودکار توسط اسکریپت‌های setup ساخته می‌شود و شامل:

```env
NESHAN_API_KEY=web.89a6be71092e4dc1925b0f47e926e894
PORT=3000
NESHAN_BASE_URL=https://api.neshan.org/v1
```

## 📚 مستندات مرجع

- [مستندات رسمی Neshan Web SDK](https://platform.neshan.org/sdk/web-sdk-getting-started/)
- [API های نشان](https://platform.neshan.org)

## 🚀 نحوه استفاده

### راه‌اندازی سریع

```bash
# لینوکس/مک
./setup.sh

# ویندوز
setup.bat
```

### اجرای پروژه

```bash
npm run dev    # حالت development
npm start      # حالت production
```

### آدرس‌های مهم

- اپلیکیشن اصلی: http://localhost:3000
- تست ساده: http://localhost:3000/test-simple
- تست کامل: http://localhost:3000/test-neshan

## ✨ بهبودها نسبت به نسخه قبل

1. **پایداری بیشتر**: استفاده از SDK رسمی نشان به جای fallback
2. **کد تمیزتر**: حذف کدهای زائد و fallback
3. **نصب آسان‌تر**: اسکریپت‌های راه‌اندازی خودکار
4. **مستندات بهتر**: راهنماهای کامل نصب و استفاده
5. **تست آسان‌تر**: صفحه تست ساده برای بررسی SDK

## 🔄 سازگاری با نسخه قبل

همه قابلیت‌های نسخه قبل حفظ شده‌اند:
- ✅ اضافه کردن لوکیشن
- ✅ بهینه‌سازی مسیر با TSP
- ✅ Geocoding و Reverse Geocoding
- ✅ دریافت موقعیت فعلی کاربر
- ✅ رابط کاربری فارسی

