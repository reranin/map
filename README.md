# 🗺️ بهینه‌ساز مسیر Neshan

<div align="center">

[![GitHub](https://img.shields.io/github/license/reranin/map)](https://github.com/reranin/map/blob/main/LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![GitHub stars](https://img.shields.io/github/stars/reranin/map)](https://github.com/reranin/map/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/reranin/map)](https://github.com/reranin/map/issues)

یک ابزار قدرتمند و کاربردی برای بهینه‌سازی مسیر با استفاده از **Neshan Maps Platform**

[مشاهده دمو](http://localhost:3000) • [گزارش باگ](https://github.com/reranin/map/issues) • [درخواست ویژگی](https://github.com/reranin/map/issues)

</div>

---

## ✨ ویژگی‌ها

- 🗺️ **نقشه تعاملی Neshan** با SDK رسمی
- 📍 **اضافه کردن لوکیشن‌ها** با نام، کلیک روی نقشه یا GPS
- 📱 **دریافت موقعیت فعلی** کاربر با Geolocation API
- 🚀 **بهینه‌سازی مسیر** با الگوریتم TSP (مسئله فروشنده دوره‌گرد)
- 🛣️ **نمایش مسیر واقعی جاده‌ای** با استفاده از Neshan Direction API
- 🔢 **نمایش شماره توقف‌گاه‌ها** روی نقشه به صورت بصری
- 📊 **نمایش اطلاعات مسیر** شامل مسافت، زمان و تعداد توقف‌ها
- 🎨 **رابط کاربری زیبا** و ریسپانسیو با طراحی مدرن
- 🔧 **API های RESTful** برای geocoding، مسیریابی و بهینه‌سازی
- 🌐 **پشتیبانی کامل از فارسی** (RTL)

---

## 🚀 نصب و راه‌اندازی سریع

### روش خودکار (توصیه می‌شود) ⭐

#### لینوکس/مک:
```bash
git clone https://github.com/reranin/map.git
cd map
./setup.sh
npm start
```

#### ویندوز:
```cmd
git clone https://github.com/reranin/map.git
cd map
setup.bat
npm start
```

### دسترسی به اپلیکیشن

- **اپلیکیشن اصلی**: http://localhost:3000
- **تست ساده**: http://localhost:3000/test-simple

---

## 📖 نحوه استفاده

### 1. اضافه کردن لوکیشن

- **جستجو**: نام لوکیشن را تایپ کنید (مثلاً "میدان آزادی")
- **کلیک**: روی نقشه کلیک کنید
- **GPS**: از دکمه "موقعیت فعلی من" استفاده کنید

### 2. بهینه‌سازی مسیر

1. حداقل 2 لوکیشن اضافه کنید
2. روی "🚀 بهینه‌سازی مسیر" کلیک کنید
3. مسیر بهینه روی نقشه نمایش داده می‌شود

---

## 🛠️ تکنولوژی‌ها

### Backend
- Node.js + Express.js
- Neshan APIs (Direction, Search, Geocoding)

### Frontend
- Neshan Web SDK (Leaflet-based)
- Modern HTML5 + CSS3 + JavaScript

---

## 📡 API Endpoints

### `POST /api/geocode`
جستجوی لوکیشن

### `POST /api/reverse-geocode`
تبدیل مختصات به آدرس

### `POST /api/get-route`
دریافت مسیر واقعی جاده‌ای

### `POST /api/optimize-route`
بهینه‌سازی مسیر با TSP

مستندات کامل API در [INSTALL.md](INSTALL.md)

---

## 📁 ساختار پروژه

```
map/
├── index.html          # صفحه اصلی
├── script.js           # منطق frontend
├── server.js           # سرور Express
├── styles.css          # استایل‌ها
├── config.js           # تنظیمات
├── setup.sh/bat        # اسکریپت‌های نصب
└── README.md           # این فایل
```

---

## 🐛 رفع مشکلات

### نقشه نمایش داده نمی‌شود
- اتصال اینترنت را بررسی کنید
- Console مرورگر را چک کنید (F12)

### پورت 3000 در حال استفاده است
```bash
lsof -ti:3000 | xargs kill -9
```

### مسیر خط مستقیم است
- API Key را بررسی کنید
- خط چین‌دار = حالت Fallback

---

## 🤝 مشارکت

1. Fork کنید
2. Branch جدید بسازید (`git checkout -b feature/amazing`)
3. Commit کنید (`git commit -m 'Add feature'`)
4. Push کنید (`git push origin feature/amazing`)
5. Pull Request باز کنید

---

## 📄 مجوز

MIT License - [LICENSE](LICENSE)

---

## 🙏 تشکر

- [Neshan Maps Platform](https://platform.neshan.org)
- [Leaflet](https://leafletjs.com)
- [OpenStreetMap](https://www.openstreetmap.org)

---

<div align="center">

**اگر این پروژه مفید بود، یک ⭐ بدهید!**

[⬆ بازگشت به بالا](#-بهینه‌ساز-مسیر-neshan)

</div>

